import 'reflect-metadata';
import { z } from 'zod';
import { zodToClass } from '../src/zod-to-class';

describe('Swagger support', () => {
  describe('code generation (toCode)', () => {
    it('should generate @ApiProperty for primitive types', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
        createdAt: z.date(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain("import { ApiProperty } from '@nestjs/swagger'");
      expect(code).toContain('@ApiProperty({ type: String })');
      expect(code).toContain('@ApiProperty({ type: Number })');
      expect(code).toContain('@ApiProperty({ type: Boolean })');
    });

    it('should generate @ApiPropertyOptional for optional fields', () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain("import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'");
      expect(code).toContain('@ApiProperty({ type: String })');
      expect(code).toContain('@ApiPropertyOptional({ type: String })');
    });

    it('should include nullable in @ApiProperty', () => {
      const schema = z.object({
        bio: z.string().nullable(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain('nullable: true');
    });

    it('should include description from .describe()', () => {
      const schema = z.object({
        email: z.string().email().describe('User email address'),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain("description: 'User email address'");
    });

    it('should include default value from .default()', () => {
      const schema = z.object({
        role: z.string().default('user'),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain("default: 'user'");
    });

    it('should include string constraints (minLength, maxLength, pattern)', () => {
      const schema = z.object({
        username: z.string().min(3).max(20),
        code: z.string().regex(/^[A-Z]{3}$/),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain('minLength: 3');
      expect(code).toContain('maxLength: 20');
      expect(code).toContain("pattern: '^[A-Z]{3}$'");
    });

    it('should include number constraints (minimum, maximum)', () => {
      const schema = z.object({
        age: z.number().min(0).max(120),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain('minimum: 0');
      expect(code).toContain('maximum: 120');
    });

    it('should include format for email, uuid, url, datetime', () => {
      const schema = z.object({
        email: z.string().email(),
        id: z.string().uuid(),
        website: z.string().url(),
        timestamp: z.string().datetime(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain("format: 'email'");
      expect(code).toContain("format: 'uuid'");
      expect(code).toContain("format: 'uri'");
      expect(code).toContain("format: 'date-time'");
    });

    it('should include enum values', () => {
      const schema = z.object({
        status: z.enum(['active', 'inactive', 'pending']),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain("enum: ['active', 'inactive', 'pending']");
    });

    it('should handle nested objects with type reference', () => {
      const schema = z.object({
        address: z.object({
          street: z.string(),
          city: z.string(),
        }),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain('() => UserAddress');
    });

    it('should handle arrays with isArray flag', () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain('isArray: true');
      expect(code).toContain('type: String');
    });

    it('should handle arrays of objects', () => {
      const schema = z.object({
        items: z.array(
          z.object({
            name: z.string(),
          })
        ),
      });

      const code = zodToClass.toCode(schema, {
        className: 'Order',
        includeSwagger: true,
      });

      expect(code).toContain('isArray: true');
      // The item type reference
      expect(code).toContain('OrderItemsItem');
    });

    it('should handle array constraints (minItems, maxItems)', () => {
      const schema = z.object({
        tags: z.array(z.string()).min(1).max(10),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain('minItems: 1');
      expect(code).toContain('maxItems: 10');
    });

    it('should not include swagger decorators when includeSwagger is false', () => {
      const schema = z.object({
        name: z.string(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: false,
      });

      expect(code).not.toContain('ApiProperty');
      expect(code).not.toContain('@nestjs/swagger');
    });

    it('should not include swagger decorators by default', () => {
      const schema = z.object({
        name: z.string(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
      });

      expect(code).not.toContain('ApiProperty');
    });

    it('should place swagger decorators before validators and transformers', () => {
      const schema = z.object({
        name: z.string().min(1),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
        includeValidators: true,
        includeTransformers: true,
      });

      const apiPropertyIndex = code.indexOf('@ApiProperty');
      const isStringIndex = code.indexOf('@IsString');
      const exposeIndex = code.indexOf('@Expose');

      expect(apiPropertyIndex).toBeLessThan(isStringIndex);
      expect(apiPropertyIndex).toBeLessThan(exposeIndex);
    });

    it('should handle multipleOf constraint', () => {
      const schema = z.object({
        quantity: z.number().multipleOf(5),
      });

      const code = zodToClass.toCode(schema, {
        className: 'Order',
        includeSwagger: true,
      });

      expect(code).toContain('multipleOf: 5');
    });

    it('should handle combined description + constraints', () => {
      const schema = z.object({
        age: z.number().min(0).max(120).describe('User age in years'),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeSwagger: true,
      });

      expect(code).toContain("description: 'User age in years'");
      expect(code).toContain('minimum: 0');
      expect(code).toContain('maximum: 120');
    });
  });
});
