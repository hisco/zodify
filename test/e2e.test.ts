import 'reflect-metadata';
import { z } from 'zod';
import { zodToClass } from '../src';
import { plainToInstance, instanceToPlain } from 'class-transformer';
import { validate, validateSync } from 'class-validator';

describe('End-to-End Tests', () => {
  describe('Complex Real-World Schema', () => {
    const AddressSchema = z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().length(2),
      zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
      country: z.string().default('USA'),
    });

    const UserSchema = z.object({
      // Identity
      id: z.string().uuid(),
      username: z.string().min(3).max(20),
      email: z.string().email(),

      // Profile
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      age: z.number().int().min(18).max(120),
      bio: z.string().max(500).optional(),

      // Contact
      phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
      website: z.string().url().optional(),

      // Address
      address: AddressSchema,

      // Preferences
      role: z.enum(['admin', 'moderator', 'user']),
      isActive: z.boolean(),
      emailVerified: z.boolean().default(false),

      // Arrays
      tags: z.array(z.string()),
      permissions: z.array(z.string()).optional(),

      // Dates
      createdAt: z.date(),
      updatedAt: z.date().optional(),
    });

    it('should generate working class from complex schema', () => {
      const UserClass = zodToClass(UserSchema, { className: 'User' });

      expect(UserClass).toBeDefined();
      expect(UserClass.name).toBe('User');
    });

    it('should validate valid user data', async () => {
      const UserClass = zodToClass(UserSchema, { className: 'User' });

      const validUserData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        bio: 'Software developer',
        phoneNumber: '+12025550123',
        website: 'https://johndoe.com',
        address: {
          street: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02101',
          country: 'USA',
        },
        role: 'user',
        isActive: true,
        emailVerified: true,
        tags: ['developer', 'typescript'],
        permissions: ['read', 'write'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      const user = plainToInstance(UserClass, validUserData) as any;
      const errors = await validate(user);

      if (errors.length > 0) {
        console.log('Validation errors:', errors);
      }

      expect(errors).toHaveLength(0);
      expect(user.email).toBe('john@example.com');
      expect(user.age).toBe(30);
    });

    it('should catch validation errors', async () => {
      const UserClass = zodToClass(UserSchema, { className: 'User' });

      const invalidUserData = {
        id: 'not-a-uuid',
        username: 'ab', // too short
        email: 'invalid-email',
        firstName: '',
        lastName: 'Doe',
        age: 15, // too young
        website: 'not-a-url',
        address: {
          street: '123 Main St',
          city: 'Boston',
          state: 'MASS', // should be 2 chars
          zipCode: 'invalid',
          country: 'USA',
        },
        role: 'superadmin', // invalid enum
        isActive: true,
        emailVerified: false,
        tags: ['tag1'],
        createdAt: new Date(),
      };

      const user = plainToInstance(UserClass, invalidUserData) as any;
      const errors = await validate(user);

      // Should have multiple validation errors
      expect(errors.length).toBeGreaterThan(0);

      // Check specific errors
      const errorProperties = errors.map(e => e.property);
      expect(errorProperties).toContain('id');
      expect(errorProperties).toContain('email');
      expect(errorProperties).toContain('age');
    });

    it('should transform nested objects correctly', async () => {
      const UserClass = zodToClass(UserSchema, { className: 'User' });

      const plainData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        address: {
          street: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02101',
          country: 'USA',
        },
        role: 'user',
        isActive: true,
        emailVerified: true,
        tags: ['developer'],
        createdAt: new Date('2024-01-01'),
      };

      const user = plainToInstance(UserClass, plainData) as any;

      // Test nested object transformation
      expect(user.address).toBeDefined();
      expect(user.address.city).toBe('Boston');
      expect(user.address.state).toBe('MA');

      // Test back to plain
      const backToPlain = instanceToPlain(user);
      expect(backToPlain).toEqual(expect.objectContaining({
        email: 'john@example.com',
        address: expect.objectContaining({
          city: 'Boston',
        }),
      }));
    });
  });

  describe('Discriminated Union E2E', () => {
    const PaymentSchema = z.object({
      id: z.string().uuid(),
      amount: z.number().min(0),
      currency: z.string().length(3),
      method: z.discriminatedUnion('type', [
        z.object({
          type: z.literal('credit_card'),
          cardNumber: z.string().regex(/^\d{16}$/),
          expiryMonth: z.number().int().min(1).max(12),
          expiryYear: z.number().int().min(2024),
          cvv: z.string().regex(/^\d{3,4}$/),
        }),
        z.object({
          type: z.literal('paypal'),
          email: z.string().email(),
          paypalId: z.string(),
        }),
        z.object({
          type: z.literal('bank_transfer'),
          accountNumber: z.string(),
          routingNumber: z.string().regex(/^\d{9}$/),
          bankName: z.string(),
        }),
      ]),
    });

    it('should handle discriminated union validation', async () => {
      const PaymentClass = zodToClass(PaymentSchema, { className: 'Payment' });

      // Valid credit card payment
      const creditCardPayment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 99.99,
        currency: 'USD',
        method: {
          type: 'credit_card',
          cardNumber: '1234567890123456',
          expiryMonth: 12,
          expiryYear: 2025,
          cvv: '123',
        },
      };

      const payment1 = plainToInstance(PaymentClass, creditCardPayment) as any;
      const errors1 = await validate(payment1);
      expect(errors1).toHaveLength(0);

      // Valid PayPal payment
      const paypalPayment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 49.99,
        currency: 'USD',
        method: {
          type: 'paypal',
          email: 'user@example.com',
          paypalId: 'PAYPAL123',
        },
      };

      const payment2 = plainToInstance(PaymentClass, paypalPayment) as any;
      const errors2 = await validate(payment2);
      expect(errors2).toHaveLength(0);

      expect(payment1.method.type).toBe('credit_card');
      expect(payment2.method.type).toBe('paypal');
    });
  });

  describe('Code Generation E2E', () => {
    it('should generate valid TypeScript code', () => {
      const UserSchema = z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        age: z.number().int().min(18).max(100),
        tags: z.array(z.string()),
        metadata: z.record(z.string()).optional(),
      });

      const code = zodToClass.toCode(UserSchema, {
        className: 'User',
        includeImports: true,
        exportClass: true,
      });

      // Should include imports
      expect(code).toContain("from 'class-validator'");
      expect(code).toContain("from 'class-transformer'");

      // Should have export
      expect(code).toContain('export class User');

      // Should have decorators
      expect(code).toContain('@IsUUID()');
      expect(code).toContain('@IsEmail()');
      expect(code).toContain('@IsInt()');
      expect(code).toContain('@Min(18)');
      expect(code).toContain('@Max(100)');
      expect(code).toContain('@IsArray()');
      expect(code).toContain('@Expose()');

      // Should have properties
      expect(code).toContain('id: string');
      expect(code).toContain('email: string');
      expect(code).toContain('age: number');
      expect(code).toContain('tags: string[]');
      expect(code).toContain('metadata?: Record<string, any>');
    });

    it('should generate code without imports when requested', () => {
      const SimpleSchema = z.object({
        name: z.string(),
      });

      const code = zodToClass.toCode(SimpleSchema, {
        className: 'Simple',
        includeImports: false,
      });

      expect(code).not.toContain('import');
      expect(code).toContain('class Simple');
    });
  });

  describe('Array Handling E2E', () => {
    it('should handle arrays of objects with validation', async () => {
      const TodoSchema = z.object({
        userId: z.string().uuid(),
        todos: z.array(z.object({
          id: z.number().int(),
          title: z.string().min(1).max(100),
          completed: z.boolean(),
          priority: z.number().int().min(1).max(5),
        })),
      });

      const TodoClass = zodToClass(TodoSchema, { className: 'TodoList' });

      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        todos: [
          { id: 1, title: 'Buy groceries', completed: false, priority: 3 },
          { id: 2, title: 'Write tests', completed: true, priority: 5 },
        ],
      };

      const todoList = plainToInstance(TodoClass, validData) as any;
      const errors = await validate(todoList);

      expect(errors).toHaveLength(0);
      expect(todoList.todos).toHaveLength(2);
      expect(todoList.todos[0].title).toBe('Buy groceries');
    });
  });

  describe('Edge Cases', () => {
    it('should handle optional nested objects', async () => {
      const Schema = z.object({
        name: z.string(),
        settings: z.object({
          theme: z.string(),
          notifications: z.boolean(),
        }).optional(),
      });

      const Class = zodToClass(Schema, { className: 'Config' });

      // With settings
      const data1 = {
        name: 'App',
        settings: { theme: 'dark', notifications: true },
      };
      const instance1 = plainToInstance(Class, data1) as any;
      const errors1 = await validate(instance1);
      expect(errors1).toHaveLength(0);

      // Without settings
      const data2 = { name: 'App' };
      const instance2 = plainToInstance(Class, data2) as any;
      const errors2 = await validate(instance2);
      expect(errors2).toHaveLength(0);
    });

    it('should handle nullable properties', async () => {
      const Schema = z.object({
        name: z.string(),
        description: z.string().nullable(),
      });

      const Class = zodToClass(Schema, { className: 'Item' });

      const data = {
        name: 'Test',
        description: null,
      };

      const instance = plainToInstance(Class, data) as any;
      const errors = await validate(instance);
      expect(errors).toHaveLength(0);
      expect(instance.description).toBeNull();
    });

    it('should handle empty arrays', async () => {
      const Schema = z.object({
        items: z.array(z.string()),
      });

      const Class = zodToClass(Schema, { className: 'List' });

      const data = { items: [] };
      const instance = plainToInstance(Class, data) as any;
      const errors = await validate(instance);

      expect(errors).toHaveLength(0);
      expect(instance.items).toEqual([]);
    });
  });
});
