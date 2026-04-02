import { DecoratorInfo, SchemaNode } from './types';
import { hasCheck } from './utils';

/**
 * Map Zod schema node to @nestjs/graphql decorator(s).
 *
 * Returns an array containing @Field() decorator(s) with appropriate
 * type function and options.
 */
export function mapZodToGraphQL(
  node: SchemaNode,
  nestedClassName?: string
): DecoratorInfo[] {
  const opts: Record<string, any> = {};

  // --- nullable ---
  if (node.isOptional || node.isNullable) {
    opts.nullable = true;
  }

  // --- description ---
  if (node.description) {
    opts.description = node.description;
  }

  // --- defaultValue ---
  if (node.hasDefault) {
    opts.defaultValue = node.defaultValue;
  }

  // --- type function arg ---
  const typeArg = getGraphQLTypeArg(node, nestedClassName);

  const args: any[] = [];
  if (typeArg !== undefined) {
    args.push(typeArg);
  }

  return [
    {
      name: 'Field',
      source: 'nestjs-graphql',
      args: args.length > 0 ? args : undefined,
      options: Object.keys(opts).length > 0 ? opts : undefined,
    },
  ];
}

/**
 * Map SchemaNode to the GraphQL type function argument.
 * Returns a string that the code generator will emit verbatim
 * (e.g. "() => String", "() => [UserAddress]", "() => Int").
 */
function getGraphQLTypeArg(node: SchemaNode, nestedClassName?: string): string | undefined {
  const typeName = node.typeName;

  switch (typeName) {
    case 'ZodString':
      return '() => String';
    case 'ZodNumber': {
      const isInt = hasCheck(node.schema, 'int');
      return isInt ? '() => Int' : '() => Float';
    }
    case 'ZodBoolean':
      return '() => Boolean';
    case 'ZodDate':
      return '() => Date';
    case 'ZodObject':
      return nestedClassName ? `() => ${nestedClassName}` : '() => Object';
    case 'ZodArray': {
      if (!node.itemSchema) return undefined;
      const itemType = getGraphQLItemType(node.itemSchema, nestedClassName);
      return itemType ? `() => [${itemType}]` : undefined;
    }
    case 'ZodEnum':
    case 'ZodNativeEnum':
      // Enums in GraphQL need registerEnumType — emit String as fallback
      return '() => String';
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion':
      return '() => Object';
    default:
      return undefined;
  }
}

/**
 * Get the inner type name for array items (without the arrow function wrapper).
 */
function getGraphQLItemType(itemNode: SchemaNode, nestedClassName?: string): string | undefined {
  switch (itemNode.typeName) {
    case 'ZodString':
      return 'String';
    case 'ZodNumber': {
      const isInt = hasCheck(itemNode.schema, 'int');
      return isInt ? 'Int' : 'Float';
    }
    case 'ZodBoolean':
      return 'Boolean';
    case 'ZodDate':
      return 'Date';
    case 'ZodObject':
      return nestedClassName || 'Object';
    case 'ZodEnum':
    case 'ZodNativeEnum':
      return 'String';
    default:
      return 'Object';
  }
}
