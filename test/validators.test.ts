import 'reflect-metadata';
import { z } from 'zod';
import { zodToClass } from '../src';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('Validators', () => {
  it('should validate enum values', async () => {
    const schema = z.object({
      role: z.enum(['admin', 'user', 'guest']),
    });

    const UserClass = zodToClass(schema, { className: 'User' });

    const validUser = plainToInstance(UserClass, { role: 'admin' }) as any;
    const validErrors = await validate(validUser);
    expect(validErrors).toHaveLength(0);

    const invalidUser = plainToInstance(UserClass, { role: 'invalid' }) as any;
    const invalidErrors = await validate(invalidUser);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it('should validate URL strings', async () => {
    const schema = z.object({
      website: z.string().url(),
    });

    const UserClass = zodToClass(schema, { className: 'User' });

    const validUser = plainToInstance(UserClass, {
      website: 'https://example.com',
    }) as any;
    const validErrors = await validate(validUser);
    expect(validErrors).toHaveLength(0);

    const invalidUser = plainToInstance(UserClass, { website: 'not-a-url' }) as any;
    const invalidErrors = await validate(invalidUser);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it('should validate integer numbers', async () => {
    const schema = z.object({
      count: z.number().int(),
    });

    const DataClass = zodToClass(schema, { className: 'Data' });

    const validData = plainToInstance(DataClass, { count: 42 }) as any;
    const validErrors = await validate(validData);
    expect(validErrors).toHaveLength(0);

    const invalidData = plainToInstance(DataClass, { count: 42.5 }) as any;
    const invalidErrors = await validate(invalidData);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it('should validate array properties', async () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });

    const DataClass = zodToClass(schema, { className: 'Data' });

    const validData = plainToInstance(DataClass, {
      tags: ['tag1', 'tag2', 'tag3'],
    }) as any;
    const validErrors = await validate(validData);
    expect(validErrors).toHaveLength(0);

    const invalidData = plainToInstance(DataClass, { tags: 'not-an-array' }) as any;
    const invalidErrors = await validate(invalidData);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });
});
