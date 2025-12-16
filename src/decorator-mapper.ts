import { z } from 'zod';
import { DecoratorInfo, SchemaNode } from './types';
import { getZodTypeName, getCheck, hasCheck } from './utils';

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Map Zod schema to class-validator decorators
 */
export function mapZodToValidators(node: SchemaNode): DecoratorInfo[] {
  const decorators: DecoratorInfo[] = [];
  const typeName = node.typeName;

  // Add optional decorator if needed
  if (node.isOptional) {
    decorators.push({
      name: 'IsOptional',
      source: 'class-validator',
    });
  }

  // For nullable properties, we need to allow null values
  // We skip base type validators and only add constraint validators
  const skipBaseValidators = node.isNullable;

  // Type-specific validators
  switch (typeName) {
    case 'ZodString':
      decorators.push(...mapStringValidators(node, skipBaseValidators));
      break;

    case 'ZodNumber':
      decorators.push(...mapNumberValidators(node, skipBaseValidators));
      break;

    case 'ZodBoolean':
      if (!skipBaseValidators) {
        decorators.push({
          name: 'IsBoolean',
          source: 'class-validator',
        });
      }
      break;

    case 'ZodDate':
      if (!skipBaseValidators) {
        decorators.push({
          name: 'IsDate',
          source: 'class-validator',
        });
      }

      // Date range constraints
      const dateChecks = node.checks || [];
      for (const check of dateChecks) {
        if (check.kind === 'min') {
          decorators.push({
            name: 'MinDate',
            source: 'class-validator',
            args: [check.value],
          });
        } else if (check.kind === 'max') {
          decorators.push({
            name: 'MaxDate',
            source: 'class-validator',
            args: [check.value],
          });
        }
      }
      break;

    case 'ZodArray':
      if (!skipBaseValidators) {
        decorators.push({
          name: 'IsArray',
          source: 'class-validator',
        });

        // If array items are objects, add @ValidateNested() to validate nested items
        if (node.itemSchema?.typeName === 'ZodObject') {
          decorators.push({
            name: 'ValidateNested',
            source: 'class-validator',
            options: { each: true },
          });
        }
      }

      // Array length constraints
      const arrayChecks = node.checks || [];
      for (const check of arrayChecks) {
        if (check.kind === 'min') {
          decorators.push({
            name: 'ArrayMinSize',
            source: 'class-validator',
            args: [check.value],
          });
        } else if (check.kind === 'max') {
          decorators.push({
            name: 'ArrayMaxSize',
            source: 'class-validator',
            args: [check.value],
          });
        } else if (check.kind === 'length') {
          // Exact array length
          decorators.push({
            name: 'ArrayMinSize',
            source: 'class-validator',
            args: [check.value],
          });
          decorators.push({
            name: 'ArrayMaxSize',
            source: 'class-validator',
            args: [check.value],
          });
        }
      }

      // Note: Array item validators are applied to the item class
      break;

    case 'ZodEnum':
      if (node.enumValues && !skipBaseValidators) {
        decorators.push({
          name: 'IsEnum',
          source: 'class-validator',
          args: [node.enumValues],
        });
      }
      break;

    case 'ZodNativeEnum':
      if (node.enumValues && !skipBaseValidators) {
        decorators.push({
          name: 'IsEnum',
          source: 'class-validator',
          args: [node.enumValues],
        });
      }
      break;

    case 'ZodObject':
      // For nested objects, add @ValidateNested() so class-validator validates nested properties
      if (!skipBaseValidators) {
        decorators.push({
          name: 'ValidateNested',
          source: 'class-validator',
        });
      }
      break;

    default:
      // No specific validator for other types
      break;
  }

  return decorators;
}

/**
 * Map ZodString validators to class-validator decorators
 */
function mapStringValidators(node: SchemaNode, skipBaseValidator = false): DecoratorInfo[] {
  const decorators: DecoratorInfo[] = [];

  // Add base type validator only if not skipping
  if (!skipBaseValidator) {
    decorators.push({
      name: 'IsString',
      source: 'class-validator',
    });
  }

  const checks = node.checks || [];

  for (const check of checks) {
    switch (check.kind) {
      case 'email':
        decorators.push({
          name: 'IsEmail',
          source: 'class-validator',
        });
        break;

      case 'uuid':
        decorators.push({
          name: 'IsUUID',
          source: 'class-validator',
        });
        break;

      case 'url':
        decorators.push({
          name: 'IsUrl',
          source: 'class-validator',
        });
        break;

      case 'min':
        decorators.push({
          name: 'MinLength',
          source: 'class-validator',
          args: [check.value],
        });
        break;

      case 'max':
        decorators.push({
          name: 'MaxLength',
          source: 'class-validator',
          args: [check.value],
        });
        break;

      case 'length':
        decorators.push({
          name: 'Length',
          source: 'class-validator',
          args: [check.value, check.value],
        });
        break;

      case 'regex':
        decorators.push({
          name: 'Matches',
          source: 'class-validator',
          args: [check.regex],
        });
        break;

      case 'cuid':
        // class-validator doesn't have @IsCUID(), so we use a regex
        decorators.push({
          name: 'Matches',
          source: 'class-validator',
          args: [/^c[^\s-]{8,}$/i],
        });
        break;

      case 'cuid2':
        // CUID2 format validator
        decorators.push({
          name: 'Matches',
          source: 'class-validator',
          args: [/^[0-9a-z]+$/],
        });
        break;

      case 'datetime':
        decorators.push({
          name: 'IsDateString',
          source: 'class-validator',
        });
        break;

      case 'ip':
        decorators.push({
          name: 'IsIP',
          source: 'class-validator',
        });
        break;

      case 'startsWith':
        // Map to regex pattern: ^prefix
        decorators.push({
          name: 'Matches',
          source: 'class-validator',
          args: [new RegExp(`^${escapeRegExp(check.value)}`)],
        });
        break;

      case 'endsWith':
        // Map to regex pattern: suffix$
        decorators.push({
          name: 'Matches',
          source: 'class-validator',
          args: [new RegExp(`${escapeRegExp(check.value)}$`)],
        });
        break;

      case 'includes':
        decorators.push({
          name: 'Contains',
          source: 'class-validator',
          args: [check.value],
        });
        break;

      case 'emoji':
        // No direct class-validator equivalent
        break;

      case 'base64':
        decorators.push({
          name: 'IsBase64',
          source: 'class-validator',
        });
        break;

      case 'base64url':
        // class-validator doesn't distinguish base64url, use base64
        decorators.push({
          name: 'IsBase64',
          source: 'class-validator',
        });
        break;

      case 'hex':
        decorators.push({
          name: 'IsHexadecimal',
          source: 'class-validator',
        });
        break;

      case 'jwt':
        decorators.push({
          name: 'IsJWT',
          source: 'class-validator',
        });
        break;

      case 'nanoid':
        // class-validator doesn't have @IsNanoid(), use regex pattern
        decorators.push({
          name: 'Matches',
          source: 'class-validator',
          args: [/^[A-Za-z0-9_-]{21}$/],
        });
        break;

      case 'ulid':
        // class-validator doesn't have @IsUlid(), use regex pattern
        decorators.push({
          name: 'Matches',
          source: 'class-validator',
          args: [/^[0-9A-HJKMNP-TV-Z]{26}$/],
        });
        break;

      default:
        // Ignore other checks
        break;
    }
  }

  return decorators;
}

/**
 * Map ZodNumber validators to class-validator decorators
 */
function mapNumberValidators(node: SchemaNode, skipBaseValidator = false): DecoratorInfo[] {
  const decorators: DecoratorInfo[] = [];
  const checks = node.checks || [];

  // Check if it's an integer
  const isInt = hasCheck(node.schema, 'int');

  // Check for positive/negative (min/max with value 0 and inclusive: false)
  const isPositive = checks.some(c => c.kind === 'min' && c.value === 0 && c.inclusive === false);
  const isNegative = checks.some(c => c.kind === 'max' && c.value === 0 && c.inclusive === false);

  // Add base type validator only if not skipping
  if (!skipBaseValidator) {
    if (isInt) {
      decorators.push({
        name: 'IsInt',
        source: 'class-validator',
      });
    } else {
      decorators.push({
        name: 'IsNumber',
        source: 'class-validator',
      });
    }
  }

  // Add positive/negative validators first (more specific than min/max)
  if (isPositive) {
    decorators.push({
      name: 'IsPositive',
      source: 'class-validator',
    });
  }

  if (isNegative) {
    decorators.push({
      name: 'IsNegative',
      source: 'class-validator',
    });
  }

  for (const check of checks) {
    switch (check.kind) {
      case 'min':
        // Skip if this is the positive check (min 0 exclusive)
        if (check.value === 0 && check.inclusive === false) {
          break;
        }
        decorators.push({
          name: 'Min',
          source: 'class-validator',
          args: [check.value],
        });
        break;

      case 'max':
        // Skip if this is the negative check (max 0 exclusive)
        if (check.value === 0 && check.inclusive === false) {
          break;
        }
        decorators.push({
          name: 'Max',
          source: 'class-validator',
          args: [check.value],
        });
        break;

      case 'multipleOf':
        decorators.push({
          name: 'IsDivisibleBy',
          source: 'class-validator',
          args: [check.value],
        });
        break;

      default:
        // Ignore other checks
        break;
    }
  }

  return decorators;
}

/**
 * Map Zod schema to class-transformer decorators
 */
export function mapZodToTransformers(
  node: SchemaNode,
  nestedClassName?: string
): DecoratorInfo[] {
  const decorators: DecoratorInfo[] = [];
  const typeName = node.typeName;

  // Always add @Expose() for serialization
  decorators.push({
    name: 'Expose',
    source: 'class-transformer',
  });

  // Type-specific transformers
  switch (typeName) {
    case 'ZodDate':
      decorators.push({
        name: 'Type',
        source: 'class-transformer',
        args: ['() => Date'],
      });
      break;

    case 'ZodObject':
      if (nestedClassName) {
        decorators.push({
          name: 'Type',
          source: 'class-transformer',
          args: [`() => ${nestedClassName}`],
        });
      }
      break;

    case 'ZodArray':
      if (node.itemSchema?.typeName === 'ZodObject' && nestedClassName) {
        decorators.push({
          name: 'Type',
          source: 'class-transformer',
          args: [`() => ${nestedClassName}`],
        });
      }
      break;

    default:
      // No specific transformer for other types
      break;
  }

  return decorators;
}

/**
 * Create discriminator decorator for discriminated unions
 */
export function createDiscriminatorDecorator(
  discriminatorKey: string,
  subTypes: Array<{ value: string; name: string }>
): DecoratorInfo {
  return {
    name: 'Type',
    source: 'class-transformer',
    args: ['() => Object'],
    options: {
      discriminator: {
        property: discriminatorKey,
        subTypes: subTypes,
      },
      keepDiscriminatorProperty: true,
    },
  };
}
