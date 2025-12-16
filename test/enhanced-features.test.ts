import 'reflect-metadata';
import { z } from 'zod';
import { zodToClass, classToZod } from '../src';
import {
  IsString,
  IsDate,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayNotEmpty,
  MinDate,
  MaxDate,
  IsArray,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';

describe('Enhanced Features - 100% Parity Tests', () => {
  describe('Array Length Constraints', () => {
    it('should preserve array min size (Zod → Class → Zod)', () => {
      const originalSchema = z.object({
        tags: z.array(z.string()).min(2),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'TagList' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = { tags: ['a', 'b'] };
      const invalidData = { tags: ['a'] }; // Too few

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();
      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should preserve array max size (Zod → Class → Zod)', () => {
      const originalSchema = z.object({
        tags: z.array(z.string()).max(3),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'TagList' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = { tags: ['a', 'b', 'c'] };
      const invalidData = { tags: ['a', 'b', 'c', 'd'] }; // Too many

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();
      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should preserve array exact length (Zod → Class → Zod)', () => {
      const originalSchema = z.object({
        coordinates: z.array(z.number()).length(2),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'Point' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = { coordinates: [10, 20] };
      const invalidDataTooFew = { coordinates: [10] };
      const invalidDataTooMany = { coordinates: [10, 20, 30] };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();
      expect(() => originalSchema.parse(invalidDataTooFew)).toThrow();
      expect(() => regeneratedSchema.parse(invalidDataTooFew)).toThrow();
      expect(() => originalSchema.parse(invalidDataTooMany)).toThrow();
      expect(() => regeneratedSchema.parse(invalidDataTooMany)).toThrow();
    });

    it('should support @ArrayMinSize decorator (Class → Zod)', () => {
      class OriginalClass {
        @IsArray()
        @ArrayMinSize(1)
        @Type(() => String)
        @Expose()
        tags!: string[];
      }

      const zodSchema = classToZod(OriginalClass);

      const validData = { tags: ['tag1'] };
      const invalidData = { tags: [] };

      expect(() => zodSchema.parse(validData)).not.toThrow();
      expect(() => zodSchema.parse(invalidData)).toThrow();
    });

    it('should support @ArrayMaxSize decorator (Class → Zod)', () => {
      class OriginalClass {
        @IsArray()
        @ArrayMaxSize(5)
        @Type(() => String)
        @Expose()
        tags!: string[];
      }

      const zodSchema = classToZod(OriginalClass);

      const validData = { tags: ['a', 'b', 'c'] };
      const invalidData = { tags: ['a', 'b', 'c', 'd', 'e', 'f'] };

      expect(() => zodSchema.parse(validData)).not.toThrow();
      expect(() => zodSchema.parse(invalidData)).toThrow();
    });

    it('should support @ArrayNotEmpty decorator (Class → Zod)', () => {
      class OriginalClass {
        @IsArray()
        @ArrayNotEmpty()
        @Type(() => String)
        @Expose()
        tags!: string[];
      }

      const zodSchema = classToZod(OriginalClass);

      const validData = { tags: ['tag'] };
      const invalidData = { tags: [] };

      expect(() => zodSchema.parse(validData)).not.toThrow();
      expect(() => zodSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Date Range Validation', () => {
    it('should preserve date min constraint (Zod → Class → Zod)', () => {
      const minDate = new Date('2020-01-01');
      const originalSchema = z.object({
        startDate: z.date().min(minDate),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'DateRange' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = { startDate: new Date('2021-01-01') };
      const invalidData = { startDate: new Date('2019-01-01') };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();
      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should preserve date max constraint (Zod → Class → Zod)', () => {
      const maxDate = new Date('2025-12-31');
      const originalSchema = z.object({
        endDate: z.date().max(maxDate),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'DateRange' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = { endDate: new Date('2024-01-01') };
      const invalidData = { endDate: new Date('2026-01-01') };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();
      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should support @MinDate decorator (Class → Zod)', () => {
      const minDate = new Date('2020-01-01');

      class OriginalClass {
        @IsDate()
        @MinDate(minDate)
        @Type(() => Date)
        @Expose()
        birthDate!: Date;
      }

      const zodSchema = classToZod(OriginalClass);

      const validData = { birthDate: new Date('2021-01-01') };
      const invalidData = { birthDate: new Date('2019-01-01') };

      expect(() => zodSchema.parse(validData)).not.toThrow();
      expect(() => zodSchema.parse(invalidData)).toThrow();
    });

    it('should support @MaxDate decorator (Class → Zod)', () => {
      const maxDate = new Date('2025-12-31');

      class OriginalClass {
        @IsDate()
        @MaxDate(maxDate)
        @Type(() => Date)
        @Expose()
        appointmentDate!: Date;
      }

      const zodSchema = classToZod(OriginalClass);

      const validData = { appointmentDate: new Date('2024-01-01') };
      const invalidData = { appointmentDate: new Date('2026-01-01') };

      expect(() => zodSchema.parse(validData)).not.toThrow();
      expect(() => zodSchema.parse(invalidData)).toThrow();
    });
  });

  describe('String StartsWith/EndsWith', () => {
    it('should preserve startsWith constraint (Zod → Class → Zod)', () => {
      const originalSchema = z.object({
        url: z.string().startsWith('https://'),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'UrlHolder' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = { url: 'https://example.com' };
      const invalidData = { url: 'http://example.com' };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();
      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should preserve endsWith constraint (Zod → Class → Zod)', () => {
      const originalSchema = z.object({
        filename: z.string().endsWith('.pdf'),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'FileInfo' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = { filename: 'document.pdf' };
      const invalidData = { filename: 'document.txt' };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();
      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });

    it('should handle special regex characters in startsWith', () => {
      const originalSchema = z.object({
        pattern: z.string().startsWith('$['),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'Pattern' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = { pattern: '$[test]' };
      const invalidData = { pattern: 'test$[' };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();
      expect(() => originalSchema.parse(invalidData)).toThrow();
      expect(() => regeneratedSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Combined Complex Scenarios', () => {
    it('should handle complex schema with all new features', () => {
      const minDate = new Date('2024-01-01');
      const maxDate = new Date('2025-12-31');

      const originalSchema = z.object({
        name: z.string().min(2),
        tags: z.array(z.string()).min(1).max(10),
        startDate: z.date().min(minDate),
        endDate: z.date().max(maxDate),
        apiKey: z.string().startsWith('sk_').length(32),
      });

      const GeneratedClass = zodToClass(originalSchema, { className: 'ComplexEntity' });
      const regeneratedSchema = classToZod(GeneratedClass);

      const validData = {
        name: 'Test',
        tags: ['tag1', 'tag2'],
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-06-01'),
        apiKey: 'sk_' + 'x'.repeat(29), // 32 chars total
      };

      expect(() => originalSchema.parse(validData)).not.toThrow();
      expect(() => regeneratedSchema.parse(validData)).not.toThrow();

      const parsed1 = originalSchema.parse(validData);
      const parsed2 = regeneratedSchema.parse(validData);

      expect(parsed1.name).toBe(parsed2.name);
      expect(parsed1.tags).toEqual(parsed2.tags);
    });
  });
});
