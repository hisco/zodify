import { DecoratorInfo, SchemaNode } from './types';

/**
 * Map Zod schema node to @nestjs/swagger decorator(s).
 *
 * Returns a single-element array containing either
 *   @ApiProperty({...})   or   @ApiPropertyOptional({...})
 */
export function mapZodToSwagger(
  node: SchemaNode,
  nestedClassName?: string
): DecoratorInfo[] {
  const isOptional = node.isOptional;
  const decoratorName = isOptional ? 'ApiPropertyOptional' : 'ApiProperty';

  const opts: Record<string, any> = {};

  // --- type ---
  const swaggerType = getSwaggerType(node, nestedClassName);
  if (swaggerType !== undefined) {
    opts.type = swaggerType;
  }

  // --- isArray ---
  if (node.typeName === 'ZodArray') {
    opts.isArray = true;
  }

  // --- nullable ---
  if (node.isNullable) {
    opts.nullable = true;
  }

  // --- description ---
  if (node.description) {
    opts.description = node.description;
  }

  // --- default ---
  if (node.hasDefault) {
    opts.default = node.defaultValue;
  }

  // --- enum ---
  if ((node.typeName === 'ZodEnum' || node.typeName === 'ZodNativeEnum') && node.enumValues) {
    opts.enum = node.enumValues;
  }

  // --- constraints from checks ---
  addConstraints(opts, node);

  return [
    {
      name: decoratorName,
      source: 'nestjs-swagger',
      options: Object.keys(opts).length > 0 ? opts : undefined,
    },
  ];
}

/**
 * Map SchemaNode to the Swagger `type` option value.
 * Returns a string that the code generator will emit verbatim (e.g. "String", "() => Address").
 */
function getSwaggerType(node: SchemaNode, nestedClassName?: string): string | undefined {
  const typeName = node.typeName;

  switch (typeName) {
    case 'ZodString':
      return 'String';
    case 'ZodNumber':
      return 'Number';
    case 'ZodBoolean':
      return 'Boolean';
    case 'ZodDate':
      return 'Date';
    case 'ZodObject':
      return nestedClassName ? `() => ${nestedClassName}` : 'Object';
    case 'ZodArray': {
      if (!node.itemSchema) return undefined;
      const itemType = getSwaggerType(node.itemSchema, nestedClassName);
      return itemType;
    }
    case 'ZodEnum':
    case 'ZodNativeEnum':
      return 'String'; // enum values conveyed separately
    case 'ZodRecord':
    case 'ZodMap':
      return 'Object';
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion':
      return 'Object';
    default:
      return undefined;
  }
}

/**
 * Extract numeric / string / array constraints from Zod checks
 * and add them to the @ApiProperty options.
 */
function addConstraints(opts: Record<string, any>, node: SchemaNode): void {
  const checks = node.checks || [];
  const typeName = node.typeName;

  for (const check of checks) {
    switch (check.kind) {
      // --- string constraints ---
      case 'min':
        if (typeName === 'ZodString') {
          opts.minLength = check.value;
        } else if (typeName === 'ZodNumber') {
          opts.minimum = check.value;
          if (check.inclusive === false) opts.exclusiveMinimum = true;
        } else if (typeName === 'ZodArray') {
          opts.minItems = check.value;
        }
        break;

      case 'max':
        if (typeName === 'ZodString') {
          opts.maxLength = check.value;
        } else if (typeName === 'ZodNumber') {
          opts.maximum = check.value;
          if (check.inclusive === false) opts.exclusiveMaximum = true;
        } else if (typeName === 'ZodArray') {
          opts.maxItems = check.value;
        }
        break;

      case 'length':
        if (typeName === 'ZodString') {
          opts.minLength = check.value;
          opts.maxLength = check.value;
        } else if (typeName === 'ZodArray') {
          opts.minItems = check.value;
          opts.maxItems = check.value;
        }
        break;

      case 'regex':
        opts.pattern = check.regex.source;
        break;

      case 'email':
        opts.format = 'email';
        break;

      case 'uuid':
        opts.format = 'uuid';
        break;

      case 'url':
        opts.format = 'uri';
        break;

      case 'datetime':
        opts.format = 'date-time';
        break;

      case 'ip':
        opts.format = check.version === 'v6' ? 'ipv6' : 'ipv4';
        break;

      case 'int':
        // Already captured by type Number; no additional field needed
        break;

      case 'multipleOf':
        opts.multipleOf = check.value;
        break;

      default:
        break;
    }
  }
}
