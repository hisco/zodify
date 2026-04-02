import { z } from 'zod';
import { SchemaNode } from './types';
import { getZodTypeName, isOptional, isNullable, unwrapSchema, getChecks } from './utils';

/**
 * Walk a Zod schema and extract metadata
 */
export function walkZodSchema(schema: z.ZodTypeAny): SchemaNode {
  const optional = isOptional(schema);
  const nullable = isNullable(schema);
  const unwrapped = unwrapSchema(schema);
  const typeName = getZodTypeName(unwrapped);

  // Check for ZodDefault wrapper — need to look at the original before full unwrap
  let hasDefault = false;
  let defaultValue: any;
  {
    let cursor: z.ZodTypeAny = schema;
    // Walk through optional/nullable/default wrappers
    while (cursor) {
      const tn = getZodTypeName(cursor);
      if (tn === 'ZodDefault') {
        hasDefault = true;
        defaultValue = (cursor as any)._def.defaultValue();
        break;
      }
      if (tn === 'ZodOptional' || tn === 'ZodNullable') {
        cursor = (cursor as any)._def.innerType;
      } else {
        break;
      }
    }
  }

  const node: SchemaNode = {
    typeName,
    schema: unwrapped,
    isOptional: optional,
    isNullable: nullable,
  };

  // Extract description — .describe() can be on any wrapper level,
  // so check the original schema first, then the unwrapped inner type.
  const description = (schema as any)._def.description ?? (unwrapped as any)._def.description;
  if (description) {
    node.description = description;
  }

  // Store default value
  if (hasDefault) {
    node.hasDefault = true;
    node.defaultValue = defaultValue;
  }

  // Extract checks/validators
  const checks = getChecks(unwrapped);
  if (checks.length > 0) {
    node.checks = checks;
  }

  // Handle different Zod types
  switch (typeName) {
    case 'ZodObject':
      node.shape = extractObjectShape(unwrapped as any);
      break;

    case 'ZodArray':
      node.itemSchema = walkZodSchema((unwrapped as any)._def.type);

      // CRITICAL: ZodArray stores length constraints in _def.minLength, _def.maxLength, _def.exactLength
      // not in _def.checks like other types. We need to extract them manually.
      const arrayDef = (unwrapped as any)._def;
      const arrayChecks: any[] = [];

      if (arrayDef.exactLength !== null && arrayDef.exactLength !== undefined) {
        arrayChecks.push({ kind: 'length', value: arrayDef.exactLength.value });
      } else {
        if (arrayDef.minLength !== null && arrayDef.minLength !== undefined) {
          arrayChecks.push({ kind: 'min', value: arrayDef.minLength.value });
        }
        if (arrayDef.maxLength !== null && arrayDef.maxLength !== undefined) {
          arrayChecks.push({ kind: 'max', value: arrayDef.maxLength.value });
        }
      }

      if (arrayChecks.length > 0) {
        node.checks = [...(node.checks || []), ...arrayChecks];
      }
      break;

    case 'ZodEnum':
      node.enumValues = (unwrapped as any)._def.values;
      break;

    case 'ZodNativeEnum':
      node.enumValues = Object.values((unwrapped as any)._def.values);
      break;

    case 'ZodUnion':
      node.variants = (unwrapped as any)._def.options.map((opt: z.ZodTypeAny) =>
        walkZodSchema(opt)
      );
      break;

    case 'ZodDiscriminatedUnion':
      const def = (unwrapped as any)._def;
      node.discriminatorKey = def.discriminator;
      node.variants = Array.from(def.options.values() as z.ZodTypeAny[]).map((opt) =>
        walkZodSchema(opt)
      );
      break;

    case 'ZodLiteral':
      // Literal values are stored in checks
      break;

    case 'ZodIntersection':
      // Handle intersection by merging properties
      // This is complex - simplified for now
      break;

    default:
      // Primitive types (string, number, boolean, date, etc.)
      break;
  }

  return node;
}

/**
 * Extract object shape from ZodObject schema
 */
function extractObjectShape(schema: z.ZodObject<any>): Record<string, SchemaNode> {
  const shape = (schema as any)._def.shape();
  const result: Record<string, SchemaNode> = {};

  for (const [key, value] of Object.entries(shape)) {
    result[key] = walkZodSchema(value as z.ZodTypeAny);
  }

  return result;
}

/**
 * Extract property information from a schema node
 */
export function extractPropertyInfo(
  propertyName: string,
  node: SchemaNode
): {
  name: string;
  type: string;
  optional: boolean;
  nullable: boolean;
  node: SchemaNode;
} {
  return {
    name: propertyName,
    type: node.typeName,
    optional: node.isOptional,
    nullable: node.isNullable,
    node,
  };
}
