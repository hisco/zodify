import 'reflect-metadata';
import { z } from 'zod';
import { zodToClass } from '../src';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('Basic Schemas', () => {
  describe('Primitive Types', () => {
    it('should generate class for string property', () => {
      const schema = z.object({
        name: z.string(),
      });

      const UserClass = zodToClass(schema, { className: 'User' });
      expect(UserClass).toBeDefined();
      expect(UserClass.name).toBe('User');
    });

    it('should generate class for number property', () => {
      const schema = z.object({
        age: z.number(),
      });

      const UserClass = zodToClass(schema, { className: 'User' });
      expect(UserClass).toBeDefined();
    });

    it('should generate class for boolean property', () => {
      const schema = z.object({
        active: z.boolean(),
      });

      const UserClass = zodToClass(schema, { className: 'User' });
      expect(UserClass).toBeDefined();
    });

    it('should generate class for date property', () => {
      const schema = z.object({
        createdAt: z.date(),
      });

      const UserClass = zodToClass(schema, { className: 'User' });
      expect(UserClass).toBeDefined();
    });
  });

  describe('Optional and Nullable', () => {
    it('should handle optional properties', () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });

      const UserClass = zodToClass(schema, { className: 'User' });
      const user = new UserClass({ name: 'John' });
      expect(user.name).toBe('John');
      expect(user.nickname).toBeUndefined();
    });

    it('should handle nullable properties', () => {
      const schema = z.object({
        name: z.string(),
        middleName: z.string().nullable(),
      });

      const UserClass = zodToClass(schema, { className: 'User' });
      const user = new UserClass({ name: 'John', middleName: null });
      expect(user.name).toBe('John');
      expect(user.middleName).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should validate string with email validator', async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const UserClass = zodToClass(schema, { className: 'User' });

      // Valid email
      const validUser = plainToInstance(UserClass, { email: 'test@example.com' }) as any;
      const validErrors = await validate(validUser);
      expect(validErrors).toHaveLength(0);

      // Invalid email
      const invalidUser = plainToInstance(UserClass, { email: 'invalid-email' }) as any;
      const invalidErrors = await validate(invalidUser);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate string with uuid validator', async () => {
      const schema = z.object({
        id: z.string().uuid(),
      });

      const UserClass = zodToClass(schema, { className: 'User' });

      // Valid UUID
      const validUser = plainToInstance(UserClass, {
        id: '123e4567-e89b-12d3-a456-426614174000',
      }) as any;
      const validErrors = await validate(validUser);
      expect(validErrors).toHaveLength(0);

      // Invalid UUID
      const invalidUser = plainToInstance(UserClass, { id: 'not-a-uuid' }) as any;
      const invalidErrors = await validate(invalidUser);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate number with min/max validators', async () => {
      const schema = z.object({
        age: z.number().int().min(0).max(120),
      });

      const UserClass = zodToClass(schema, { className: 'User' });

      // Valid age
      const validUser = plainToInstance(UserClass, { age: 25 }) as any;
      const validErrors = await validate(validUser);
      expect(validErrors).toHaveLength(0);

      // Invalid age (too high)
      const invalidUser = plainToInstance(UserClass, { age: 150 }) as any;
      const invalidErrors = await validate(invalidUser);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate string with min/max length', async () => {
      const schema = z.object({
        username: z.string().min(3).max(20),
      });

      const UserClass = zodToClass(schema, { className: 'User' });

      // Valid username
      const validUser = plainToInstance(UserClass, { username: 'john_doe' }) as any;
      const validErrors = await validate(validUser);
      expect(validErrors).toHaveLength(0);

      // Invalid username (too short)
      const invalidUser = plainToInstance(UserClass, { username: 'ab' }) as any;
      const invalidErrors = await validate(invalidUser);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Properties', () => {
    it('should generate class with multiple properties and validators', async () => {
      const schema = z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        age: z.number().int().min(0).max(120),
        name: z.string().min(1),
        active: z.boolean(),
      });

      const UserClass = zodToClass(schema, { className: 'User' });

      // Valid object
      const validUser = plainToInstance(UserClass, {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        age: 25,
        name: 'John Doe',
        active: true,
      }) as any;

      const validErrors = await validate(validUser);
      expect(validErrors).toHaveLength(0);
    });
  });
});
