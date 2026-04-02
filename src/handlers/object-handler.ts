import { PropertyMetadata, ClassMetadata, SchemaNode } from '../types';
import { SchemaRegistry } from '../schema-registry';
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
  parentClassName: string,
  registry?: SchemaRegistry
): PropertyMetadata {
  // Check if this schema is registered — if so, reference it instead of inlining
  const registered = registry?.lookup(node.schema);
  if (registered) {
    return {
      name: propertyName,
      type: registered.name,
      optional: node.isOptional,
      nullable: node.isNullable,
      validators: mapZodToValidators(node),
      transformers: mapZodToTransformers(node, registered.name),
      swagger: mapZodToSwagger(node, registered.name),
      graphql: mapZodToGraphQL(node, registered.name),
      // No nestedClass — it's defined externally
    };
  }

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
      const propMetadata = handleProperty(key, childNode, nestedClassName, registry);
      nestedClass.properties.push(propMetadata);

      // Collect nested classes — deepest first for correct codegen order
      if (propMetadata.nestedClass) {
        nestedClass.nestedClasses.push(...propMetadata.nestedClass.nestedClasses);
        nestedClass.nestedClasses.push(propMetadata.nestedClass);
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
