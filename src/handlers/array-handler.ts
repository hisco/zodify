import { PropertyMetadata, ClassMetadata, SchemaNode } from '../types';
import { SchemaRegistry } from '../schema-registry';
import { mapZodToValidators, mapZodToTransformers } from '../decorator-mapper';
import { mapZodToSwagger } from '../swagger-mapper';
import { mapZodToGraphQL } from '../graphql-mapper';
import { toPascalCase, getTypeScriptType } from '../utils';
import { handleProperty } from './index';
import { setItemSchema } from '../metadata-storage';

/**
 * Handle ZodArray type
 */
export function handleArray(
  propertyName: string,
  node: SchemaNode,
  parentClassName: string,
  registry?: SchemaRegistry
): PropertyMetadata {
  if (!node.itemSchema) {
    throw new Error('Array node missing itemSchema');
  }

  const itemNode = node.itemSchema;
  const itemTypeName = itemNode.typeName;

  // If array items are objects, create a nested class for the item type
  if (itemTypeName === 'ZodObject') {
    // Check if the item schema is registered
    const registered = registry?.lookup(itemNode.schema);
    if (registered) {
      const itemClassName = registered.name;
      return {
        name: propertyName,
        type: `${itemClassName}[]`,
        optional: node.isOptional,
        nullable: node.isNullable,
        validators: mapZodToValidators(node),
        transformers: [
          { name: 'Expose', source: 'class-transformer' },
          { name: 'Type', source: 'class-transformer', args: [`() => ${itemClassName}`] },
        ],
        swagger: mapZodToSwagger(node, itemClassName),
        graphql: mapZodToGraphQL(node, itemClassName),
        // No nestedClass — it's defined externally
      };
    }

    const itemClassName = `${parentClassName}${toPascalCase(propertyName)}Item`;

    // Create nested class for array items
    const nestedClass: ClassMetadata = {
      name: itemClassName,
      properties: [],
      nestedClasses: [],
    };

    if (itemNode.shape) {
      for (const [key, childNode] of Object.entries(itemNode.shape)) {
        const propMetadata = handleProperty(key, childNode, itemClassName, registry);
        nestedClass.properties.push(propMetadata);

        if (propMetadata.nestedClass) {
          nestedClass.nestedClasses.push(...propMetadata.nestedClass.nestedClasses);
          nestedClass.nestedClasses.push(propMetadata.nestedClass);
        }
      }
    }

    return {
      name: propertyName,
      type: `${itemClassName}[]`,
      optional: node.isOptional,
      nullable: node.isNullable,
      validators: mapZodToValidators(node),
      transformers: [
        { name: 'Expose', source: 'class-transformer' },
        { name: 'Type', source: 'class-transformer', args: [`() => ${itemClassName}`] },
      ],
      swagger: mapZodToSwagger(node, itemClassName),
      graphql: mapZodToGraphQL(node, itemClassName),
      nestedClass,
    };
  }

  // For primitive arrays, no nested class needed
  const itemType = getTypeScriptType(itemNode.schema);

  // Check if the item has constraints (checks array is not empty)
  // If so, store the item schema for round-trip preservation
  const hasItemConstraints = itemNode.checks && itemNode.checks.length > 0;

  return {
    name: propertyName,
    type: `${itemType}[]`,
    optional: node.isOptional,
    nullable: node.isNullable,
    validators: mapZodToValidators(node),
    transformers: mapZodToTransformers(node),
    swagger: mapZodToSwagger(node),
    graphql: mapZodToGraphQL(node),
    itemSchema: hasItemConstraints ? itemNode.schema : undefined,
  };
}
