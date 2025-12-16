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
  IsUrl,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
  Length,
  Matches,
  Contains,
  IsArray,
  IsEnum,
  IsPositive,
  IsNegative,
  IsDivisibleBy,
  IsDateString,
  IsIP,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { classToZod } from '../src';

describe('classToZod', () => {
  describe('Basic Primitives', () => {
    it('should convert string property', () => {
      class TestClass {
        @IsString()
        @Expose()
        name!: string;
      }

      const schema = classToZod(TestClass);
      expect(schema.shape.name).toBeDefined();
      expect(() => schema.parse({ name: 'test' })).not.toThrow();
      expect(() => schema.parse({ name: 123 })).toThrow();
    });

    it('should convert number property', () => {
      class TestClass {
        @IsNumber()
        @Expose()
        age!: number;
      }

      const schema = classToZod(TestClass);
      expect(schema.shape.age).toBeDefined();
      expect(() => schema.parse({ age: 25 })).not.toThrow();
      expect(() => schema.parse({ age: 'not a number' })).toThrow();
    });

    it('should convert integer property', () => {
      class TestClass {
        @IsInt()
        @Expose()
        count!: number;
      }

      const schema = classToZod(TestClass);
      expect(schema.shape.count).toBeDefined();
      expect(() => schema.parse({ count: 5 })).not.toThrow();
      expect(() => schema.parse({ count: 5.5 })).toThrow();
    });

    it('should convert boolean property', () => {
      class TestClass {
        @IsBoolean()
        @Expose()
        active!: boolean;
      }

      const schema = classToZod(TestClass);
      expect(schema.shape.active).toBeDefined();
      expect(() => schema.parse({ active: true })).not.toThrow();
      expect(() => schema.parse({ active: 'true' })).toThrow();
    });

    it('should convert date property', () => {
      class TestClass {
        @IsDate()
        @Expose()
        createdAt!: Date;
      }

      const schema = classToZod(TestClass);
      expect(schema.shape.createdAt).toBeDefined();
      const date = new Date();
      expect(() => schema.parse({ createdAt: date })).not.toThrow();
      expect(() => schema.parse({ createdAt: 'not a date' })).toThrow();
    });
  });

  describe('String Validators', () => {
    it('should convert email validator', () => {
      class TestClass {
        @IsString()
        @IsEmail()
        @Expose()
        email!: string;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ email: 'test@example.com' })).not.toThrow();
      expect(() => schema.parse({ email: 'invalid-email' })).toThrow();
    });

    it('should convert UUID validator', () => {
      class TestClass {
        @IsString()
        @IsUUID()
        @Expose()
        id!: string;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ id: '123e4567-e89b-12d3-a456-426614174000' })).not.toThrow();
      expect(() => schema.parse({ id: 'not-a-uuid' })).toThrow();
    });

    it('should convert URL validator', () => {
      class TestClass {
        @IsString()
        @IsUrl()
        @Expose()
        website!: string;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ website: 'https://example.com' })).not.toThrow();
      expect(() => schema.parse({ website: 'not a url' })).toThrow();
    });

    it('should convert MinLength validator', () => {
      class TestClass {
        @IsString()
        @MinLength(3)
        @Expose()
        username!: string;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ username: 'john' })).not.toThrow();
      expect(() => schema.parse({ username: 'ab' })).toThrow();
    });

    it('should convert MaxLength validator', () => {
      class TestClass {
        @IsString()
        @MaxLength(10)
        @Expose()
        username!: string;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ username: 'john' })).not.toThrow();
      expect(() => schema.parse({ username: 'this-is-too-long' })).toThrow();
    });

    it('should convert Length validator', () => {
      class TestClass {
        @IsString()
        @Length(5)
        @Expose()
        code!: string;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ code: 'abcde' })).not.toThrow();
      expect(() => schema.parse({ code: 'abc' })).toThrow();
    });

    it('should convert regex validator', () => {
      class TestClass {
        @IsString()
        @Matches(/^[A-Z]+$/)
        @Expose()
        code!: string;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ code: 'ABC' })).not.toThrow();
      expect(() => schema.parse({ code: 'abc' })).toThrow();
    });

    it('should convert Contains validator', () => {
      class TestClass {
        @IsString()
        @Contains('hello')
        @Expose()
        message!: string;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ message: 'hello world' })).not.toThrow();
      expect(() => schema.parse({ message: 'goodbye' })).toThrow();
    });

    it('should convert datetime validator', () => {
      class TestClass {
        @IsDateString()
        @Expose()
        timestamp!: string;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ timestamp: '2023-01-01T00:00:00Z' })).not.toThrow();
      expect(() => schema.parse({ timestamp: 'not a date' })).toThrow();
    });

    it('should convert IP validator', () => {
      class TestClass {
        @IsIP()
        @Expose()
        ipAddress!: string;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ ipAddress: '192.168.1.1' })).not.toThrow();
      expect(() => schema.parse({ ipAddress: 'not an ip' })).toThrow();
    });
  });

  describe('Number Validators', () => {
    it('should convert Min validator', () => {
      class TestClass {
        @IsNumber()
        @Min(18)
        @Expose()
        age!: number;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ age: 25 })).not.toThrow();
      expect(() => schema.parse({ age: 10 })).toThrow();
    });

    it('should convert Max validator', () => {
      class TestClass {
        @IsNumber()
        @Max(100)
        @Expose()
        age!: number;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ age: 50 })).not.toThrow();
      expect(() => schema.parse({ age: 150 })).toThrow();
    });

    it('should convert Min and Max validators together', () => {
      class TestClass {
        @IsNumber()
        @Min(18)
        @Max(100)
        @Expose()
        age!: number;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ age: 25 })).not.toThrow();
      expect(() => schema.parse({ age: 10 })).toThrow();
      expect(() => schema.parse({ age: 150 })).toThrow();
    });

    it('should convert IsPositive validator', () => {
      class TestClass {
        @IsNumber()
        @IsPositive()
        @Expose()
        amount!: number;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ amount: 10 })).not.toThrow();
      expect(() => schema.parse({ amount: -5 })).toThrow();
    });

    it('should convert IsNegative validator', () => {
      class TestClass {
        @IsNumber()
        @IsNegative()
        @Expose()
        debt!: number;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ debt: -10 })).not.toThrow();
      expect(() => schema.parse({ debt: 5 })).toThrow();
    });

    it('should convert IsDivisibleBy validator', () => {
      class TestClass {
        @IsNumber()
        @IsDivisibleBy(5)
        @Expose()
        count!: number;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ count: 10 })).not.toThrow();
      expect(() => schema.parse({ count: 7 })).toThrow();
    });
  });

  describe('Optional Properties', () => {
    it('should handle optional properties', () => {
      class TestClass {
        @IsString()
        @Expose()
        name!: string;

        @IsString()
        @IsOptional()
        @Expose()
        nickname?: string;
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ name: 'John' })).not.toThrow();
      expect(() => schema.parse({ name: 'John', nickname: 'Johnny' })).not.toThrow();
      expect(() => schema.parse({ name: 'John', nickname: undefined })).not.toThrow();
    });
  });

  describe('Nested Objects', () => {
    it('should handle nested objects with @Type decorator', () => {
      class Address {
        @IsString()
        @Expose()
        street!: string;

        @IsString()
        @Expose()
        city!: string;
      }

      class User {
        @IsString()
        @Expose()
        name!: string;

        @Type(() => Address)
        @Expose()
        address!: Address;
      }

      const schema = classToZod(User);
      expect(schema.shape.address).toBeDefined();

      const validData = {
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'New York',
        },
      };

      expect(() => schema.parse(validData)).not.toThrow();

      const invalidData = {
        name: 'John',
        address: {
          street: 123, // Should be string
          city: 'New York',
        },
      };

      expect(() => schema.parse(invalidData)).toThrow();
    });

    it('should handle multiple levels of nesting', () => {
      class Country {
        @IsString()
        @Expose()
        name!: string;
      }

      class City {
        @IsString()
        @Expose()
        name!: string;

        @Type(() => Country)
        @Expose()
        country!: Country;
      }

      class Address {
        @IsString()
        @Expose()
        street!: string;

        @Type(() => City)
        @Expose()
        city!: City;
      }

      class User {
        @IsString()
        @Expose()
        name!: string;

        @Type(() => Address)
        @Expose()
        address!: Address;
      }

      const schema = classToZod(User);

      const validData = {
        name: 'John',
        address: {
          street: '123 Main St',
          city: {
            name: 'New York',
            country: {
              name: 'USA',
            },
          },
        },
      };

      expect(() => schema.parse(validData)).not.toThrow();
    });
  });

  describe('Arrays', () => {
    it('should handle arrays with @Type decorator for objects', () => {
      class Tag {
        @IsString()
        @Expose()
        name!: string;
      }

      class Post {
        @IsString()
        @Expose()
        title!: string;

        @IsArray()
        @Type(() => Tag)
        @Expose()
        tags!: Tag[];
      }

      const schema = classToZod(Post);

      const validData = {
        title: 'My Post',
        tags: [{ name: 'tech' }, { name: 'coding' }],
      };

      expect(() => schema.parse(validData)).not.toThrow();

      const invalidData = {
        title: 'My Post',
        tags: [{ name: 123 }], // name should be string
      };

      expect(() => schema.parse(invalidData)).toThrow();
    });

    it('should handle primitive arrays', () => {
      class TestClass {
        @IsArray()
        @Type(() => String)
        @Expose()
        tags!: string[];
      }

      const schema = classToZod(TestClass);
      expect(() => schema.parse({ tags: ['a', 'b', 'c'] })).not.toThrow();
    });
  });

  describe('Enums', () => {
    it('should handle native enums', () => {
      enum UserRole {
        Admin = 'admin',
        User = 'user',
        Guest = 'guest',
      }

      class User {
        @IsString()
        @Expose()
        name!: string;

        @IsEnum(UserRole)
        @Expose()
        role!: UserRole;
      }

      const schema = classToZod(User);

      expect(() => schema.parse({ name: 'John', role: 'admin' })).not.toThrow();
      expect(() => schema.parse({ name: 'John', role: 'invalid' })).toThrow();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle class with multiple property types and validators', () => {
      class User {
        @IsString()
        @IsUUID()
        @Expose()
        id!: string;

        @IsString()
        @IsEmail()
        @Expose()
        email!: string;

        @IsNumber()
        @IsInt()
        @Min(18)
        @Max(100)
        @Expose()
        age!: number;

        @IsString()
        @MinLength(3)
        @MaxLength(20)
        @Expose()
        username!: string;

        @IsBoolean()
        @Expose()
        active!: boolean;

        @IsDate()
        @Type(() => Date)
        @Expose()
        createdAt!: Date;

        @IsString()
        @IsOptional()
        @Expose()
        bio?: string;
      }

      const schema = classToZod(User);

      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'john@example.com',
        age: 25,
        username: 'johndoe',
        active: true,
        createdAt: new Date(),
      };

      expect(() => schema.parse(validData)).not.toThrow();

      // Test various invalid scenarios
      expect(() =>
        schema.parse({ ...validData, email: 'invalid-email' })
      ).toThrow();
      expect(() => schema.parse({ ...validData, age: 150 })).toThrow();
      expect(() => schema.parse({ ...validData, username: 'ab' })).toThrow();
    });
  });

  describe('Fallback to reflect-metadata', () => {
    it('should use design:type when no validators present', () => {
      class TestClass {
        @Expose()
        name!: string;

        @Expose()
        age!: number;

        @Expose()
        active!: boolean;
      }

      const schema = classToZod(TestClass, { useReflectMetadata: true });

      expect(() =>
        schema.parse({ name: 'John', age: 25, active: true })
      ).not.toThrow();
      expect(() =>
        schema.parse({ name: 123, age: 25, active: true })
      ).toThrow();
    });
  });
});
