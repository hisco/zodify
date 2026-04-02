import { z } from 'zod';

/**
 * Registry for named Zod schemas, enabling cross-type references in codegen and runtime.
 *
 * When generating code or runtime classes, nested z.object() schemas that match
 * a registered schema (by reference identity) will use the registered name
 * instead of auto-generating an inlined class name.
 */
export class SchemaRegistry {
  private entries = new Map<z.ZodTypeAny, { name: string; classRef?: any }>();

  /**
   * Register a named schema.
   * @param name - The class name to use when referencing this schema
   * @param schema - The Zod schema (matched by reference identity)
   * @param classRef - Optional pre-generated class constructor (for runtime mode)
   */
  register(name: string, schema: z.ZodTypeAny, classRef?: any): this {
    this.entries.set(schema, { name, classRef });
    return this;
  }

  /**
   * Look up a schema by reference identity.
   * Returns the registered name and optional class reference, or undefined if not registered.
   */
  lookup(schema: z.ZodTypeAny): { name: string; classRef?: any } | undefined {
    return this.entries.get(schema);
  }

  /**
   * Check if a schema is registered.
   */
  has(schema: z.ZodTypeAny): boolean {
    return this.entries.has(schema);
  }

  /**
   * Get all registered class references (for runtime class generation).
   * Returns a map of name → classRef for entries that have a classRef.
   */
  getClassRefs(): Map<string, any> {
    const result = new Map<string, any>();
    for (const [, { name, classRef }] of this.entries) {
      if (classRef) {
        result.set(name, classRef);
      }
    }
    return result;
  }
}
