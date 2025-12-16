import { PropertyMetadata, SchemaNode } from '../types';
import { mapZodToValidators, mapZodToTransformers } from '../decorator-mapper';
import { getTypeScriptType } from '../utils';

/**
 * Handle primitive Zod types: string, number, boolean, date
 */
export function handlePrimitive(
  propertyName: string,
  node: SchemaNode
): PropertyMetadata {
  const typeScriptType = getTypeScriptType(node.schema);

  return {
    name: propertyName,
    type: typeScriptType,
    optional: node.isOptional,
    nullable: node.isNullable,
    validators: mapZodToValidators(node),
    transformers: mapZodToTransformers(node),
  };
}
