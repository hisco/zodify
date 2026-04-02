import 'reflect-metadata';
import { z } from 'zod';
import { zodToJsonSchema, jsonSchemaToZod } from '../src';
import type { JsonSchema } from '../src';

// Helper: strip $schema and top-level metadata for comparison
function normalize(schema: JsonSchema): any {
  const { $schema, ...rest } = schema;
  return JSON.parse(JSON.stringify(rest));
}

// Helper: check Zod schema accepts/rejects same data
function assertBehavioralEquivalence(a: z.ZodTypeAny, b: z.ZodTypeAny, validSamples: any[], invalidSamples: any[]) {
  for (const sample of validSamples) {
    expect(a.safeParse(sample).success).toBe(true);
    expect(b.safeParse(sample).success).toBe(true);
  }
  for (const sample of invalidSamples) {
    expect(a.safeParse(sample).success).toBe(false);
    expect(b.safeParse(sample).success).toBe(false);
  }
}

describe('zodToJsonSchema', () => {
  it('should convert string schema', () => {
    const result = zodToJsonSchema(z.string());
    expect(result.type).toBe('string');
  });

  it('should convert number schema', () => {
    const result = zodToJsonSchema(z.number());
    expect(result.type).toBe('number');
  });

  it('should convert integer schema', () => {
    const result = zodToJsonSchema(z.number().int());
    expect(result.type).toBe('integer');
  });

  it('should convert boolean schema', () => {
    const result = zodToJsonSchema(z.boolean());
    expect(result.type).toBe('boolean');
  });

  it('should convert string with email format', () => {
    const result = zodToJsonSchema(z.string().email());
    expect(result.type).toBe('string');
    expect(result.format).toBe('email');
  });

  it('should convert string with url format', () => {
    const result = zodToJsonSchema(z.string().url());
    expect(result.type).toBe('string');
    expect(result.format).toBe('uri');
  });

  it('should convert string with uuid format', () => {
    const result = zodToJsonSchema(z.string().uuid());
    expect(result.type).toBe('string');
    expect(result.format).toBe('uuid');
  });

  it('should convert string with datetime format', () => {
    const result = zodToJsonSchema(z.string().datetime());
    expect(result.type).toBe('string');
    expect(result.format).toBe('date-time');
  });

  it('should convert string constraints', () => {
    const result = zodToJsonSchema(z.string().min(2).max(100));
    expect(result.minLength).toBe(2);
    expect(result.maxLength).toBe(100);
  });

  it('should convert string regex', () => {
    const result = zodToJsonSchema(z.string().regex(/^[a-z]+$/));
    expect(result.pattern).toBe('^[a-z]+$');
  });

  it('should convert number constraints', () => {
    const result = zodToJsonSchema(z.number().min(0).max(100));
    expect(result.minimum).toBe(0);
    expect(result.maximum).toBe(100);
  });

  it('should convert exclusive number constraints', () => {
    const result = zodToJsonSchema(z.number().gt(0).lt(100));
    expect(result.exclusiveMinimum).toBe(0);
    expect(result.exclusiveMaximum).toBe(100);
  });

  it('should convert multipleOf', () => {
    const result = zodToJsonSchema(z.number().multipleOf(5));
    expect(result.multipleOf).toBe(5);
  });

  it('should convert object schema', () => {
    const result = zodToJsonSchema(z.object({
      name: z.string(),
      age: z.number(),
    }));
    expect(result.type).toBe('object');
    expect(result.properties?.name).toEqual({ type: 'string' });
    expect(result.properties?.age).toEqual({ type: 'number' });
    expect(result.required).toEqual(expect.arrayContaining(['name', 'age']));
  });

  it('should convert optional properties', () => {
    const result = zodToJsonSchema(z.object({
      name: z.string(),
      nickname: z.string().optional(),
    }));
    expect(result.required).toEqual(['name']);
  });

  it('should convert array schema', () => {
    const result = zodToJsonSchema(z.array(z.string()));
    expect(result.type).toBe('array');
    expect(result.items).toEqual({ type: 'string' });
  });

  it('should convert array constraints', () => {
    const result = zodToJsonSchema(z.array(z.number()).min(1).max(10));
    expect(result.minItems).toBe(1);
    expect(result.maxItems).toBe(10);
  });

  it('should convert enum', () => {
    const result = zodToJsonSchema(z.enum(['A', 'B', 'C']));
    expect(result.enum).toEqual(['A', 'B', 'C']);
  });

  it('should convert nullable', () => {
    const result = zodToJsonSchema(z.string().nullable());
    // Draft-07 represents nullable as type array
    expect(result.type).toEqual(expect.arrayContaining(['string', 'null']));
  });

  it('should convert description', () => {
    const result = zodToJsonSchema(z.string().describe('A name'));
    expect(result.description).toBe('A name');
  });

  it('should convert default', () => {
    const result = zodToJsonSchema(z.string().default('hello'));
    expect(result.default).toBe('hello');
  });

  it('should convert record', () => {
    const result = zodToJsonSchema(z.record(z.number()));
    expect(result.type).toBe('object');
    expect(result.additionalProperties).toEqual({ type: 'number' });
  });
});

describe('jsonSchemaToZod', () => {
  it('should convert string type', () => {
    const zod = jsonSchemaToZod({ type: 'string' });
    expect(zod.safeParse('hello').success).toBe(true);
    expect(zod.safeParse(123).success).toBe(false);
  });

  it('should convert number type', () => {
    const zod = jsonSchemaToZod({ type: 'number' });
    expect(zod.safeParse(42).success).toBe(true);
    expect(zod.safeParse('42').success).toBe(false);
  });

  it('should convert integer type', () => {
    const zod = jsonSchemaToZod({ type: 'integer' });
    expect(zod.safeParse(42).success).toBe(true);
    expect(zod.safeParse(3.14).success).toBe(false);
  });

  it('should convert boolean type', () => {
    const zod = jsonSchemaToZod({ type: 'boolean' });
    expect(zod.safeParse(true).success).toBe(true);
    expect(zod.safeParse('true').success).toBe(false);
  });

  it('should convert null type', () => {
    const zod = jsonSchemaToZod({ type: 'null' });
    expect(zod.safeParse(null).success).toBe(true);
    expect(zod.safeParse(undefined).success).toBe(false);
  });

  it('should convert string with email format', () => {
    const zod = jsonSchemaToZod({ type: 'string', format: 'email' });
    expect(zod.safeParse('test@example.com').success).toBe(true);
    expect(zod.safeParse('not-an-email').success).toBe(false);
  });

  it('should convert string with uri format', () => {
    const zod = jsonSchemaToZod({ type: 'string', format: 'uri' });
    expect(zod.safeParse('https://example.com').success).toBe(true);
    expect(zod.safeParse('not a url').success).toBe(false);
  });

  it('should convert string with uuid format', () => {
    const zod = jsonSchemaToZod({ type: 'string', format: 'uuid' });
    expect(zod.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    expect(zod.safeParse('not-uuid').success).toBe(false);
  });

  it('should convert string with date-time format', () => {
    const zod = jsonSchemaToZod({ type: 'string', format: 'date-time' });
    expect(zod.safeParse('2024-01-01T00:00:00Z').success).toBe(true);
    expect(zod.safeParse('not-a-date').success).toBe(false);
  });

  it('should convert string with ipv4 format', () => {
    const zod = jsonSchemaToZod({ type: 'string', format: 'ipv4' });
    expect(zod.safeParse('192.168.1.1').success).toBe(true);
    expect(zod.safeParse('not-an-ip').success).toBe(false);
  });

  it('should convert string with ipv6 format', () => {
    const zod = jsonSchemaToZod({ type: 'string', format: 'ipv6' });
    expect(zod.safeParse('::1').success).toBe(true);
    expect(zod.safeParse('not-an-ip').success).toBe(false);
  });

  it('should convert string constraints', () => {
    const zod = jsonSchemaToZod({ type: 'string', minLength: 2, maxLength: 10 });
    expect(zod.safeParse('ab').success).toBe(true);
    expect(zod.safeParse('a').success).toBe(false);
    expect(zod.safeParse('a'.repeat(11)).success).toBe(false);
  });

  it('should convert string pattern', () => {
    const zod = jsonSchemaToZod({ type: 'string', pattern: '^[a-z]+$' });
    expect(zod.safeParse('abc').success).toBe(true);
    expect(zod.safeParse('ABC').success).toBe(false);
  });

  it('should convert number constraints', () => {
    const zod = jsonSchemaToZod({ type: 'number', minimum: 0, maximum: 100 });
    expect(zod.safeParse(50).success).toBe(true);
    expect(zod.safeParse(-1).success).toBe(false);
    expect(zod.safeParse(101).success).toBe(false);
  });

  it('should convert exclusive number constraints', () => {
    const zod = jsonSchemaToZod({ type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 100 });
    expect(zod.safeParse(1).success).toBe(true);
    expect(zod.safeParse(0).success).toBe(false);
    expect(zod.safeParse(100).success).toBe(false);
  });

  it('should handle Draft-04 boolean exclusiveMinimum/exclusiveMaximum', () => {
    const zod = jsonSchemaToZod({
      type: 'number',
      minimum: 0,
      maximum: 100,
      exclusiveMinimum: true,
      exclusiveMaximum: true,
    });
    expect(zod.safeParse(0).success).toBe(false);
    expect(zod.safeParse(100).success).toBe(false);
    expect(zod.safeParse(50).success).toBe(true);
  });

  it('should convert multipleOf', () => {
    const zod = jsonSchemaToZod({ type: 'number', multipleOf: 5 });
    expect(zod.safeParse(10).success).toBe(true);
    expect(zod.safeParse(7).success).toBe(false);
  });

  it('should convert object with required and optional properties', () => {
    const zod = jsonSchemaToZod({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        nickname: { type: 'string' },
      },
      required: ['name', 'age'],
    });
    expect(zod.safeParse({ name: 'Alice', age: 30 }).success).toBe(true);
    expect(zod.safeParse({ name: 'Alice' }).success).toBe(false);
    expect(zod.safeParse({ name: 'Alice', age: 30, nickname: 'Ali' }).success).toBe(true);
  });

  it('should convert array with items', () => {
    const zod = jsonSchemaToZod({ type: 'array', items: { type: 'string' } });
    expect(zod.safeParse(['a', 'b']).success).toBe(true);
    expect(zod.safeParse([1, 2]).success).toBe(false);
  });

  it('should convert array constraints', () => {
    const zod = jsonSchemaToZod({ type: 'array', items: { type: 'number' }, minItems: 1, maxItems: 3 });
    expect(zod.safeParse([1]).success).toBe(true);
    expect(zod.safeParse([]).success).toBe(false);
    expect(zod.safeParse([1, 2, 3, 4]).success).toBe(false);
  });

  it('should convert string enum', () => {
    const zod = jsonSchemaToZod({ enum: ['A', 'B', 'C'] });
    expect(zod.safeParse('A').success).toBe(true);
    expect(zod.safeParse('D').success).toBe(false);
  });

  it('should convert oneOf nullable', () => {
    const zod = jsonSchemaToZod({
      oneOf: [{ type: 'string' }, { type: 'null' }],
    });
    expect(zod.safeParse('hello').success).toBe(true);
    expect(zod.safeParse(null).success).toBe(true);
    expect(zod.safeParse(42).success).toBe(false);
  });

  it('should convert anyOf as union', () => {
    const zod = jsonSchemaToZod({
      anyOf: [{ type: 'string' }, { type: 'number' }],
    });
    expect(zod.safeParse('hello').success).toBe(true);
    expect(zod.safeParse(42).success).toBe(true);
    expect(zod.safeParse(true).success).toBe(false);
  });

  it('should convert OpenAPI nullable', () => {
    const zod = jsonSchemaToZod({ type: 'string', nullable: true });
    expect(zod.safeParse('hello').success).toBe(true);
    expect(zod.safeParse(null).success).toBe(true);
    expect(zod.safeParse(42).success).toBe(false);
  });

  it('should apply description', () => {
    const zod = jsonSchemaToZod({ type: 'string', description: 'A name' });
    expect(zod.description).toBe('A name');
  });

  it('should apply default', () => {
    const zod = jsonSchemaToZod({ type: 'string', default: 'hello' });
    expect(zod.safeParse(undefined).success).toBe(true);
    expect(zod.parse(undefined)).toBe('hello');
  });

  it('should convert record (additionalProperties)', () => {
    const zod = jsonSchemaToZod({
      type: 'object',
      additionalProperties: { type: 'number' },
    });
    expect(zod.safeParse({ a: 1, b: 2 }).success).toBe(true);
    expect(zod.safeParse({ a: 'x' }).success).toBe(false);
  });

  it('should resolve $ref from definitions', () => {
    const zod = jsonSchemaToZod({
      type: 'object',
      properties: {
        address: { $ref: '#/definitions/Address' },
      },
      required: ['address'],
      definitions: {
        Address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
          },
          required: ['street', 'city'],
        },
      },
    });
    expect(zod.safeParse({ address: { street: '123 Main', city: 'NYC' } }).success).toBe(true);
    expect(zod.safeParse({ address: { street: '123 Main' } }).success).toBe(false);
  });

  it('should resolve $ref from $defs', () => {
    const zod = jsonSchemaToZod({
      type: 'object',
      properties: {
        item: { $ref: '#/$defs/Item' },
      },
      required: ['item'],
      $defs: {
        Item: { type: 'string' },
      },
    });
    expect(zod.safeParse({ item: 'hello' }).success).toBe(true);
    expect(zod.safeParse({ item: 42 }).success).toBe(false);
  });

  it('should convert nested objects', () => {
    const zod = jsonSchemaToZod({
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: {
              type: 'object',
              properties: {
                city: { type: 'string' },
              },
              required: ['city'],
            },
          },
          required: ['name', 'address'],
        },
      },
      required: ['user'],
    });
    expect(zod.safeParse({ user: { name: 'Alice', address: { city: 'NYC' } } }).success).toBe(true);
    expect(zod.safeParse({ user: { name: 'Alice', address: {} } }).success).toBe(false);
  });

  it('should handle type array with null (nullable)', () => {
    const zod = jsonSchemaToZod({ type: ['string', 'null'] });
    expect(zod.safeParse('hello').success).toBe(true);
    expect(zod.safeParse(null).success).toBe(true);
    expect(zod.safeParse(42).success).toBe(false);
  });
});

describe('Round-trip: JSON Schema → Zod → JSON Schema', () => {
  function roundTrip(input: JsonSchema) {
    const zod = jsonSchemaToZod(input);
    const output = zodToJsonSchema(zod);
    return normalize(output);
  }

  it('should round-trip flat object with string and number', () => {
    const input: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
      additionalProperties: false,
    };
    const result = roundTrip(input);
    expect(result.type).toBe('object');
    expect(result.properties.name).toEqual({ type: 'string' });
    expect(result.properties.age).toEqual({ type: 'number' });
    expect(result.required).toEqual(expect.arrayContaining(['name', 'age']));
    expect(result.additionalProperties).toBe(false);
  });

  it('should round-trip string constraints', () => {
    const input: JsonSchema = { type: 'string', minLength: 2, maxLength: 50 };
    const result = roundTrip(input);
    expect(result.type).toBe('string');
    expect(result.minLength).toBe(2);
    expect(result.maxLength).toBe(50);
  });

  it('should round-trip number constraints', () => {
    const input: JsonSchema = { type: 'number', minimum: 0, maximum: 100 };
    const result = roundTrip(input);
    expect(result.type).toBe('number');
    expect(result.minimum).toBe(0);
    expect(result.maximum).toBe(100);
  });

  it('should round-trip exclusive number constraints', () => {
    const input: JsonSchema = { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 100 };
    const result = roundTrip(input);
    expect(result.type).toBe('number');
    expect(result.exclusiveMinimum).toBe(0);
    expect(result.exclusiveMaximum).toBe(100);
  });

  it('should round-trip integer', () => {
    const input: JsonSchema = { type: 'integer' };
    const result = roundTrip(input);
    expect(result.type).toBe('integer');
  });

  it('should round-trip multipleOf', () => {
    const input: JsonSchema = { type: 'number', multipleOf: 5 };
    const result = roundTrip(input);
    expect(result.multipleOf).toBe(5);
  });

  it('should round-trip array constraints', () => {
    const input: JsonSchema = {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 10,
    };
    const result = roundTrip(input);
    expect(result.type).toBe('array');
    expect(result.items).toEqual({ type: 'string' });
    expect(result.minItems).toBe(1);
    expect(result.maxItems).toBe(10);
  });

  it('should round-trip enum', () => {
    const input: JsonSchema = { type: 'string', enum: ['A', 'B', 'C'] };
    const result = roundTrip(input);
    expect(result.enum).toEqual(['A', 'B', 'C']);
  });

  it('should round-trip description', () => {
    const input: JsonSchema = { type: 'string', description: 'A user name' };
    const result = roundTrip(input);
    expect(result.description).toBe('A user name');
  });

  it('should round-trip default', () => {
    const input: JsonSchema = { type: 'string', default: 'hello' };
    const result = roundTrip(input);
    expect(result.default).toBe('hello');
  });

  it('should round-trip record', () => {
    const input: JsonSchema = {
      type: 'object',
      additionalProperties: { type: 'number' },
    };
    const result = roundTrip(input);
    expect(result.type).toBe('object');
    expect(result.additionalProperties).toEqual({ type: 'number' });
  });

  it('should round-trip nested objects', () => {
    const input: JsonSchema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            zip: { type: 'string', minLength: 5, maxLength: 5 },
          },
          required: ['street', 'zip'],
          additionalProperties: false,
        },
      },
      required: ['address'],
      additionalProperties: false,
    };
    const result = roundTrip(input);
    expect(result.properties.address.properties.street).toEqual({ type: 'string' });
    expect(result.properties.address.properties.zip.minLength).toBe(5);
    expect(result.properties.address.required).toEqual(expect.arrayContaining(['street', 'zip']));
  });

  it('should round-trip string with email format', () => {
    const input: JsonSchema = { type: 'string', format: 'email' };
    const result = roundTrip(input);
    expect(result.type).toBe('string');
    expect(result.format).toBe('email');
  });

  it('should round-trip string with regex pattern', () => {
    const input: JsonSchema = { type: 'string', pattern: '^[a-z]+$' };
    const result = roundTrip(input);
    expect(result.type).toBe('string');
    expect(result.pattern).toBe('^[a-z]+$');
  });
});

describe('Round-trip: Zod → JSON Schema → Zod', () => {
  function roundTrip(zodSchema: z.ZodTypeAny) {
    const jsonSchema = zodToJsonSchema(zodSchema);
    return jsonSchemaToZod(jsonSchema);
  }

  it('should round-trip string', () => {
    const original = z.string();
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      ['hello', ''],
      [42, null, undefined],
    );
  });

  it('should round-trip number', () => {
    const original = z.number();
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      [42, 3.14, 0],
      ['42', null],
    );
  });

  it('should round-trip boolean', () => {
    const original = z.boolean();
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      [true, false],
      ['true', 0, null],
    );
  });

  it('should round-trip string with constraints', () => {
    const original = z.string().min(2).max(10);
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      ['ab', 'hello'],
      ['a', 'a'.repeat(11)],
    );
  });

  it('should round-trip number with constraints', () => {
    const original = z.number().min(0).max(100);
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      [0, 50, 100],
      [-1, 101],
    );
  });

  it('should round-trip integer', () => {
    const original = z.number().int();
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      [0, 42, -5],
      [3.14, 0.1],
    );
  });

  it('should round-trip enum', () => {
    const original = z.enum(['A', 'B', 'C']);
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      ['A', 'B', 'C'],
      ['D', 42],
    );
  });

  it('should round-trip array of strings', () => {
    const original = z.array(z.string());
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      [[], ['a'], ['a', 'b']],
      [[1], 'a'],
    );
  });

  it('should round-trip array with constraints', () => {
    const original = z.array(z.number()).min(1).max(5);
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      [[1], [1, 2, 3]],
      [[], [1, 2, 3, 4, 5, 6]],
    );
  });

  it('should round-trip object', () => {
    const original = z.object({
      name: z.string(),
      age: z.number(),
      active: z.boolean().optional(),
    });
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25, active: true }],
      [{ name: 'Alice' }, { age: 30 }],
    );
  });

  it('should round-trip nullable string', () => {
    const original = z.string().nullable();
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      ['hello', null],
      [42, undefined],
    );
  });

  it('should round-trip string with email', () => {
    const original = z.string().email();
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      ['test@example.com'],
      ['not-email', 42],
    );
  });

  it('should round-trip record', () => {
    const original = z.record(z.number());
    const result = roundTrip(original);
    assertBehavioralEquivalence(original, result,
      [{ a: 1 }, {}],
      [{ a: 'x' }],
    );
  });

  it('should round-trip complex schema', () => {
    const original = z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      score: z.number().min(0).max(100).int(),
      tags: z.array(z.string()).min(1),
      role: z.enum(['admin', 'user', 'guest']),
      bio: z.string().optional(),
      metadata: z.record(z.string()),
    });
    const result = roundTrip(original);
    const valid = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      score: 85,
      tags: ['developer'],
      role: 'admin',
      metadata: { theme: 'dark' },
    };
    const invalid = {
      id: 'not-uuid',
      email: 'test@example.com',
      score: 85,
      tags: ['developer'],
      role: 'admin',
      metadata: { theme: 'dark' },
    };
    assertBehavioralEquivalence(original, result, [valid], [invalid]);
  });
});
