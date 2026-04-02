/**
 * zodify - Bidirectional conversion between Zod schemas and TypeScript classes
 *
 * @packageDocumentation
 */

// Main conversion functions
export { zodToClass } from './zod-to-class';
export { classToZod } from './class-to-zod';
export { SchemaRegistry } from './schema-registry';

// Configuration options
export type {
  ZodToClassOptions,
  ClassToZodOptions
} from './types';

// Metadata types (useful for advanced usage)
export type {
  DecoratorInfo,
  DecoratorSource,
  PropertyMetadata,
  ClassMetadata,
  SchemaNode
} from './types';

// Re-export Zod for convenience
export { z } from 'zod';
