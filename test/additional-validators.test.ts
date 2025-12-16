import 'reflect-metadata';
import { z } from 'zod';
import { zodToClass } from '../src';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('Additional Validator Mappings', () => {
  describe('String Validators', () => {
    it('should validate CUID strings', async () => {
      const Schema = z.object({
        id: z.string().cuid(),
      });

      const Class = zodToClass(Schema, { className: 'CuidTest' });

      // Valid CUID
      const validData = { id: 'cjld2cjxh0000qzrmn831i7rn' };
      const validInstance = plainToInstance(Class, validData) as any;
      const validErrors = await validate(validInstance);
      expect(validErrors).toHaveLength(0);

      // Invalid CUID
      const invalidData = { id: 'not-a-cuid' };
      const invalidInstance = plainToInstance(Class, invalidData) as any;
      const invalidErrors = await validate(invalidInstance);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate CUID2 strings', async () => {
      const Schema = z.object({
        id: z.string().cuid2(),
      });

      const Class = zodToClass(Schema, { className: 'Cuid2Test' });

      // Valid CUID2 (alphanumeric lowercase)
      const validData = { id: 'tz4a98xxat96iws9zmbrgj3a' };
      const validInstance = plainToInstance(Class, validData) as any;
      const validErrors = await validate(validInstance);
      expect(validErrors).toHaveLength(0);

      // Invalid CUID2 (contains uppercase or special chars)
      const invalidData = { id: 'TZ4A98XX-AT96' };
      const invalidInstance = plainToInstance(Class, invalidData) as any;
      const invalidErrors = await validate(invalidInstance);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate datetime strings', async () => {
      const Schema = z.object({
        timestamp: z.string().datetime(),
      });

      const Class = zodToClass(Schema, { className: 'DatetimeTest' });

      // Valid ISO datetime
      const validData = { timestamp: '2024-01-15T10:30:00Z' };
      const validInstance = plainToInstance(Class, validData) as any;
      const validErrors = await validate(validInstance);
      expect(validErrors).toHaveLength(0);

      // Invalid datetime
      const invalidData = { timestamp: 'not-a-datetime' };
      const invalidInstance = plainToInstance(Class, invalidData) as any;
      const invalidErrors = await validate(invalidInstance);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate IP addresses', async () => {
      const Schema = z.object({
        ipv4: z.string().ip(),
        ipv6: z.string().ip(),
      });

      const Class = zodToClass(Schema, { className: 'IpTest' });

      // Valid IPs
      const validData = {
        ipv4: '192.168.1.1',
        ipv6: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      };
      const validInstance = plainToInstance(Class, validData) as any;
      const validErrors = await validate(validInstance);
      expect(validErrors).toHaveLength(0);

      // Invalid IP
      const invalidData = { ipv4: '999.999.999.999', ipv6: 'not-an-ip' };
      const invalidInstance = plainToInstance(Class, invalidData) as any;
      const invalidErrors = await validate(invalidInstance);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate strings containing specific substring', async () => {
      const Schema = z.object({
        text: z.string().includes('hello'),
      });

      const Class = zodToClass(Schema, { className: 'IncludesTest' });

      // Valid (contains "hello")
      const validData = { text: 'hello world' };
      const validInstance = plainToInstance(Class, validData) as any;
      const validErrors = await validate(validInstance);
      expect(validErrors).toHaveLength(0);

      // Invalid (doesn't contain "hello")
      const invalidData = { text: 'goodbye world' };
      const invalidInstance = plainToInstance(Class, invalidData) as any;
      const invalidErrors = await validate(invalidInstance);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate exact string length', async () => {
      const Schema = z.object({
        code: z.string().length(6),
      });

      const Class = zodToClass(Schema, { className: 'LengthTest' });

      // Valid length
      const validData = { code: 'ABC123' };
      const validInstance = plainToInstance(Class, validData) as any;
      const validErrors = await validate(validInstance);
      expect(validErrors).toHaveLength(0);

      // Invalid length
      const invalidData = { code: 'ABC' };
      const invalidInstance = plainToInstance(Class, invalidData) as any;
      const invalidErrors = await validate(invalidInstance);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Number Validators', () => {
    it('should validate numbers divisible by specific value', async () => {
      const Schema = z.object({
        value: z.number().multipleOf(5),
      });

      const Class = zodToClass(Schema, { className: 'MultipleOfTest' });

      // Valid (divisible by 5)
      const validData = { value: 15 };
      const validInstance = plainToInstance(Class, validData) as any;
      const validErrors = await validate(validInstance);
      expect(validErrors).toHaveLength(0);

      // Invalid (not divisible by 5)
      const invalidData = { value: 17 };
      const invalidInstance = plainToInstance(Class, invalidData) as any;
      const invalidErrors = await validate(invalidInstance);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should validate positive numbers', async () => {
      const Schema = z.object({
        score: z.number().positive(),
      });

      const Class = zodToClass(Schema, { className: 'PositiveTest' });

      // Valid positive
      const validData = { score: 42 };
      const validInstance = plainToInstance(Class, validData) as any;
      const validErrors = await validate(validInstance);
      expect(validErrors).toHaveLength(0);

      // Invalid (negative or zero)
      const invalidData1 = { score: -5 };
      const invalidInstance1 = plainToInstance(Class, invalidData1) as any;
      const invalidErrors1 = await validate(invalidInstance1);
      expect(invalidErrors1.length).toBeGreaterThan(0);

      const invalidData2 = { score: 0 };
      const invalidInstance2 = plainToInstance(Class, invalidData2) as any;
      const invalidErrors2 = await validate(invalidInstance2);
      expect(invalidErrors2.length).toBeGreaterThan(0);
    });

    it('should validate negative numbers', async () => {
      const Schema = z.object({
        temperature: z.number().negative(),
      });

      const Class = zodToClass(Schema, { className: 'NegativeTest' });

      // Valid negative
      const validData = { temperature: -10 };
      const validInstance = plainToInstance(Class, validData) as any;
      const validErrors = await validate(validInstance);
      expect(validErrors).toHaveLength(0);

      // Invalid (positive or zero)
      const invalidData1 = { temperature: 5 };
      const invalidInstance1 = plainToInstance(Class, invalidData1) as any;
      const invalidErrors1 = await validate(invalidInstance1);
      expect(invalidErrors1.length).toBeGreaterThan(0);

      const invalidData2 = { temperature: 0 };
      const invalidInstance2 = plainToInstance(Class, invalidData2) as any;
      const invalidErrors2 = await validate(invalidInstance2);
      expect(invalidErrors2.length).toBeGreaterThan(0);
    });

    it('should combine multiple number validators', async () => {
      const Schema = z.object({
        quantity: z.number().int().positive().multipleOf(10).min(10).max(100),
      });

      const Class = zodToClass(Schema, { className: 'CombinedNumberTest' });

      // Valid
      const validData = { quantity: 50 };
      const validInstance = plainToInstance(Class, validData) as any;
      const validErrors = await validate(validInstance);
      expect(validErrors).toHaveLength(0);

      // Invalid (not multiple of 10)
      const invalidData1 = { quantity: 55 };
      const invalidInstance1 = plainToInstance(Class, invalidData1) as any;
      const invalidErrors1 = await validate(invalidInstance1);
      expect(invalidErrors1.length).toBeGreaterThan(0);

      // Invalid (negative)
      const invalidData2 = { quantity: -10 };
      const invalidInstance2 = plainToInstance(Class, invalidData2) as any;
      const invalidErrors2 = await validate(invalidInstance2);
      expect(invalidErrors2.length).toBeGreaterThan(0);
    });
  });

  describe('Code Generation with New Validators', () => {
    it('should generate code with new string validators', () => {
      const Schema = z.object({
        id: z.string().cuid(),
        timestamp: z.string().datetime(),
        ip: z.string().ip(),
        message: z.string().includes('important'),
      });

      const code = zodToClass.toCode(Schema, { className: 'NewValidators' });

      expect(code).toContain('@Matches(');
      expect(code).toContain('@IsDateString()');
      expect(code).toContain('@IsIP()');
      expect(code).toContain('@Contains(');
    });

    it('should generate code with new number validators', () => {
      const Schema = z.object({
        even: z.number().multipleOf(2),
        profit: z.number().positive(),
        loss: z.number().negative(),
      });

      const code = zodToClass.toCode(Schema, { className: 'NumberValidators' });

      expect(code).toContain('@IsDivisibleBy(2)');
      expect(code).toContain('@IsPositive()');
      expect(code).toContain('@IsNegative()');
    });
  });
});
