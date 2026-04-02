import { ClassMetadata, PropertyMetadata, DecoratorInfo, ResolvedZodToClassOptions } from './types';

/**
 * Generate TypeScript code string from class metadata
 */
export function generateCode(
  metadata: ClassMetadata,
  options: ResolvedZodToClassOptions
): string {
  const parts: string[] = [];

  // Generate imports if requested
  if (options.includeImports) {
    parts.push(generateImports(metadata, options));
    parts.push('');
  }

  // Generate nested classes first (they need to be defined before use)
  for (const nestedClass of metadata.nestedClasses) {
    parts.push(generateClassCode(nestedClass, options));
    parts.push('');
  }

  // Generate main class
  parts.push(generateClassCode(metadata, options));

  return parts.join('\n');
}

/**
 * Generate import statements
 */
function generateImports(
  metadata: ClassMetadata,
  options: ResolvedZodToClassOptions
): string {
  const imports = new Set<string>();
  const classTransformerImports = new Set<string>();
  const classValidatorImports = new Set<string>();

  const swaggerImports = new Set<string>();
  const graphqlImports = new Set<string>();

  // Collect decorators from all properties (including nested classes)
  const collectDecorators = (classMeta: ClassMetadata) => {
    for (const prop of classMeta.properties) {
      if (options.includeValidators) {
        for (const dec of prop.validators) {
          if (dec.source === 'class-validator') {
            classValidatorImports.add(dec.name);
          }
        }
      }

      if (options.includeTransformers) {
        for (const dec of prop.transformers) {
          if (dec.source === 'class-transformer') {
            classTransformerImports.add(dec.name);
          }
        }
      }

      if (options.includeSwagger && prop.swagger) {
        for (const dec of prop.swagger) {
          if (dec.source === 'nestjs-swagger') {
            swaggerImports.add(dec.name);
          }
        }
      }

      if (options.includeGraphQL && prop.graphql) {
        for (const dec of prop.graphql) {
          if (dec.source === 'nestjs-graphql') {
            graphqlImports.add(dec.name);
          }
        }
      }
    }

    // Recursively collect from nested classes
    for (const nested of classMeta.nestedClasses) {
      collectDecorators(nested);
    }
  };

  collectDecorators(metadata);

  // Add GraphQL class-level decorator
  if (options.includeGraphQL) {
    graphqlImports.add(options.graphqlType);
  }

  // Scan for Int/Float usage in graphql decorator args to add scalar imports
  if (options.includeGraphQL) {
    const scanForScalars = (classMeta: ClassMetadata) => {
      for (const prop of classMeta.properties) {
        if (prop.graphql) {
          for (const dec of prop.graphql) {
            const allArgs = (dec.args || []).join(' ');
            if (/\bInt\b/.test(allArgs)) graphqlImports.add('Int');
            if (/\bFloat\b/.test(allArgs)) graphqlImports.add('Float');
          }
        }
      }
      for (const nested of classMeta.nestedClasses) {
        scanForScalars(nested);
      }
    };
    scanForScalars(metadata);
  }

  // Generate import statements
  if (graphqlImports.size > 0) {
    const names = Array.from(graphqlImports).sort().join(', ');
    imports.add(`import { ${names} } from '@nestjs/graphql';`);
  }

  if (swaggerImports.size > 0) {
    const names = Array.from(swaggerImports).sort().join(', ');
    imports.add(`import { ${names} } from '@nestjs/swagger';`);
  }

  if (classTransformerImports.size > 0) {
    const names = Array.from(classTransformerImports).sort().join(', ');
    imports.add(`import { ${names} } from 'class-transformer';`);
  }

  if (classValidatorImports.size > 0) {
    const names = Array.from(classValidatorImports).sort().join(', ');
    imports.add(`import { ${names} } from 'class-validator';`);
  }

  return Array.from(imports).join('\n');
}

/**
 * Generate code for a single class
 */
function generateClassCode(
  metadata: ClassMetadata,
  options: ResolvedZodToClassOptions
): string {
  const classKeyword = options.exportClass ? 'export class' : 'class';
  const properties = metadata.properties
    .map((prop) => generatePropertyCode(prop, options))
    .join('\n\n');

  const classDecorator = options.includeGraphQL ? `@${options.graphqlType}()\n` : '';

  return `${classDecorator}${classKeyword} ${metadata.name} {
${properties}
}`;
}

/**
 * Generate code for a single property
 */
function generatePropertyCode(
  prop: PropertyMetadata,
  options: ResolvedZodToClassOptions
): string {
  const decorators: string[] = [];

  // Add GraphQL decorators first
  if (options.includeGraphQL && prop.graphql) {
    for (const dec of prop.graphql) {
      decorators.push(generateDecoratorCode(dec));
    }
  }

  // Add swagger decorators (they appear at the top in NestJS convention)
  if (options.includeSwagger && prop.swagger) {
    for (const dec of prop.swagger) {
      decorators.push(generateDecoratorCode(dec));
    }
  }

  // Add validators
  if (options.includeValidators) {
    for (const dec of prop.validators) {
      decorators.push(generateDecoratorCode(dec));
    }
  }

  // Add transformers
  if (options.includeTransformers) {
    for (const dec of prop.transformers) {
      decorators.push(generateDecoratorCode(dec));
    }
  }

  const decoratorString = decorators.map((d) => `  ${d}`).join('\n');
  const optional = prop.optional ? '?' : '';
  const nullable = prop.nullable ? ' | null' : '';
  const typeString = `${prop.type}${nullable}`;

  if (decoratorString) {
    return `${decoratorString}\n  ${prop.name}${optional}: ${typeString};`;
  } else {
    return `  ${prop.name}${optional}: ${typeString};`;
  }
}

/**
 * Generate code for a single decorator
 */
function generateDecoratorCode(decorator: DecoratorInfo): string {
  const { name, args, options } = decorator;

  if (!args && !options) {
    return `@${name}()`;
  }

  const parts: string[] = [];

  if (args && args.length > 0) {
    // Format arguments
    const formattedArgs = args.map((arg) => {
      if (typeof arg === 'string') {
        // Check if it's a function reference (e.g., "() => Date")
        if (arg.startsWith('()')) {
          return arg;
        }
        // Check if it's already a class reference (e.g., "UserDto")
        if (/^[A-Z]/.test(arg)) {
          return arg;
        }
        return `'${arg}'`;
      } else if (arg instanceof RegExp) {
        // Handle RegExp objects by converting to their literal notation
        return arg.toString();
      } else if (Array.isArray(arg)) {
        const formattedItems = arg.map((item) =>
          typeof item === 'string' ? `'${item}'` : String(item)
        );
        return `[${formattedItems.join(', ')}]`;
      } else if (typeof arg === 'object') {
        return JSON.stringify(arg);
      }
      return String(arg);
    });

    parts.push(...formattedArgs);
  }

  if (options) {
    parts.push(formatDecoratorOptions(options));
  }

  return `@${name}(${parts.join(', ')})`;
}

/**
 * Format decorator options object
 */
function formatDecoratorOptions(options: Record<string, any>): string {
  const entries = Object.entries(options);

  if (entries.length === 0) {
    return '{}';
  }

  const formatted = entries.map(([key, value]) => {
    if (key === 'discriminator' && typeof value === 'object') {
      return formatDiscriminator(value);
    }
    if (typeof value === 'boolean') {
      return `${key}: ${value}`;
    }
    if (typeof value === 'number') {
      return `${key}: ${value}`;
    }
    if (typeof value === 'string') {
      // Handle constructor references (String, Number, Boolean, Date, Object)
      if (/^(String|Number|Boolean|Date|Object)$/.test(value)) {
        return `${key}: ${value}`;
      }
      // Handle arrow function references (e.g., "() => ClassName")
      if (value.startsWith('()')) {
        return `${key}: ${value}`;
      }
      return `${key}: '${value}'`;
    }
    if (Array.isArray(value)) {
      const formattedItems = value.map((item) =>
        typeof item === 'string' ? `'${item}'` : String(item)
      );
      return `${key}: [${formattedItems.join(', ')}]`;
    }
    if (typeof value === 'object') {
      return `${key}: ${JSON.stringify(value)}`;
    }
    return `${key}: ${value}`;
  });

  if (formatted.length === 1) {
    return `{ ${formatted[0]} }`;
  }

  return `{\n    ${formatted.join(',\n    ')}\n  }`;
}

/**
 * Format discriminator object for discriminated unions
 */
function formatDiscriminator(discriminator: any): string {
  const { property, subTypes } = discriminator;

  const formattedSubTypes = subTypes.map(
    (st: { value: string; name: string }) =>
      `{ value: ${st.value}, name: '${st.name}' }`
  );

  return `discriminator: {
      property: '${property}',
      subTypes: [
        ${formattedSubTypes.join(',\n        ')}
      ]
    }`;
}
