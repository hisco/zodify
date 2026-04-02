import { z } from 'zod';
import { SchemaRegistry } from './schema-registry';

/**
 * Configuration options for zodToClass conversion
 */
export interface ZodToClassOptions {
  /** Generated class name */
  className?: string;

  /** Include class-validator decorators */
  includeValidators?: boolean;

  /** Include class-transformer decorators */
  includeTransformers?: boolean;

  /** Include @nestjs/swagger decorators (@ApiProperty / @ApiPropertyOptional) */
  includeSwagger?: boolean;

  /** Include @nestjs/graphql decorators (@Field, @ObjectType / @InputType) */
  includeGraphQL?: boolean;

  /** GraphQL class decorator type: 'ObjectType' (default) or 'InputType' */
  graphqlType?: 'ObjectType' | 'InputType';

  /** Export the class (for code generation) */
  exportClass?: boolean;

  /** Add imports to generated code */
  includeImports?: boolean;

  /** Schema registry for cross-type references (avoids inlining nested types) */
  registry?: SchemaRegistry;
}

/**
 * ZodToClassOptions with all non-registry fields required (internal use).
 */
export type ResolvedZodToClassOptions = Required<Omit<ZodToClassOptions, 'registry'>> & Pick<ZodToClassOptions, 'registry'>;

/**
 * Configuration options for classToZod conversion
 */
export interface ClassToZodOptions {
  /** Whether to use reflect-metadata as fallback for type detection */
  useReflectMetadata?: boolean;

  /** Cache for processed classes to handle circular references */
  classCache?: WeakMap<Function, z.ZodTypeAny>;

  /** Strict mode: throw on unknown properties or missing metadata */
  strict?: boolean;
}

/**
 * Source for decorator imports
 */
export type DecoratorSource = 'class-validator' | 'class-transformer' | 'nestjs-swagger' | 'nestjs-graphql';

/**
 * Metadata about a single decorator
 */
export interface DecoratorInfo {
  /** Decorator name (e.g., 'IsString', 'Expose') */
  name: string;

  /** Import source */
  source: DecoratorSource;

  /** Decorator arguments (e.g., for @Min(5), args = [5]) */
  args?: any[];

  /** Decorator options object (e.g., for @Type(() => Date, { keepDiscriminatorProperty: true })) */
  options?: Record<string, any>;
}

/**
 * Metadata about a single class property
 */
export interface PropertyMetadata {
  /** Property name */
  name: string;

  /** TypeScript type string */
  type: string;

  /** Is property optional */
  optional: boolean;

  /** Is property nullable */
  nullable: boolean;

  /** class-validator decorators */
  validators: DecoratorInfo[];

  /** class-transformer decorators */
  transformers: DecoratorInfo[];

  /** @nestjs/swagger decorators */
  swagger?: DecoratorInfo[];

  /** @nestjs/graphql decorators */
  graphql?: DecoratorInfo[];

  /** Reference to nested class (for z.object() properties) */
  nestedClass?: ClassMetadata;

  /** Original Zod item schema (for arrays with primitive item constraints) */
  itemSchema?: any;
}

/**
 * Metadata about a generated class
 */
export interface ClassMetadata {
  /** Class name */
  name: string;

  /** Properties */
  properties: PropertyMetadata[];

  /** Nested classes (for z.object() within z.object()) */
  nestedClasses: ClassMetadata[];

  /** Discriminated union metadata (if applicable) */
  discriminator?: {
    property: string;
    subTypes: Array<{ value: string; name: string }>;
  };
}

/**
 * Internal schema node representation
 */
export interface SchemaNode {
  /** Zod type name (e.g., 'ZodString', 'ZodObject') */
  typeName: string;

  /** Original Zod schema */
  schema: z.ZodTypeAny;

  /** Is this schema optional? */
  isOptional: boolean;

  /** Is this schema nullable? */
  isNullable: boolean;

  /** For objects: property schemas */
  shape?: Record<string, SchemaNode>;

  /** For arrays: item schema */
  itemSchema?: SchemaNode;

  /** For enums: enum values */
  enumValues?: any[];

  /** For unions: variant schemas */
  variants?: SchemaNode[];

  /** For discriminated unions: discriminator property name */
  discriminatorKey?: string;

  /** Checks/validators from Zod (min, max, email, etc.) */
  checks?: any[];

  /** Description from .describe() */
  description?: string;

  /** Default value from .default() */
  defaultValue?: any;

  /** Whether this schema has a default (to distinguish undefined default from no default) */
  hasDefault?: boolean;
}
