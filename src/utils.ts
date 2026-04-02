import { z } from 'zod';

/**
 * Get the Zod type name from a schema's _def property
 */
export function getZodTypeName(schema: z.ZodTypeAny): string {
  return (schema as any)._def.typeName;
}

/**
 * Check if a schema is optional (wrapped in ZodOptional)
 */
export function isOptional(schema: z.ZodTypeAny): boolean {
  return getZodTypeName(schema) === 'ZodOptional';
}

/**
 * Check if a schema is nullable (wrapped in ZodNullable)
 */
export function isNullable(schema: z.ZodTypeAny): boolean {
  return getZodTypeName(schema) === 'ZodNullable';
}

/**
 * Unwrap optional and nullable wrappers to get the inner schema
 */
export function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;
  const typeName = getZodTypeName(current);

  if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
    current = (current as any)._def.innerType;
    // Recursively unwrap in case of ZodOptional(ZodNullable(...))
    return unwrapSchema(current);
  }

  if (typeName === 'ZodDefault') {
    current = (current as any)._def.innerType;
    return unwrapSchema(current);
  }

  return current;
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to PascalCase (for class names)
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[_-\s]+/)
    .map(word => capitalize(word))
    .join('');
}

/**
 * Get checks array from Zod schema _def
 */
export function getChecks(schema: z.ZodTypeAny): any[] {
  const def = (schema as any)._def;
  return def.checks || [];
}

/**
 * Check if a Zod schema has a specific check type
 */
export function hasCheck(schema: z.ZodTypeAny, checkKind: string): boolean {
  const checks = getChecks(schema);
  return checks.some(check => check.kind === checkKind);
}

/**
 * Get a specific check from a Zod schema
 */
export function getCheck(schema: z.ZodTypeAny, checkKind: string): any | undefined {
  const checks = getChecks(schema);
  return checks.find(check => check.kind === checkKind);
}

/**
 * Extract TypeScript type string from Zod schema
 */
export function getTypeScriptType(schema: z.ZodTypeAny): string {
  const unwrapped = unwrapSchema(schema);
  const typeName = getZodTypeName(unwrapped);

  switch (typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodDate':
      return 'Date';
    case 'ZodArray':
      const itemType = getTypeScriptType((unwrapped as any)._def.type);
      return `${itemType}[]`;
    case 'ZodObject':
      return 'object';
    case 'ZodEnum':
      const enumValues = (unwrapped as any)._def.values;
      return enumValues.map((v: string) => `'${v}'`).join(' | ');
    case 'ZodNativeEnum':
      return 'any'; // Requires enum reference
    case 'ZodLiteral':
      const value = (unwrapped as any)._def.value;
      return typeof value === 'string' ? `'${value}'` : String(value);
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion':
      return 'any'; // Will be handled specially
    case 'ZodRecord':
      return 'Record<string, any>';
    case 'ZodMap':
      return 'Map<any, any>';
    case 'ZodAny':
      return 'any';
    case 'ZodUnknown':
      return 'unknown';
    case 'ZodVoid':
      return 'void';
    case 'ZodUndefined':
      return 'undefined';
    case 'ZodNull':
      return 'null';
    default:
      return 'any';
  }
}
