import { PropertyMetadata, ClassMetadata, SchemaNode } from '../types';
import { createDiscriminatorDecorator } from '../decorator-mapper';
import { toPascalCase } from '../utils';
import { handleProperty } from './index';

/**
 * Handle ZodDiscriminatedUnion type
 * Following klasik's pattern for discriminated unions
 */
export function handleDiscriminatedUnion(
  propertyName: string,
  node: SchemaNode,
  parentClassName: string
): PropertyMetadata {
  if (!node.discriminatorKey || !node.variants) {
    throw new Error('Discriminated union missing discriminator key or variants');
  }

  const discriminatorKey = node.discriminatorKey;
  const nestedClasses: ClassMetadata[] = [];
  const subTypes: Array<{ value: string; name: string }> = [];
  const variantTypeNames: string[] = [];

  // Process each variant
  for (const variant of node.variants) {
    if (variant.typeName !== 'ZodObject' || !variant.shape) {
      throw new Error('Discriminated union variants must be objects');
    }

    // Extract the discriminator value from the variant
    const discriminatorValueNode = variant.shape[discriminatorKey];
    if (!discriminatorValueNode || discriminatorValueNode.typeName !== 'ZodLiteral') {
      throw new Error(
        `Discriminator property "${discriminatorKey}" must be a literal in all variants`
      );
    }

    const discriminatorValue = (discriminatorValueNode.schema as any)._def.value;
    const variantClassName = `${parentClassName}${toPascalCase(propertyName)}${toPascalCase(
      String(discriminatorValue)
    )}`;

    variantTypeNames.push(variantClassName);
    subTypes.push({
      value: variantClassName,
      name: String(discriminatorValue),
    });

    // Create class metadata for this variant
    const variantClass: ClassMetadata = {
      name: variantClassName,
      properties: [],
      nestedClasses: [],
    };

    // Process all properties of the variant
    for (const [key, childNode] of Object.entries(variant.shape)) {
      const propMetadata = handleProperty(key, childNode, variantClassName);
      variantClass.properties.push(propMetadata);

      if (propMetadata.nestedClass) {
        variantClass.nestedClasses.push(propMetadata.nestedClass);
        variantClass.nestedClasses.push(...propMetadata.nestedClass.nestedClasses);
      }
    }

    nestedClasses.push(variantClass);
  }

  // Create the union type string
  const unionType = variantTypeNames.join(' | ');

  // Create the discriminator decorator (following klasik pattern)
  const discriminatorDecorator = createDiscriminatorDecorator(discriminatorKey, subTypes);

  return {
    name: propertyName,
    type: unionType,
    optional: node.isOptional,
    nullable: node.isNullable,
    validators: [],
    transformers: [
      { name: 'Expose', source: 'class-transformer' },
      discriminatorDecorator,
    ],
    nestedClass: {
      name: `${parentClassName}${toPascalCase(propertyName)}Variants`,
      properties: [],
      nestedClasses: nestedClasses,
    },
  };
}
