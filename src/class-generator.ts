import 'reflect-metadata';
import { ClassMetadata, PropertyMetadata, DecoratorInfo, ZodToClassOptions } from './types';
import { setItemSchema } from './metadata-storage';

/**
 * Generate a runtime class from metadata
 * Note: This creates the class structure but decorator application requires
 * the consuming code to have proper reflect-metadata setup
 */
export function generateRuntimeClass(
  metadata: ClassMetadata,
  options: Required<ZodToClassOptions>
): any {
  // First, generate all nested classes
  const nestedClasses = new Map<string, any>();

  for (const nestedMeta of metadata.nestedClasses) {
    const NestedClass = generateRuntimeClass(nestedMeta, options);
    nestedClasses.set(nestedMeta.name, NestedClass);
  }

  // Create the main class
  const classCode = generateClassConstructor(metadata);
  const ClassConstructor = new Function('nestedClasses', classCode)(nestedClasses);

  // Apply decorators using reflect-metadata
  for (const prop of metadata.properties) {
    applyPropertyDecorators(ClassConstructor, prop, options, nestedClasses);
  }

  return ClassConstructor;
}

/**
 * Generate class constructor code as a string (JavaScript, not TypeScript)
 */
function generateClassConstructor(metadata: ClassMetadata): string {
  // Note: We generate JavaScript class code, not TypeScript
  // Type information is applied via decorators and metadata
  return `
    return class ${metadata.name} {
      constructor(data) {
        if (data) {
          Object.assign(this, data);
        }
      }
    }
  `;
}

/**
 * Apply decorators to a property using reflect-metadata
 */
function applyPropertyDecorators(
  target: any,
  prop: PropertyMetadata,
  options: Required<ZodToClassOptions>,
  nestedClasses: Map<string, any>
): void {
  // Apply validators
  if (options.includeValidators) {
    for (const decorator of prop.validators) {
      applyDecorator(target, prop.name, decorator, nestedClasses);
    }
  }

  // Apply transformers
  if (options.includeTransformers) {
    for (const decorator of prop.transformers) {
      applyDecorator(target, prop.name, decorator, nestedClasses);
    }
  }

  // Set design:type metadata for TypeScript reflection
  const designType = getDesignType(prop, nestedClasses);
  if (designType) {
    Reflect.defineMetadata('design:type', designType, target.prototype, prop.name);
  }

  // Store item schema for arrays with constraints (for round-trip preservation)
  if (prop.itemSchema) {
    setItemSchema(target.prototype, prop.name, prop.itemSchema);
  }
}

/**
 * Apply a single decorator to a property
 */
function applyDecorator(
  target: any,
  propertyName: string,
  decorator: DecoratorInfo,
  nestedClasses: Map<string, any>
): void {
  // Import decorator functions dynamically
  let decoratorFn: Function;

  try {
    if (decorator.source === 'class-transformer') {
      const classTransformer = require('class-transformer');
      decoratorFn = classTransformer[decorator.name];
    } else {
      const classValidator = require('class-validator');
      decoratorFn = classValidator[decorator.name];
    }

    if (!decoratorFn) {
      console.warn(`Decorator ${decorator.name} not found in ${decorator.source}`);
      return;
    }

    // Prepare decorator arguments
    let decoratorArgs: any[] = [];

    if (decorator.args) {
      decoratorArgs = decorator.args.map((arg) => {
        // Handle function strings (e.g., "() => Date")
        if (typeof arg === 'string' && arg.startsWith('()')) {
          // Extract the class name from the function string
          const match = arg.match(/\(\) => (\w+)/);
          if (match) {
            const className = match[1];
            if (className === 'Date') {
              return () => Date;
            }
            if (className === 'Object') {
              return () => Object;
            }
            // Check if it's a nested class
            const nestedClass = nestedClasses.get(className);
            if (nestedClass) {
              return () => nestedClass;
            }
          }
          // Fallback: evaluate the string
          return eval(arg);
        }
        return arg;
      });
    }

    if (decorator.options) {
      // Transform options, resolving class name strings to class references
      const transformedOptions = transformDecoratorOptions(decorator.options, nestedClasses);
      decoratorArgs.push(transformedOptions);
    }

    // Apply the decorator
    const decoratorInstance = decoratorFn(...decoratorArgs);
    decoratorInstance(target.prototype, propertyName);
  } catch (error) {
    console.warn(`Failed to apply decorator ${decorator.name}:`, error);
  }
}

/**
 * Transform decorator options, resolving class name strings to actual class references
 */
function transformDecoratorOptions(options: Record<string, any>, nestedClasses: Map<string, any>): Record<string, any> {
  // Handle discriminator options specifically
  if (options.discriminator && options.discriminator.subTypes) {
    return {
      ...options,
      discriminator: {
        ...options.discriminator,
        subTypes: options.discriminator.subTypes.map((subType: { value: string; name: string }) => {
          // Resolve class name string to actual class reference
          const className = subType.value;
          const classRef = nestedClasses.get(className);
          if (!classRef) {
            console.warn(`Discriminator subtype class '${className}' not found in nested classes`);
            return subType;
          }
          return {
            ...subType,
            value: classRef,  // Replace string with actual class reference
          };
        }),
      },
    };
  }

  return options;
}

/**
 * Get the design type for a property
 */
function getDesignType(
  prop: PropertyMetadata,
  nestedClasses: Map<string, any>
): any {
  // Check if it's a nested class
  if (prop.nestedClass) {
    const nestedClass = nestedClasses.get(prop.type.replace('[]', ''));
    if (nestedClass) {
      return prop.type.endsWith('[]') ? Array : nestedClass;
    }
  }

  // Map TypeScript types to runtime types
  if (prop.type === 'string') return String;
  if (prop.type === 'number') return Number;
  if (prop.type === 'boolean') return Boolean;
  if (prop.type === 'Date') return Date;
  if (prop.type.endsWith('[]')) return Array;

  return Object;
}
