import { PropertyMetadata, SchemaNode } from '../types';
import { handlePrimitive } from './primitive-handler';
import { handleObject } from './object-handler';
import { handleArray } from './array-handler';
import { handleEnum } from './enum-handler';
import { handleUnion } from './union-handler';
import { handleDiscriminatedUnion } from './discriminated-union-handler';

/**
 * Route to the appropriate handler based on schema type
 */
export function handleProperty(
  propertyName: string,
  node: SchemaNode,
  parentClassName: string
): PropertyMetadata {
  const typeName = node.typeName;

  switch (typeName) {
    case 'ZodString':
    case 'ZodNumber':
    case 'ZodBoolean':
    case 'ZodDate':
    case 'ZodLiteral':
      return handlePrimitive(propertyName, node);

    case 'ZodObject':
      return handleObject(propertyName, node, parentClassName);

    case 'ZodArray':
      return handleArray(propertyName, node, parentClassName);

    case 'ZodEnum':
    case 'ZodNativeEnum':
      return handleEnum(propertyName, node);

    case 'ZodUnion':
      return handleUnion(propertyName, node);

    case 'ZodDiscriminatedUnion':
      return handleDiscriminatedUnion(propertyName, node, parentClassName);

    case 'ZodRecord':
    case 'ZodMap':
      // For records and maps, treat as generic object
      return {
        name: propertyName,
        type: node.typeName === 'ZodRecord' ? 'Record<string, any>' : 'Map<any, any>',
        optional: node.isOptional,
        nullable: node.isNullable,
        validators: [],
        transformers: [{ name: 'Expose', source: 'class-transformer' }],
      };

    default:
      // Fallback for unsupported types
      return {
        name: propertyName,
        type: 'any',
        optional: node.isOptional,
        nullable: node.isNullable,
        validators: [],
        transformers: [{ name: 'Expose', source: 'class-transformer' }],
      };
  }
}

// Re-export handlers for external use if needed
export { handlePrimitive } from './primitive-handler';
export { handleObject } from './object-handler';
export { handleArray } from './array-handler';
export { handleEnum } from './enum-handler';
export { handleUnion } from './union-handler';
export { handleDiscriminatedUnion } from './discriminated-union-handler';
