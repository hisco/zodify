import 'reflect-metadata';
import { z } from 'zod';
import { zodToClass } from '../src/zod-to-class';
import { mapZodToGraphQL } from '../src/graphql-mapper';
import { walkZodSchema } from '../src/schema-walker';

describe('GraphQL support', () => {
  describe('graphql-mapper unit tests', () => {
    it('should map ZodString to () => String', () => {
      const node = walkZodSchema(z.string());
      const decorators = mapZodToGraphQL(node);

      expect(decorators).toHaveLength(1);
      expect(decorators[0].name).toBe('Field');
      expect(decorators[0].source).toBe('nestjs-graphql');
      expect(decorators[0].args).toEqual(['() => String']);
    });

    it('should map ZodNumber (float) to () => Float', () => {
      const node = walkZodSchema(z.number());
      const decorators = mapZodToGraphQL(node);

      expect(decorators[0].args).toEqual(['() => Float']);
    });

    it('should map ZodNumber.int() to () => Int', () => {
      const node = walkZodSchema(z.number().int());
      const decorators = mapZodToGraphQL(node);

      expect(decorators[0].args).toEqual(['() => Int']);
    });

    it('should map ZodBoolean to () => Boolean', () => {
      const node = walkZodSchema(z.boolean());
      const decorators = mapZodToGraphQL(node);

      expect(decorators[0].args).toEqual(['() => Boolean']);
    });

    it('should map ZodDate to () => Date', () => {
      const node = walkZodSchema(z.date());
      const decorators = mapZodToGraphQL(node);

      expect(decorators[0].args).toEqual(['() => Date']);
    });

    it('should set nullable for optional schemas', () => {
      const node = walkZodSchema(z.string().optional());
      const decorators = mapZodToGraphQL(node);

      expect(decorators[0].options).toEqual({ nullable: true });
    });

    it('should set nullable for nullable schemas', () => {
      const node = walkZodSchema(z.string().nullable());
      const decorators = mapZodToGraphQL(node);

      expect(decorators[0].options).toEqual({ nullable: true });
    });

    it('should include description from .describe()', () => {
      const node = walkZodSchema(z.string().describe('User email'));
      const decorators = mapZodToGraphQL(node);

      expect(decorators[0].options).toEqual({ description: 'User email' });
    });

    it('should include defaultValue from .default()', () => {
      const node = walkZodSchema(z.string().default('guest'));
      const decorators = mapZodToGraphQL(node);

      expect(decorators[0].options).toEqual({ defaultValue: 'guest' });
    });

    it('should map nested object with class name', () => {
      const node = walkZodSchema(z.object({ street: z.string() }));
      const decorators = mapZodToGraphQL(node, 'UserAddress');

      expect(decorators[0].args).toEqual(['() => UserAddress']);
    });

    it('should map array of strings to () => [String]', () => {
      const node = walkZodSchema(z.array(z.string()));
      const decorators = mapZodToGraphQL(node);

      expect(decorators[0].args).toEqual(['() => [String]']);
    });

    it('should map array of ints to () => [Int]', () => {
      const node = walkZodSchema(z.array(z.number().int()));
      const decorators = mapZodToGraphQL(node);

      expect(decorators[0].args).toEqual(['() => [Int]']);
    });

    it('should map array of objects to () => [ClassName]', () => {
      const node = walkZodSchema(z.array(z.object({ name: z.string() })));
      const decorators = mapZodToGraphQL(node, 'OrderItem');

      expect(decorators[0].args).toEqual(['() => [OrderItem]']);
    });

    it('should map enum to () => String', () => {
      const node = walkZodSchema(z.enum(['active', 'inactive']));
      const decorators = mapZodToGraphQL(node);

      expect(decorators[0].args).toEqual(['() => String']);
    });
  });

  describe('code generation (toCode)', () => {
    it('should generate @Field for primitive types', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().int(),
        score: z.number(),
        active: z.boolean(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain('@Field(() => String)');
      expect(code).toContain('@Field(() => Int)');
      expect(code).toContain('@Field(() => Float)');
      expect(code).toContain('@Field(() => Boolean)');
    });

    it('should generate @ObjectType class decorator by default', () => {
      const schema = z.object({
        name: z.string(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
      });

      expect(code).toContain('@ObjectType()');
      expect(code).toContain('class User');
    });

    it('should generate @InputType class decorator when configured', () => {
      const schema = z.object({
        name: z.string(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'CreateUserInput',
        includeGraphQL: true,
        graphqlType: 'InputType',
      });

      expect(code).toContain('@InputType()');
      expect(code).toContain('class CreateUserInput');
      expect(code).not.toContain('@ObjectType');
    });

    it('should generate @ObjectType on nested classes too', () => {
      const schema = z.object({
        address: z.object({
          street: z.string(),
        }),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain('@ObjectType()\nexport class UserAddress');
      expect(code).toContain('@ObjectType()\nexport class User');
    });

    it('should include Int and Float in imports when used', () => {
      const schema = z.object({
        count: z.number().int(),
        score: z.number(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'Stats',
        includeGraphQL: true,
        includeImports: true,
      });

      expect(code).toContain("from '@nestjs/graphql'");
      expect(code).toContain('Int');
      expect(code).toContain('Float');
      expect(code).toContain('ObjectType');
      expect(code).toContain('Field');
    });

    it('should handle nullable with @Field options', () => {
      const schema = z.object({
        bio: z.string().optional(),
        nickname: z.string().nullable(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain('nullable: true');
    });

    it('should include description in @Field options', () => {
      const schema = z.object({
        email: z.string().describe('User email address'),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain("description: 'User email address'");
    });

    it('should include defaultValue in @Field options', () => {
      const schema = z.object({
        role: z.string().default('user'),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain("defaultValue: 'user'");
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
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain('@Field(() => UserAddress)');
    });

    it('should handle arrays with [] type notation', () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain('@Field(() => [String])');
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
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain('() => [OrderItemsItem]');
    });

    it('should handle arrays of integers', () => {
      const schema = z.object({
        scores: z.array(z.number().int()),
      });

      const code = zodToClass.toCode(schema, {
        className: 'Game',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain('@Field(() => [Int])');
    });

    it('should not include graphql decorators when includeGraphQL is false', () => {
      const schema = z.object({
        name: z.string(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: false,
      });

      expect(code).not.toContain('@Field');
      expect(code).not.toContain('@ObjectType');
      expect(code).not.toContain('@nestjs/graphql');
    });

    it('should not include graphql decorators by default', () => {
      const schema = z.object({
        name: z.string(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
      });

      expect(code).not.toContain('@Field');
      expect(code).not.toContain('@ObjectType');
    });

    it('should place @Field before validators and transformers', () => {
      const schema = z.object({
        name: z.string().min(1),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeValidators: true,
        includeTransformers: true,
      });

      const fieldIndex = code.indexOf('@Field');
      const isStringIndex = code.indexOf('@IsString');
      const exposeIndex = code.indexOf('@Expose');

      expect(fieldIndex).toBeLessThan(isStringIndex);
      expect(fieldIndex).toBeLessThan(exposeIndex);
    });

    it('should work alongside swagger decorators', () => {
      const schema = z.object({
        name: z.string(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeSwagger: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain('@Field(() => String)');
      expect(code).toContain('@ApiProperty');
      expect(code).toContain('@ObjectType()');
      expect(code).toContain("from '@nestjs/graphql'");
      expect(code).toContain("from '@nestjs/swagger'");
    });

    it('should handle combined description + default', () => {
      const schema = z.object({
        role: z.string().default('user').describe('User role'),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain("description: 'User role'");
      expect(code).toContain("defaultValue: 'user'");
    });

    it('should handle combined nullable + description', () => {
      const schema = z.object({
        bio: z.string().nullable().describe('User bio'),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain("description: 'User bio'");
      expect(code).toContain('nullable: true');
    });

    it('should handle enum types', () => {
      const schema = z.object({
        status: z.enum(['active', 'inactive', 'pending']),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain('@Field(() => String)');
    });

    it('should handle dates', () => {
      const schema = z.object({
        createdAt: z.date(),
      });

      const code = zodToClass.toCode(schema, {
        className: 'User',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      expect(code).toContain('@Field(() => Date)');
    });
  });
});
