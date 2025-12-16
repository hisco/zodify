import { PropertyMetadata, SchemaNode } from '../types';
import { mapZodToValidators, mapZodToTransformers } from '../decorator-mapper';

/**
 * Handle ZodEnum and ZodNativeEnum types
 */
export function handleEnum(
  propertyName: string,
  node: SchemaNode
): PropertyMetadata {
  if (!node.enumValues) {
    throw new Error('Enum node missing enumValues');
  }

  // For ZodEnum, create a union type string
  const typeString = node.enumValues
    .map((val) => (typeof val === 'string' ? `'${val}'` : String(val)))
    .join(' | ');

  return {
    name: propertyName,
    type: typeString,
    optional: node.isOptional,
    nullable: node.isNullable,
    validators: mapZodToValidators(node),
    transformers: mapZodToTransformers(node),
  };
}
