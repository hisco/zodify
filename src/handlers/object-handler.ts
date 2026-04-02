import { PropertyMetadata, ClassMetadata, SchemaNode } from '../types';
import { mapZodToValidators, mapZodToTransformers } from '../decorator-mapper';
import { mapZodToSwagger } from '../swagger-mapper';
import { mapZodToGraphQL } from '../graphql-mapper';
import { toPascalCase } from '../utils';
import { handleProperty } from './index';

/**
 * Handle ZodObject type - creates nested class metadata
 */
export function handleObject(
  propertyName: string,
  node: SchemaNode,
  parentClassName: string
): PropertyMetadata {
  const nestedClassName = `${parentClassName}${toPascalCase(propertyName)}`;

  // Create nested class metadata
  const nestedClass: ClassMetadata = {
    name: nestedClassName,
    properties: [],
    nestedClasses: [],
  };

  // Process each property in the object shape
  if (node.shape) {
    for (const [key, childNode] of Object.entries(node.shape)) {
      const propMetadata = handleProperty(key, childNode, nestedClassName);
      nestedClass.properties.push(propMetadata);

      // Collect nested classes
      if (propMetadata.nestedClass) {
        nestedClass.nestedClasses.push(propMetadata.nestedClass);
        // Recursively collect deeply nested classes
        nestedClass.nestedClasses.push(...propMetadata.nestedClass.nestedClasses);
      }
    }
  }

  return {
    name: propertyName,
    type: nestedClassName,
    optional: node.isOptional,
    nullable: node.isNullable,
    validators: mapZodToValidators(node),
    transformers: mapZodToTransformers(node, nestedClassName),
    swagger: mapZodToSwagger(node, nestedClassName),
    graphql: mapZodToGraphQL(node, nestedClassName),
    nestedClass,
  };
}
