import 'reflect-metadata';
import { z } from 'zod';
import {
  IsString,
  IsNumber,
  IsInt,
  IsBoolean,
  IsDate,
  IsEmail,
  IsUUID,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { zodToClass, classToZod } from '../src';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('Round-trip E2E Tests', () => {
  describe('Zod → Class → Zod', () => {
    it('should preserve basic types and validators', () => {
      // Original Zod schema
      const originalSchema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number().int().min(18).max(100),
        active: z.boolean(),
      });

      // Convert to class
      const GeneratedClass = zodToClass(originalSchema, { className: 'User' });

      // Convert back to Zod
      const regeneratedSchema = classToZod(GeneratedClass);

      // Test data
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        active: true,
      };

      const invalidData1 = {
        name: 'John Doe',
        email: 'invalid-email',
        age: 25,
        active: true,
      };

      const invalidData2 = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 150,
        active: true,
      };

      // Both schemas should validate the same data the same way
      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      expect(() => originalSchema.parse(invalidData1)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData1)).toThrow();

      expect(() => originalSchema.parse(invalidData2)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData2)).toThrow();
    });

    it('should preserve optional properties', () => {
      const originalSchema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
        bio: z.string().optional(),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'User' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData1 = { name: 'John' };
      const validData2 = { name: 'John', nickname: 'Johnny' };
      const validData3 = { name: 'John', nickname: 'Johnny', bio: 'Developer' };

      expect(() => originalSchema.parse(validData1)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData1)).not.toThrow();

      expect(() => originalSchema.parse(validData2)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData2)).not.toThrow();

      expect(() => originalSchema.parse(validData3)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData3)).not.toThrow();
    });

    it('should preserve nested objects', () => {
      const originalSchema = z.object({
        name: z.string(),
        address: z.object({
          street: z.string(),
          city: z.string(),
          zipCode: z.string().min(5).max(10),
        }),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'User' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = {
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'New York',
          zipCode: '12345',
        },
      };

      const invalidData = {
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'New York',
          zipCode: '123', // Too short
        },
      };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should preserve arrays of primitives', () => {
      const originalSchema = z.object({
        name: z.string(),
        tags: z.array(z.string()),
        scores: z.array(z.number()),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'User' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = {
        name: 'John',
        tags: ['developer', 'javascript'],
        scores: [85, 90, 95],
      };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      const parsed1 = originalSchema.parse(validData);
      const parsed2 = regeneratedSchema.parse(validData);

      expect(parsed1).toEqual(parsed2);
    });

    it('should preserve arrays of objects', () => {
      const originalSchema = z.object({
        name: z.string(),
        posts: z.array(
          z.object({
            title: z.string(),
            content: z.string(),
          })
        ),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'User' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = {
        name: 'John',
        posts: [
          { title: 'First Post', content: 'Hello World' },
          { title: 'Second Post', content: 'Another post' },
        ],
      };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      const parsed1 = originalSchema.parse(validData);
      const parsed2 = regeneratedSchema.parse(validData);

      expect(parsed1).toEqual(parsed2);
    });

    it('should preserve enums', () => {
      const originalSchema = z.object({
        name: z.string(),
        role: z.enum(['admin', 'user', 'guest']),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'User' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = { name: 'John', role: 'admin' as const };
      const invalidData = { name: 'John', role: 'invalid' };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should preserve string validators', () => {
      const originalSchema = z.object({
        email: z.string().email(),
        uuid: z.string().uuid(),
        username: z.string().min(3).max(20),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'User' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = {
        email: 'test@example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
      };

      const invalidData = {
        email: 'invalid',
        uuid: 'not-a-uuid',
        username: 'ab',
      };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should preserve number validators', () => {
      const originalSchema = z.object({
        age: z.number().int().min(18).max(100),
        price: z.number().positive(),
        count: z.number().multipleOf(5),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'Product' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = {
        age: 25,
        price: 19.99,
        count: 10,
      };

      const invalidData1 = {
        age: 150,
        price: 19.99,
        count: 10,
      };

      const invalidData2 = {
        age: 25,
        price: -5,
        count: 10,
      };

      const invalidData3 = {
        age: 25,
        price: 19.99,
        count: 7,
      };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      expect(() => originalSchema.parse(invalidData1)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData1)).toThrow();

      expect(() => originalSchema.parse(invalidData2)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData2)).toThrow();

      expect(() => originalSchema.parse(invalidData3)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData3)).toThrow();
    });
  });

  describe('Class → Zod → Class', () => {
    it('should preserve basic types and validators', async () => {
      // Original class
      class OriginalUser {
        @IsString()
        @Expose()
        name!: string;

        @IsString()
        @IsEmail()
        @Expose()
        email!: string;

        @IsInt()
        @Min(18)
        @Max(100)
        @Expose()
        age!: number;

        @IsBoolean()
        @Expose()
        active!: boolean;
      }

      // Convert to Zod
      const zodSchema = classToZod(OriginalUser);

      // Convert back to class
      const RegeneratedClass = zodToClass(zodSchema, { className: 'RegeneratedUser' });

      // Test data
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        active: true,
      };

      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        age: 25,
        active: true,
      };

      // Both classes should validate the same way
      const original1 = plainToInstance(OriginalUser, validData);
      const errors1 = await validate(original1);
      expect(errors1).toHaveLength(0);

      const regenerated1 = plainToInstance(RegeneratedClass as any, validData) as any;
      const errors2 = await validate(regenerated1);
      expect(errors2).toHaveLength(0);

      const original2 = plainToInstance(OriginalUser, invalidData);
      const errors3 = await validate(original2);
      expect(errors3.length).toBeGreaterThan(0);

      const regenerated2 = plainToInstance(RegeneratedClass as any, invalidData) as any;
      const errors4 = await validate(regenerated2);
      expect(errors4.length).toBeGreaterThan(0);
    });

    it('should preserve optional properties', async () => {
      class OriginalUser {
        @IsString()
        @Expose()
        name!: string;

        @IsString()
        @IsOptional()
        @Expose()
        nickname?: string;

        @IsString()
        @IsOptional()
        @Expose()
        bio?: string;
      }

      const zodSchema = classToZod(OriginalUser);
      const RegeneratedClass = zodToClass(zodSchema, { className: 'RegeneratedUser' });

      const validData1 = { name: 'John' };
      const validData2 = { name: 'John', nickname: 'Johnny' };

      const original1 = plainToInstance(OriginalUser, validData1);
      const errors1 = await validate(original1);
      expect(errors1).toHaveLength(0);

      const regenerated1 = plainToInstance(RegeneratedClass as any, validData1) as any;
      const errors2 = await validate(regenerated1);
      expect(errors2).toHaveLength(0);

      const original2 = plainToInstance(OriginalUser, validData2);
      const errors3 = await validate(original2);
      expect(errors3).toHaveLength(0);

      const regenerated2 = plainToInstance(RegeneratedClass as any, validData2) as any;
      const errors4 = await validate(regenerated2);
      expect(errors4).toHaveLength(0);
    });

    it('should preserve nested objects', async () => {
      class OriginalAddress {
        @IsString()
        @Expose()
        street!: string;

        @IsString()
        @Expose()
        city!: string;

        @IsString()
        @MinLength(5)
        @MaxLength(10)
        @Expose()
        zipCode!: string;
      }

      class OriginalUser {
        @IsString()
        @Expose()
        name!: string;

        @ValidateNested()
        @Type(() => OriginalAddress)
        @Expose()
        address!: OriginalAddress;
      }

      const zodSchema = classToZod(OriginalUser);
      const RegeneratedClass = zodToClass(zodSchema, { className: 'RegeneratedUser' });

      const validData = {
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'New York',
          zipCode: '12345',
        },
      };

      const invalidData = {
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'New York',
          zipCode: '123',
        },
      };

      const original1 = plainToInstance(OriginalUser, validData);
      const errors1 = await validate(original1, { validationError: { target: false } });
      expect(errors1).toHaveLength(0);

      const regenerated1 = plainToInstance(RegeneratedClass as any, validData) as any;
      const errors2 = await validate(regenerated1, { validationError: { target: false } });
      expect(errors2).toHaveLength(0);

      const original2 = plainToInstance(OriginalUser, invalidData);
      const errors3 = await validate(original2, { validationError: { target: false } });
      expect(errors3.length).toBeGreaterThan(0);

      const regenerated2 = plainToInstance(RegeneratedClass as any, invalidData) as any;
      const errors4 = await validate(regenerated2, { validationError: { target: false } });
      expect(errors4.length).toBeGreaterThan(0);
    });

    it('should preserve arrays of objects', async () => {
      class OriginalPost {
        @IsString()
        @Expose()
        title!: string;

        @IsString()
        @Expose()
        content!: string;
      }

      class OriginalUser {
        @IsString()
        @Expose()
        name!: string;

        @IsArray()
        @Type(() => OriginalPost)
        @Expose()
        posts!: OriginalPost[];
      }

      const zodSchema = classToZod(OriginalUser);
      const RegeneratedClass = zodToClass(zodSchema, { className: 'RegeneratedUser' });

      const validData = {
        name: 'John',
        posts: [
          { title: 'First Post', content: 'Hello World' },
          { title: 'Second Post', content: 'Another post' },
        ],
      };

      const original = plainToInstance(OriginalUser, validData);
      const errors1 = await validate(original, { validationError: { target: false } });
      expect(errors1).toHaveLength(0);

      const regenerated = plainToInstance(RegeneratedClass as any, validData) as any;
      const errors2 = await validate(regenerated, { validationError: { target: false } });
      expect(errors2).toHaveLength(0);
    });

    it('should preserve enums', async () => {
      enum UserRole {
        Admin = 'admin',
        User = 'user',
        Guest = 'guest',
      }

      class OriginalUser {
        @IsString()
        @Expose()
        name!: string;

        @IsEnum(UserRole)
        @Expose()
        role!: UserRole;
      }

      const zodSchema = classToZod(OriginalUser);
      const RegeneratedClass = zodToClass(zodSchema, { className: 'RegeneratedUser' });

      const validData = { name: 'John', role: 'admin' };
      const invalidData = { name: 'John', role: 'invalid' };

      const original1 = plainToInstance(OriginalUser, validData);
      const errors1 = await validate(original1);
      expect(errors1).toHaveLength(0);

      const regenerated1 = plainToInstance(RegeneratedClass as any, validData) as any;
      const errors2 = await validate(regenerated1);
      expect(errors2).toHaveLength(0);

      const original2 = plainToInstance(OriginalUser, invalidData);
      const errors3 = await validate(original2);
      expect(errors3.length).toBeGreaterThan(0);

      const regenerated2 = plainToInstance(RegeneratedClass as any, invalidData) as any;
      const errors4 = await validate(regenerated2);
      expect(errors4.length).toBeGreaterThan(0);
    });

    it('should preserve string validators', async () => {
      class OriginalUser {
        @IsString()
        @IsEmail()
        @Expose()
        email!: string;

        @IsString()
        @IsUUID()
        @Expose()
        uuid!: string;

        @IsString()
        @MinLength(3)
        @MaxLength(20)
        @Expose()
        username!: string;
      }

      const zodSchema = classToZod(OriginalUser);
      const RegeneratedClass = zodToClass(zodSchema, { className: 'RegeneratedUser' });

      const validData = {
        email: 'test@example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
      };

      const invalidData = {
        email: 'invalid',
        uuid: 'not-a-uuid',
        username: 'ab',
      };

      const original1 = plainToInstance(OriginalUser, validData);
      const errors1 = await validate(original1);
      expect(errors1).toHaveLength(0);

      const regenerated1 = plainToInstance(RegeneratedClass as any, validData) as any;
      const errors2 = await validate(regenerated1);
      expect(errors2).toHaveLength(0);

      const original2 = plainToInstance(OriginalUser, invalidData);
      const errors3 = await validate(original2);
      expect(errors3.length).toBeGreaterThan(0);

      const regenerated2 = plainToInstance(RegeneratedClass as any, invalidData) as any;
      const errors4 = await validate(regenerated2);
      expect(errors4.length).toBeGreaterThan(0);
    });

    it('should preserve number validators', async () => {
      class OriginalProduct {
        @IsInt()
        @Min(18)
        @Max(100)
        @Expose()
        age!: number;

        @IsNumber()
        @Expose()
        price!: number;
      }

      const zodSchema = classToZod(OriginalProduct);
      const RegeneratedClass = zodToClass(zodSchema, { className: 'RegeneratedProduct' });

      const validData = {
        age: 25,
        price: 19.99,
      };

      const invalidData = {
        age: 150,
        price: 19.99,
      };

      const original1 = plainToInstance(OriginalProduct, validData);
      const errors1 = await validate(original1);
      expect(errors1).toHaveLength(0);

      const regenerated1 = plainToInstance(RegeneratedClass as any, validData) as any;
      const errors2 = await validate(regenerated1);
      expect(errors2).toHaveLength(0);

      const original2 = plainToInstance(OriginalProduct, invalidData);
      const errors3 = await validate(original2);
      expect(errors3.length).toBeGreaterThan(0);

      const regenerated2 = plainToInstance(RegeneratedClass as any, invalidData) as any;
      const errors4 = await validate(regenerated2);
      expect(errors4.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Round-trip Scenarios', () => {
    it('should handle multi-level nested objects in both directions', async () => {
      const originalZodSchema = z.object({
        user: z.object({
          name: z.string(),
          contact: z.object({
            email: z.string().email(),
            phone: z.string(),
          }),
        }),
      });

      // Zod → Class → Zod
      const Class1 = zodToClass(originalZodSchema, { className: 'Test1' });
      const schema1 = classToZod(Class1);

      const testData = {
        user: {
          name: 'John',
          contact: {
            email: 'john@example.com',
            phone: '555-1234',
          },
        },
      };

      expect(() => originalZodSchema.parse(testData)).not.toThrow();
      expect(() => schema1.parse(testData)).not.toThrow();

      const parsed1 = originalZodSchema.parse(testData);
      const parsed2 = schema1.parse(testData);
      expect(parsed1).toEqual(parsed2);
    });

    it('should preserve complex validation combinations', () => {
      const originalSchema = z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        age: z.number().int().min(18).max(100),
        username: z.string().min(3).max(20),
        tags: z.array(z.string()),
        role: z.enum(['admin', 'user']),
        bio: z.string().optional(),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'ComplexUser' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        age: 25,
        username: 'johndoe',
        tags: ['developer', 'typescript'],
        role: 'admin' as const,
      };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      const parsed1 = originalSchema.parse(validData);
      const parsed2 = regeneratedSchema.parse(validData);
      expect(parsed1).toEqual(parsed2);
    });

    it('should handle 3-level nesting (Zod → Class → Zod)', () => {
      const originalSchema = z.object({
        company: z.object({
          name: z.string(),
          address: z.object({
            street: z.string().min(5),
            city: z.string(),
            country: z.object({
              name: z.string(),
              code: z.string().length(2),
            }),
          }),
        }),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'Company' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = {
        company: {
          name: 'Tech Corp',
          address: {
            street: '123 Main Street',
            city: 'San Francisco',
            country: {
              name: 'United States',
              code: 'US',
            },
          },
        },
      };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      const parsed1 = originalSchema.parse(validData);
      const parsed2 = regeneratedSchema.parse(validData);
      expect(parsed1).toEqual(parsed2);

      // Test validation at deepest level
      const invalidData = {
        ...validData,
        company: {
          ...validData.company,
          address: {
            ...validData.company.address,
            country: {
              name: 'United States',
              code: 'USA', // Too long - should be exactly 2 chars
            },
          },
        },
      };

      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should handle 4-level nesting (Class → Zod → Class)', async () => {
      class Level4 {
        @IsString()
        @MinLength(3)
        @Expose()
        value!: string;
      }

      class Level3 {
        @IsString()
        @Expose()
        name!: string;

        @ValidateNested()
        @Type(() => Level4)
        @Expose()
        level4!: Level4;
      }

      class Level2 {
        @IsNumber()
        @Min(0)
        @Expose()
        count!: number;

        @ValidateNested()
        @Type(() => Level3)
        @Expose()
        level3!: Level3;
      }

      class Level1 {
        @IsString()
        @Expose()
        id!: string;

        @ValidateNested()
        @Type(() => Level2)
        @Expose()
        level2!: Level2;
      }

      const zodSchema = classToZod(Level1);
      const RegeneratedClass = zodToClass(zodSchema, { className: 'RegeneratedLevel1' });

      const validData = {
        id: 'root',
        level2: {
          count: 42,
          level3: {
            name: 'deep',
            level4: {
              value: 'deepest',
            },
          },
        },
      };

      const invalidData = {
        id: 'root',
        level2: {
          count: 42,
          level3: {
            name: 'deep',
            level4: {
              value: 'ab', // Too short - min length 3
            },
          },
        },
      };

      // Validate original class
      const original1 = plainToInstance(Level1, validData);
      const errors1 = await validate(original1, { validationError: { target: false } });
      expect(errors1).toHaveLength(0);

      // Validate regenerated class
      const regenerated1 = plainToInstance(RegeneratedClass as any, validData) as any;
      const errors2 = await validate(regenerated1, { validationError: { target: false } });
      expect(errors2).toHaveLength(0);

      // Test deep validation in original
      const original2 = plainToInstance(Level1, invalidData);
      const errors3 = await validate(original2, { validationError: { target: false } });
      expect(errors3.length).toBeGreaterThan(0);

      // Test deep validation in regenerated
      const regenerated2 = plainToInstance(RegeneratedClass as any, invalidData) as any;
      const errors4 = await validate(regenerated2, { validationError: { target: false } });
      expect(errors4.length).toBeGreaterThan(0);
    });

    it('should handle arrays at multiple nesting levels (Zod → Class → Zod)', () => {
      const originalSchema = z.object({
        name: z.string(),
        departments: z.array(
          z.object({
            name: z.string(),
            teams: z.array(
              z.object({
                name: z.string().min(3),
                members: z.array(
                  z.object({
                    name: z.string(),
                    email: z.string().email(),
                  })
                ),
              })
            ),
          })
        ),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'Organization' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = {
        name: 'Tech Company',
        departments: [
          {
            name: 'Engineering',
            teams: [
              {
                name: 'Backend',
                members: [
                  { name: 'Alice', email: 'alice@example.com' },
                  { name: 'Bob', email: 'bob@example.com' },
                ],
              },
              {
                name: 'Frontend',
                members: [
                  { name: 'Charlie', email: 'charlie@example.com' },
                ],
              },
            ],
          },
          {
            name: 'Sales',
            teams: [
              {
                name: 'Enterprise',
                members: [
                  { name: 'David', email: 'david@example.com' },
                ],
              },
            ],
          },
        ],
      };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      const parsed1 = originalSchema.parse(validData);
      const parsed2 = regeneratedSchema.parse(validData);
      expect(parsed1).toEqual(parsed2);

      // Test validation at nested array level
      const invalidData = {
        ...validData,
        departments: [
          {
            name: 'Engineering',
            teams: [
              {
                name: 'AB', // Too short - min 3 chars
                members: [
                  { name: 'Alice', email: 'alice@example.com' },
                ],
              },
            ],
          },
        ],
      };

      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should handle optional nested objects at various depths (Class → Zod → Class)', async () => {
      class DeepOptional {
        @IsString()
        @MinLength(5)
        @Expose()
        value!: string;
      }

      class MiddleOptional {
        @IsString()
        @Expose()
        name!: string;

        @IsOptional()
        @ValidateNested()
        @Type(() => DeepOptional)
        @Expose()
        deep?: DeepOptional;
      }

      class TopLevel {
        @IsString()
        @Expose()
        id!: string;

        @IsOptional()
        @ValidateNested()
        @Type(() => MiddleOptional)
        @Expose()
        middle?: MiddleOptional;
      }

      const zodSchema = classToZod(TopLevel);
      const RegeneratedClass = zodToClass(zodSchema, { className: 'RegeneratedTopLevel' });

      // Test with all optional fields present
      const fullData = {
        id: 'test-1',
        middle: {
          name: 'middle-level',
          deep: {
            value: 'deep-value',
          },
        },
      };

      const original1 = plainToInstance(TopLevel, fullData);
      const errors1 = await validate(original1, { validationError: { target: false } });
      expect(errors1).toHaveLength(0);

      const regenerated1 = plainToInstance(RegeneratedClass as any, fullData) as any;
      const errors2 = await validate(regenerated1, { validationError: { target: false } });
      expect(errors2).toHaveLength(0);

      // Test with middle optional field missing
      const partialData = {
        id: 'test-2',
      };

      const original2 = plainToInstance(TopLevel, partialData);
      const errors3 = await validate(original2, { validationError: { target: false } });
      expect(errors3).toHaveLength(0);

      const regenerated2 = plainToInstance(RegeneratedClass as any, partialData) as any;
      const errors4 = await validate(regenerated2, { validationError: { target: false } });
      expect(errors4).toHaveLength(0);

      // Test with deep optional field missing
      const middleOnlyData = {
        id: 'test-3',
        middle: {
          name: 'middle-level',
        },
      };

      const original3 = plainToInstance(TopLevel, middleOnlyData);
      const errors5 = await validate(original3, { validationError: { target: false } });
      expect(errors5).toHaveLength(0);

      const regenerated3 = plainToInstance(RegeneratedClass as any, middleOnlyData) as any;
      const errors6 = await validate(regenerated3, { validationError: { target: false } });
      expect(errors6).toHaveLength(0);

      // Test validation at deepest optional level
      const invalidDeepData = {
        id: 'test-4',
        middle: {
          name: 'middle-level',
          deep: {
            value: 'abc', // Too short - min 5 chars
          },
        },
      };

      const original4 = plainToInstance(TopLevel, invalidDeepData);
      const errors7 = await validate(original4, { validationError: { target: false } });
      expect(errors7.length).toBeGreaterThan(0);

      const regenerated4 = plainToInstance(RegeneratedClass as any, invalidDeepData) as any;
      const errors8 = await validate(regenerated4, { validationError: { target: false } });
      expect(errors8.length).toBeGreaterThan(0);
    });

    it('should handle arrays within nested objects within arrays (Zod → Class → Zod)', () => {
      const originalSchema = z.object({
        projects: z.array(
          z.object({
            name: z.string().min(3),
            metadata: z.object({
              tags: z.array(z.string()),
              contributors: z.array(
                z.object({
                  name: z.string(),
                  email: z.string().email(),
                  roles: z.array(z.string()),
                })
              ),
            }),
          })
        ),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'ProjectList' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = {
        projects: [
          {
            name: 'Project Alpha',
            metadata: {
              tags: ['backend', 'api', 'nodejs'],
              contributors: [
                {
                  name: 'Alice',
                  email: 'alice@example.com',
                  roles: ['developer', 'reviewer'],
                },
                {
                  name: 'Bob',
                  email: 'bob@example.com',
                  roles: ['lead', 'architect'],
                },
              ],
            },
          },
          {
            name: 'Project Beta',
            metadata: {
              tags: ['frontend', 'react'],
              contributors: [
                {
                  name: 'Charlie',
                  email: 'charlie@example.com',
                  roles: ['developer'],
                },
              ],
            },
          },
        ],
      };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      const parsed1 = originalSchema.parse(validData);
      const parsed2 = regeneratedSchema.parse(validData);
      expect(parsed1).toEqual(parsed2);

      // Test validation in deeply nested object array
      const invalidData = {
        projects: [
          {
            name: 'Project Alpha',
            metadata: {
              tags: ['backend'],
              contributors: [
                {
                  name: 'Alice',
                  email: 'invalid-email', // Invalid email format
                  roles: ['developer'],
                },
              ],
            },
          },
        ],
      };

      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should handle 5-level deep nesting with mixed types (Zod → Class → Zod)', () => {
      const originalSchema = z.object({
        level1: z.object({
          name: z.string(),
          level2: z.array(
            z.object({
              id: z.number(),
              level3: z.object({
                title: z.string().min(5),
                level4: z.array(
                  z.object({
                    tag: z.string(),
                    level5: z.object({
                      value: z.number().min(1).max(100),
                      metadata: z.string().optional(),
                    }),
                  })
                ),
              }),
            })
          ),
        }),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'DeepNested' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = {
        level1: {
          name: 'root',
          level2: [
            {
              id: 1,
              level3: {
                title: 'Section A',
                level4: [
                  {
                    tag: 'important',
                    level5: {
                      value: 50,
                      metadata: 'some info',
                    },
                  },
                  {
                    tag: 'optional',
                    level5: {
                      value: 75,
                    },
                  },
                ],
              },
            },
            {
              id: 2,
              level3: {
                title: 'Section B',
                level4: [
                  {
                    tag: 'critical',
                    level5: {
                      value: 100,
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      const parsed1 = originalSchema.parse(validData);
      const parsed2 = regeneratedSchema.parse(validData);
      expect(parsed1).toEqual(parsed2);

      // Test validation at level 5 (deepest level)
      const invalidData = {
        level1: {
          name: 'root',
          level2: [
            {
              id: 1,
              level3: {
                title: 'Section A',
                level4: [
                  {
                    tag: 'important',
                    level5: {
                      value: 101, // Exceeds max of 100
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should preserve constraints on primitive array items (Zod → Class → Zod)', () => {
      // Test 1: Array of strings with min length
      const schema1 = z.object({
        tags: z.array(z.string().min(2)),
      });

      const GeneratedClass1 = zodToClass(schema1, { className: 'TaggedItem' });
      const regeneratedSchema1 = classToZod(GeneratedClass1);

      const validData1 = { tags: ['ab', 'cd', 'ef'] };
      const invalidData1 = { tags: ['a', 'b'] }; // Too short

      expect(() => schema1.parse(validData1)).not.toThrow();
      expect(() => regeneratedSchema1.parse(validData1)).not.toThrow();
      expect(() => schema1.parse(invalidData1)).toThrow();
      expect(() => regeneratedSchema1.parse(invalidData1)).toThrow();

      // Test 2: Array of numbers with constraints
      const schema2 = z.object({
        scores: z.array(z.number().min(1).max(100)),
      });

      const GeneratedClass2 = zodToClass(schema2, { className: 'Scores' });
      const regeneratedSchema2 = classToZod(GeneratedClass2);

      const validData2 = { scores: [50, 75, 100] };
      const invalidData2 = { scores: [0, 50, 101] }; // Out of range

      expect(() => schema2.parse(validData2)).not.toThrow();
      expect(() => regeneratedSchema2.parse(validData2)).not.toThrow();
      expect(() => schema2.parse(invalidData2)).toThrow();
      expect(() => regeneratedSchema2.parse(invalidData2)).toThrow();

      // Test 3: Array of strings with email validation
      const schema3 = z.object({
        emails: z.array(z.string().email()),
      });

      const GeneratedClass3 = zodToClass(schema3, { className: 'EmailList' });
      const regeneratedSchema3 = classToZod(GeneratedClass3);

      const validData3 = { emails: ['test@example.com', 'user@test.com'] };
      const invalidData3 = { emails: ['invalid-email', 'test@example.com'] };

      expect(() => schema3.parse(validData3)).not.toThrow();
      expect(() => regeneratedSchema3.parse(validData3)).not.toThrow();
      expect(() => schema3.parse(invalidData3)).toThrow();
      expect(() => regeneratedSchema3.parse(invalidData3)).toThrow();
    });
  });
});
