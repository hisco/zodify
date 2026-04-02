import { z } from 'zod';
import zodToJsonSchemaLib from 'zod-to-json-schema';
import type { JsonSchema, ZodToJsonSchemaOptions } from './types';

/**
 * Convert a Zod schema to JSON Schema (Draft-07 by default).
 *
 * Thin wrapper over `zod-to-json-schema` with a unified API.
 */
export function zodToJsonSchema(
  schema: z.ZodTypeAny,
  options?: ZodToJsonSchemaOptions,
): JsonSchema {
  const opts: Record<string, any> = {
    target: options?.target === 'openApi3' ? 'openApi3' : 'jsonSchema7',
  };
  if (options?.name) {
    opts.name = options.name;
    opts.nameStrategy = 'title';
  }
  if (options?.basePath) {
    opts.basePath = options.basePath;
  }
  if (options?.definitions !== undefined) {
    opts.$refStrategy = options.definitions ? 'root' : 'none';
  }
  const result = (zodToJsonSchemaLib as any)(schema, opts);
  return result as JsonSchema;
}
