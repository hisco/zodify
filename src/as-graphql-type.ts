import 'reflect-metadata';
import type { AsGraphQLTypeOptions, AttributeTypeMapEntry } from './types';

// @ts-ignore - class-transformer doesn't export this in types but it exists at runtime
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';

/**
 * Take an existing decorated class and return a subclass with NestJS GraphQL
 * `@ObjectType()` / `@InputType()` and `@Field()` decorators applied.
 *
 * The original class is not mutated. The returned subclass extends it,
 * preserving all TypeScript type information via inheritance.
 *
 * Reads property metadata from:
 * 1. Static `attributeTypeMap` (OpenAPI codegen convention) — richest source
 * 2. `@Type(() => X)` decorators (class-transformer)
 * 3. `design:type` reflect-metadata (TypeScript compiler)
 */
export function asGraphQLType<T extends new (...args: any[]) => any>(
  classConstructor: T,
  options?: AsGraphQLTypeOptions,
): T {
  const opts: Required<AsGraphQLTypeOptions> = {
    name: options?.name ?? classConstructor.name,
    type: options?.type ?? 'ObjectType',
    unknownScalar: options?.unknownScalar ?? null,
    processedClasses: options?.processedClasses ?? new Map<Function, Function>(),
  };

  // Check if already processed (circular reference protection)
  if (opts.processedClasses.has(classConstructor)) {
    return opts.processedClasses.get(classConstructor) as T;
  }

  const graphql = requireGraphQL();

  // Create a subclass to avoid mutating the original
  const SubClass = createSubclass(classConstructor, opts.name);

  // Cache immediately (before recursing into nested classes) for circular refs
  opts.processedClasses.set(classConstructor, SubClass);

  // Apply class-level decorator (@ObjectType or @InputType)
  const classDecoratorFn = graphql[opts.type];
  if (classDecoratorFn) {
    classDecoratorFn()(SubClass);
  }

  // Collect property info and apply @Field() decorators
  const properties = getPropertyInfo(classConstructor);

  for (const prop of properties) {
    const fieldTypeResult = resolveGraphQLFieldType(prop, graphql, opts);
    if (!fieldTypeResult) {
      // Unknown type and no unknownScalar configured — skip field
      continue;
    }

    const { typeFn, fieldOptions } = fieldTypeResult;
    const args: any[] = [typeFn];
    if (Object.keys(fieldOptions).length > 0) {
      args.push(fieldOptions);
    }

    const fieldDecorator = graphql.Field(...args);
    fieldDecorator(SubClass.prototype, prop.name);
  }

  return SubClass as T;
}

/**
 * Property info extracted from class metadata.
 */
interface PropertyInfo {
  name: string;
  /** TypeScript runtime type from design:type */
  designType?: any;
  /** Type string from attributeTypeMap (e.g. "string", "number", "Array<Listener>") */
  typeString?: string;
  /** Format from attributeTypeMap (e.g. "int32", "int64", "date-time") */
  format?: string;
  /** Description from attributeTypeMap */
  description?: string;
  /** Direct model class reference from attributeTypeMap or @Type() */
  modelClass?: new (...args: any[]) => any;
  /** Whether the property is optional (nullable in attributeTypeMap, or not required) */
  optional: boolean;
  /** Whether the property is an array */
  isArray: boolean;
  /** For arrays, the item type string (e.g. "string", "Listener") */
  arrayItemType?: string;
  /** For arrays, the item model class (if it's an object type) */
  arrayItemModelClass?: new (...args: any[]) => any;
}

/**
 * Extract property info from a class using all available metadata sources.
 */
function getPropertyInfo(classConstructor: Function): PropertyInfo[] {
  const prototype = classConstructor.prototype;
  const attrMap = getAttributeTypeMap(classConstructor);
  const propertyNames = new Set<string>();
  const attrMapByName = new Map<string, AttributeTypeMapEntry>();

  // Source 1: attributeTypeMap
  if (attrMap) {
    for (const entry of attrMap) {
      propertyNames.add(entry.name);
      attrMapByName.set(entry.name, entry);
    }
  }

  // Source 2: class-transformer @Expose() metadata
  try {
    const exposeMetadata = defaultMetadataStorage.getExposedMetadatas(classConstructor);
    for (const meta of exposeMetadata) {
      if (meta.propertyName) {
        propertyNames.add(meta.propertyName);
      }
    }
  } catch {
    // class-transformer not available
  }

  // Source 3: design:type metadata (from own properties on the prototype)
  if (prototype) {
    const keys = Object.getOwnPropertyNames(prototype);
    for (const key of keys) {
      if (key !== 'constructor') {
        const designType = Reflect.getMetadata('design:type', prototype, key);
        if (designType) {
          propertyNames.add(key);
        }
      }
    }
  }

  const result: PropertyInfo[] = [];

  for (const name of propertyNames) {
    const attrEntry = attrMapByName.get(name);
    const designType = Reflect.getMetadata('design:type', prototype, name);
    const typeMetadata = getTransformerTypeMetadata(classConstructor, name);

    const info: PropertyInfo = {
      name,
      designType,
      optional: false,
      isArray: false,
    };

    if (attrEntry) {
      info.typeString = attrEntry.type;
      info.format = attrEntry.format;
      info.description = attrEntry.description;
      info.modelClass = attrEntry.modelClass;

      // Parse array types like "Array<Listener>" or "Array<string>"
      const arrayMatch = attrEntry.type.match(/^Array<(.+)>$/);
      if (arrayMatch) {
        info.isArray = true;
        info.arrayItemType = arrayMatch[1];
        if (attrEntry.modelClass) {
          info.arrayItemModelClass = attrEntry.modelClass;
        }
      }

      // Check for optional: type string ending with " | undefined" or containing "?"
      if (attrEntry.type.includes(' | undefined') || attrEntry.type.includes(' | null')) {
        info.optional = true;
      }
    } else {
      // No attributeTypeMap entry — infer from design:type
      if (designType === Array) {
        info.isArray = true;
        // Try to get item class from @Type()
        if (typeMetadata) {
          const typeResult = typeof typeMetadata.typeFunction === 'function'
            ? typeMetadata.typeFunction()
            : undefined;
          if (typeResult && isNestedClass(typeResult)) {
            info.arrayItemModelClass = typeResult;
            info.arrayItemType = typeResult.name;
          }
        }
      }

      if (typeMetadata) {
        const typeResult = typeof typeMetadata.typeFunction === 'function'
          ? typeMetadata.typeFunction()
          : undefined;
        if (typeResult && !info.isArray && isNestedClass(typeResult)) {
          info.modelClass = typeResult;
        }
      }
    }

    result.push(info);
  }

  return result;
}

interface FieldTypeResult {
  typeFn: () => any;
  fieldOptions: Record<string, any>;
}

/**
 * Resolve a PropertyInfo to a GraphQL @Field() type function and options.
 */
function resolveGraphQLFieldType(
  prop: PropertyInfo,
  graphql: any,
  opts: Required<AsGraphQLTypeOptions>,
): FieldTypeResult | null {
  const fieldOptions: Record<string, any> = {};

  if (prop.optional) {
    fieldOptions.nullable = true;
  }
  if (prop.description) {
    fieldOptions.description = prop.description;
  }

  // Arrays
  if (prop.isArray) {
    const itemType = resolveScalarType(prop.arrayItemType, prop.format, prop.designType, graphql);

    if (itemType) {
      return { typeFn: () => [itemType], fieldOptions };
    }

    // Array of nested objects
    if (prop.arrayItemModelClass) {
      const nestedSubClass = asGraphQLType(prop.arrayItemModelClass, {
        type: opts.type,
        unknownScalar: opts.unknownScalar,
        processedClasses: opts.processedClasses,
      });
      return { typeFn: () => [nestedSubClass], fieldOptions };
    }

    // Unknown array item type
    if (opts.unknownScalar) {
      return { typeFn: () => [opts.unknownScalar], fieldOptions };
    }
    return null;
  }

  // Nested object (model class)
  if (prop.modelClass) {
    const nestedSubClass = asGraphQLType(prop.modelClass, {
      type: opts.type,
      unknownScalar: opts.unknownScalar,
      processedClasses: opts.processedClasses,
    });
    return { typeFn: () => nestedSubClass, fieldOptions };
  }

  // Scalars
  const scalarType = resolveScalarType(prop.typeString, prop.format, prop.designType, graphql);
  if (scalarType) {
    return { typeFn: () => scalarType, fieldOptions };
  }

  // Unknown type — use unknownScalar if configured
  if (opts.unknownScalar) {
    return { typeFn: () => opts.unknownScalar, fieldOptions };
  }

  return null;
}

/**
 * Resolve a type string / format / design type to a GraphQL scalar.
 * Returns null if the type is a complex/unknown type.
 */
function resolveScalarType(
  typeString: string | undefined,
  format: string | undefined,
  designType: any,
  graphql: any,
): any {
  // From typeString (attributeTypeMap)
  if (typeString) {
    const normalized = typeString.replace(/ \| undefined$/, '').replace(/ \| null$/, '');

    switch (normalized) {
      case 'string':
        return String;
      case 'number':
        // Use format to distinguish Int vs Float
        if (format === 'int32' || format === 'int64' || format === 'integer') {
          return graphql.Int;
        }
        if (format === 'float' || format === 'double') {
          return graphql.Float;
        }
        return graphql.Float;
      case 'boolean':
        return Boolean;
      case 'Date':
        return Date;
    }
  }

  // Fallback to design:type
  if (designType === String) return String;
  if (designType === Number) return graphql.Float;
  if (designType === Boolean) return Boolean;
  if (designType === Date) return Date;

  return null;
}

// --- Helpers ---

function requireGraphQL(): any {
  try {
    return require('@nestjs/graphql');
  } catch {
    throw new Error(
      'asGraphQLType() requires @nestjs/graphql. Install it: npm install @nestjs/graphql'
    );
  }
}

function createSubclass<T extends new (...args: any[]) => any>(
  Base: T,
  name: string,
): T {
  // Use computed property name to set the class name
  const container = {
    [name]: class extends (Base as any) {
      constructor(...args: any[]) {
        super(...args);
      }
    },
  };
  return container[name] as any as T;
}

function getAttributeTypeMap(classConstructor: Function): AttributeTypeMapEntry[] | null {
  const ctor = classConstructor as any;
  if (typeof ctor.getAttributeTypeMap === 'function') {
    return ctor.getAttributeTypeMap();
  }
  if (Array.isArray(ctor.attributeTypeMap)) {
    return ctor.attributeTypeMap;
  }
  return null;
}

function getTransformerTypeMetadata(classConstructor: Function, propertyName: string): any {
  try {
    return defaultMetadataStorage.findTypeMetadata(classConstructor, propertyName);
  } catch {
    return undefined;
  }
}

function isNestedClass(value: any): boolean {
  return (
    typeof value === 'function' &&
    value.prototype &&
    value !== Object &&
    value !== String &&
    value !== Number &&
    value !== Boolean &&
    value !== Date &&
    value !== Array
  );
}
