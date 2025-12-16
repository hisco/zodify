import { PropertyMetadata, SchemaNode } from '../types';
import { mapZodToTransformers } from '../decorator-mapper';
import { getTypeScriptType } from '../utils';

/**
 * Handle ZodUnion type
 * Note: This is for simple unions, not discriminated unions
 */
export function handleUnion(
  propertyName: string,
  node: SchemaNode
): PropertyMetadata {
  if (!node.variants) {
    throw new Error('Union node missing variants');
  }

  // Create a TypeScript union type string
  const typeStrings = node.variants.map((variant) =>
    getTypeScriptType(variant.schema)
  );
  const typeString = typeStrings.join(' | ');

  // For simple unions with literal values, we can use @IsIn validator
  const allLiterals = node.variants.every((v) => v.typeName === 'ZodLiteral');
  const validators = [];

  if (allLiterals) {
    const values = node.variants.map((v) => (v.schema as any)._def.value);
    validators.push({
      name: 'IsIn',
      source: 'class-validator' as const,
      args: [values],
    });
  }

  return {
    name: propertyName,
    type: typeString,
    optional: node.isOptional,
    nullable: node.isNullable,
    validators,
    transformers: mapZodToTransformers(node),
  };
}
