import { z } from 'zod';
import type { JsonSchema, JsonSchemaToZodOptions } from './types';

/**
 * Convert a JSON Schema object to a runtime Zod schema.
 */
export function jsonSchemaToZod(
  jsonSchema: JsonSchema,
  options?: JsonSchemaToZodOptions,
): z.ZodTypeAny {
  const refCache = new Map<string, z.ZodTypeAny>();
  const refInProgress = new Set<string>();

  function resolveRef(ref: string): JsonSchema {
    if (options?.refResolver) {
      return options.refResolver(ref, jsonSchema);
    }
    // Default: resolve from root definitions/$defs
    const path = ref.replace(/^#\//, '').split('/');
    let current: any = jsonSchema;
    for (const segment of path) {
      current = current?.[segment];
      if (current === undefined) {
        throw new Error(`Cannot resolve $ref: ${ref}`);
      }
    }
    return current as JsonSchema;
  }

  function convertNode(node: JsonSchema): z.ZodTypeAny {
    // Handle $ref
    if (node.$ref) {
      const ref = node.$ref;
      if (refCache.has(ref)) {
        return refCache.get(ref)!;
      }
      if (refInProgress.has(ref)) {
        // Circular reference — use z.lazy()
        return z.lazy(() => {
          return refCache.get(ref) ?? convertNode(resolveRef(ref));
        });
      }
      refInProgress.add(ref);
      const resolved = resolveRef(ref);
      const result = convertNode(resolved);
      refCache.set(ref, result);
      refInProgress.delete(ref);
      return result;
    }

    // Handle oneOf/anyOf nullable pattern: [X, {type:"null"}]
    if (node.oneOf || node.anyOf) {
      const variants = node.oneOf ?? node.anyOf!;
      const nullVariant = variants.find(v => v.type === 'null');
      const nonNullVariants = variants.filter(v => v.type !== 'null');

      if (nullVariant && nonNullVariants.length === 1) {
        // nullable pattern
        return convertNode(nonNullVariants[0]).nullable();
      }
      if (nonNullVariants.length === 0) {
        return z.null();
      }
      const schemas = nonNullVariants.map(v => convertNode(v));
      let union: z.ZodTypeAny;
      if (schemas.length === 1) {
        union = schemas[0];
      } else {
        union = z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
      }
      return nullVariant ? union.nullable() : union;
    }

    // Handle allOf (intersection)
    if (node.allOf) {
      if (node.allOf.length === 1) {
        return convertNode(node.allOf[0]);
      }
      return node.allOf.reduce<z.ZodTypeAny>((acc, sub, i) => {
        const s = convertNode(sub);
        return i === 0 ? s : z.intersection(acc, s);
      }, z.never());
    }

    // Handle enum
    if (node.enum) {
      if (node.enum.every((v: any) => typeof v === 'string')) {
        return z.enum(node.enum as [string, ...string[]]);
      }
      // Mixed enum — use union of literals
      const literals = node.enum.map((v: any) => z.literal(v));
      if (literals.length === 1) return literals[0];
      return z.union(literals as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
    }

    // Handle const
    if (node.const !== undefined) {
      return z.literal(node.const);
    }

    // Handle type
    let schema: z.ZodTypeAny;
    const type = Array.isArray(node.type) ? node.type.find(t => t !== 'null') : node.type;
    const hasNullInType = Array.isArray(node.type) && node.type.includes('null');

    switch (type) {
      case 'string':
        schema = buildString(node);
        break;
      case 'number':
      case 'integer':
        schema = buildNumber(node, type === 'integer');
        break;
      case 'boolean':
        schema = z.boolean();
        break;
      case 'null':
        schema = z.null();
        break;
      case 'object':
        schema = buildObject(node);
        break;
      case 'array':
        schema = buildArray(node);
        break;
      default:
        // No type specified — could be any, or might have properties
        if (node.properties || node.additionalProperties !== undefined) {
          schema = buildObject(node);
        } else {
          schema = z.any();
        }
    }

    // Apply nullable (OpenAPI style or type-array style)
    if (node.nullable || hasNullInType) {
      schema = schema.nullable();
    }

    // Apply description
    if (node.description) {
      schema = schema.describe(node.description);
    }

    // Apply default
    if (node.default !== undefined) {
      schema = schema.default(node.default);
    }

    return schema;
  }

  function buildString(node: JsonSchema): z.ZodTypeAny {
    let s = z.string();

    // Format
    if (node.format) {
      switch (node.format) {
        case 'email': s = s.email(); break;
        case 'uri':
        case 'url': s = s.url(); break;
        case 'uuid': s = s.uuid(); break;
        case 'date-time': s = s.datetime(); break;
        case 'ipv4': s = s.ip({ version: 'v4' }); break;
        case 'ipv6': s = s.ip({ version: 'v6' }); break;
      }
    }

    // Constraints
    if (node.minLength !== undefined) s = s.min(node.minLength);
    if (node.maxLength !== undefined) s = s.max(node.maxLength);
    if (node.pattern) s = s.regex(new RegExp(node.pattern));

    return s;
  }

  function buildNumber(node: JsonSchema, isInteger: boolean): z.ZodTypeAny {
    let n = z.number();
    if (isInteger) n = n.int();

    // Draft-04 compat: boolean exclusiveMinimum/exclusiveMaximum
    const exMinIsBool = typeof node.exclusiveMinimum === 'boolean';
    const exMaxIsBool = typeof node.exclusiveMaximum === 'boolean';

    if (node.minimum !== undefined) {
      if (exMinIsBool && node.exclusiveMinimum === true) {
        n = n.gt(node.minimum);
      } else {
        n = n.min(node.minimum);
      }
    }
    if (node.maximum !== undefined) {
      if (exMaxIsBool && node.exclusiveMaximum === true) {
        n = n.lt(node.maximum);
      } else {
        n = n.max(node.maximum);
      }
    }

    // Draft-06+ numeric exclusiveMinimum/exclusiveMaximum
    if (typeof node.exclusiveMinimum === 'number') {
      n = n.gt(node.exclusiveMinimum);
    }
    if (typeof node.exclusiveMaximum === 'number') {
      n = n.lt(node.exclusiveMaximum);
    }

    if (node.multipleOf !== undefined) n = n.multipleOf(node.multipleOf);

    return n;
  }

  function buildObject(node: JsonSchema): z.ZodTypeAny {
    const props = node.properties;
    const required = new Set(node.required ?? []);

    if (!props && node.additionalProperties && typeof node.additionalProperties !== 'boolean') {
      // Pure record type
      return z.record(convertNode(node.additionalProperties));
    }

    if (!props) {
      if (node.additionalProperties === false) {
        return z.object({}).strict();
      }
      return z.record(z.any());
    }

    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [key, propSchema] of Object.entries(props)) {
      let propZod = convertNode(propSchema);
      if (!required.has(key)) {
        propZod = propZod.optional();
      }
      shape[key] = propZod;
    }

    let obj = z.object(shape);

    if (node.additionalProperties === false) {
      // strict mode
    } else if (node.additionalProperties && typeof node.additionalProperties !== 'boolean') {
      obj = obj.catchall(convertNode(node.additionalProperties)) as any;
    }

    return obj;
  }

  function buildArray(node: JsonSchema): z.ZodTypeAny {
    const itemSchema = node.items
      ? (Array.isArray(node.items) ? convertNode(node.items[0]) : convertNode(node.items))
      : z.any();

    let a = z.array(itemSchema);

    if (node.minItems !== undefined) a = a.min(node.minItems);
    if (node.maxItems !== undefined) a = a.max(node.maxItems);

    return a;
  }

  return convertNode(jsonSchema);
}
