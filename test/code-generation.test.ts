import { z } from 'zod';
import { zodToClass } from '../src';

describe('Code Generation', () => {
  it('should generate TypeScript code string', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
      age: z.number().int().min(0).max(120),
    });

    const code = zodToClass.toCode(schema, { className: 'User' });

    expect(code).toContain('class User');
    expect(code).toContain('name');
    expect(code).toContain('email');
    expect(code).toContain('age');
  });

  it('should include imports when requested', () => {
    const schema = z.object({
      email: z.string().email(),
    });

    const code = zodToClass.toCode(schema, {
      className: 'User',
      includeImports: true,
    });

    expect(code).toContain("from 'class-validator'");
    expect(code).toContain("from 'class-transformer'");
  });

  it('should include decorators in generated code', () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(0).max(120),
    });

    const code = zodToClass.toCode(schema, { className: 'User' });

    expect(code).toContain('@IsEmail()');
    expect(code).toContain('@Min(0)');
    expect(code).toContain('@Max(120)');
    expect(code).toContain('@Expose()');
  });

  it('should export class when requested', () => {
    const schema = z.object({
      name: z.string(),
    });

    const codeWithExport = zodToClass.toCode(schema, {
      className: 'User',
      exportClass: true,
    });

    expect(codeWithExport).toContain('export class User');

    const codeWithoutExport = zodToClass.toCode(schema, {
      className: 'User',
      exportClass: false,
    });

    expect(codeWithoutExport).toContain('class User');
    expect(codeWithoutExport).not.toContain('export class User');
  });

  it('should generate code for nested objects', () => {
    const schema = z.object({
      name: z.string(),
      address: z.object({
        street: z.string(),
        city: z.string(),
      }),
    });

    const code = zodToClass.toCode(schema, { className: 'User' });

    expect(code).toContain('class User');
    expect(code).toContain('class UserAddress');
    expect(code).toContain('street');
    expect(code).toContain('city');
  });

  it('should generate code with optional properties marked correctly', () => {
    const schema = z.object({
      name: z.string(),
      nickname: z.string().optional(),
    });

    const code = zodToClass.toCode(schema, { className: 'User' });

    expect(code).toContain('nickname?: string');
    expect(code).toContain('name!: string');
    // Ensure name is not marked as optional
    expect(code).toMatch(/\s+name!:\s+string/);
  });
});
