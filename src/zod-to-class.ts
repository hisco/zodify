import { z } from 'zod';
import { ZodToClassOptions, ResolvedZodToClassOptions, ClassMetadata } from './types';
import { SchemaRegistry } from './schema-registry';
import { walkZodSchema } from './schema-walker';
import { handleProperty } from './handlers';
import { generateCode } from './code-generator';
import { generateRuntimeClass } from './class-generator';

/**
 * Convert a Zod schema to a runtime TypeScript class
 */
export function zodToClass<T extends z.ZodType>(
  schema: T,
  options: ZodToClassOptions = {}
): any {
  // Apply default options
  const opts: ResolvedZodToClassOptions = {
    className: 'GeneratedClass',
    includeValidators: true,
    includeTransformers: true,
    includeSwagger: false,
    includeGraphQL: false,
    graphqlType: 'ObjectType',
    exportClass: true,
    includeImports: true,
    ...options,
  };

  // Walk the schema and extract metadata
  const node = walkZodSchema(schema);

  // Build class metadata
  const metadata = buildClassMetadata(node, opts.className, opts.registry);

  // Generate runtime class
  return generateRuntimeClass(metadata, opts);
}

/**
 * Convert a Zod schema to TypeScript code string
 */
zodToClass.toCode = function <T extends z.ZodType>(
  schema: T,
  options: ZodToClassOptions = {}
): string {
  // Apply default options
  const opts: ResolvedZodToClassOptions = {
    className: 'GeneratedClass',
    includeValidators: true,
    includeTransformers: true,
    includeSwagger: false,
    includeGraphQL: false,
    graphqlType: 'ObjectType',
    exportClass: true,
    includeImports: true,
    ...options,
  };

  // Walk the schema and extract metadata
  const node = walkZodSchema(schema);

  // Build class metadata
  const metadata = buildClassMetadata(node, opts.className, opts.registry);

  // Generate code string
  return generateCode(metadata, opts);
};

/**
 * Build class metadata from a schema node
 */
function buildClassMetadata(node: any, className: string, registry?: SchemaRegistry): ClassMetadata {
  if (node.typeName !== 'ZodObject' || !node.shape) {
    throw new Error('zodToClass only supports object schemas at the root level');
  }

  const metadata: ClassMetadata = {
    name: className,
    properties: [],
    nestedClasses: [],
  };

  // Process each property in the object
  for (const [propertyName, propertyNode] of Object.entries(node.shape)) {
    const propMetadata = handleProperty(propertyName, propertyNode as any, className, registry);
    metadata.properties.push(propMetadata);

    // Collect nested classes
    if (propMetadata.nestedClass) {
      metadata.nestedClasses.push(propMetadata.nestedClass);
      // Recursively collect deeply nested classes
      metadata.nestedClasses.push(...propMetadata.nestedClass.nestedClasses);
    }
  }

  return metadata;
}
