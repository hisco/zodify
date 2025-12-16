import 'reflect-metadata';
import { z } from 'zod';
import { getMetadataStorage } from 'class-validator';
import { ClassToZodOptions } from './types';
import { getItemSchema } from './metadata-storage';

// @ts-ignore - class-transformer doesn't export this in types but it exists at runtime
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';

/**
 * Convert a class with class-validator and class-transformer decorators to a Zod schema
 *
 * @example
 * ```typescript
 * class User {
 *   @IsString()
 *   @IsEmail()
 *   email: string;
 *
 *   @IsNumber()
 *   @Min(18)
 *   age: number;
 * }
 *
 * const schema = classToZod(User);
 * // Returns: z.object({ email: z.string().email(), age: z.number().min(18) })
 * ```
 */
export function classToZod<T extends new (...args: any[]) => any>(
  classConstructor: T,
  options: ClassToZodOptions = {}
): z.ZodObject<any> {
  const opts: Required<ClassToZodOptions> = {
    useReflectMetadata: true,
    classCache: new WeakMap(),
    strict: false,
    ...options,
  };

  // Check cache for circular references
  if (opts.classCache.has(classConstructor)) {
    return opts.classCache.get(classConstructor) as z.ZodObject<any>;
  }

  // Get all property names from metadata
  const propertyNames = getClassPropertyNames(classConstructor);

  // Build the shape for z.object()
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const propertyName of propertyNames) {
    const propertySchema = buildPropertySchema(classConstructor, propertyName, opts);
    if (propertySchema) {
      shape[propertyName] = propertySchema;
    }
  }

  const schema = z.object(shape);

  // Cache the schema
  opts.classCache.set(classConstructor, schema);

  return schema;
}

/**
 * Get all property names defined on the class from metadata
 */
function getClassPropertyNames(classConstructor: Function): string[] {
  const validatorStorage = getMetadataStorage();
  const transformerStorage = defaultMetadataStorage;

  const propertyNames = new Set<string>();

  // Get properties from class-validator metadata
  const validatorMetadata = validatorStorage.getTargetValidationMetadatas(
    classConstructor,
    '',
    false,
    false
  );

  for (const meta of validatorMetadata) {
    if (meta.propertyName) {
      propertyNames.add(meta.propertyName);
    }
  }

  // Get properties from class-transformer metadata (Expose decorators)
  const exposeMetadata = transformerStorage.getExposedMetadatas(classConstructor);

  for (const meta of exposeMetadata) {
    if (meta.propertyName) {
      propertyNames.add(meta.propertyName);
    }
  }

  // Also check design:type metadata for all properties
  const prototype = classConstructor.prototype;
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

  return Array.from(propertyNames);
}

/**
 * Build a Zod schema for a single property
 */
function buildPropertySchema(
  classConstructor: Function,
  propertyName: string,
  options: Required<ClassToZodOptions>
): z.ZodTypeAny | null {
  const prototype = classConstructor.prototype;

  // Get design:type metadata (set by TypeScript compiler)
  const designType = options.useReflectMetadata
    ? Reflect.getMetadata('design:type', prototype, propertyName)
    : undefined;

  // Get class-validator metadata
  const validatorStorage = getMetadataStorage();
  const validatorMetadata = validatorStorage
    .getTargetValidationMetadatas(classConstructor, '', false, false)
    .filter((meta) => meta.propertyName === propertyName);

  // Get class-transformer metadata
  const transformerStorage = defaultMetadataStorage;
  const typeMetadata = transformerStorage.findTypeMetadata(classConstructor, propertyName);

  // Build base schema from decorators and design type
  let schema = buildBaseSchema(
    designType,
    validatorMetadata,
    typeMetadata,
    options,
    classConstructor,
    propertyName
  );

  if (!schema) {
    if (options.strict) {
      throw new Error(
        `Unable to determine type for property '${propertyName}' in class '${classConstructor.name}'. ` +
        `Add type validators (@IsString, @IsNumber, etc.) or enable useReflectMetadata option.`
      );
    }
    // Fallback to z.unknown() in non-strict mode
    schema = z.unknown();
  }

  // Apply validators
  schema = applyValidators(schema, validatorMetadata);

  return schema;
}

/**
 * Build base Zod schema from design type and metadata
 */
function buildBaseSchema(
  designType: any,
  validatorMetadata: any[],
  typeMetadata: any,
  options: Required<ClassToZodOptions>,
  classConstructor?: Function,
  propertyName?: string
): z.ZodTypeAny | null {
  // CRITICAL: Check if this property is marked as an array FIRST
  // This must be checked before processing @Type() to handle arrays of objects correctly
  const hasArrayValidator = validatorMetadata.some((meta) => meta.name === 'isArray');

  // Priority 1: Check @Type() decorator first (most explicit)
  if (typeMetadata) {
    const typeFunction = typeMetadata.typeFunction;
    if (typeof typeFunction === 'function') {
      const typeResult = typeFunction();

      if (typeResult === Date) {
        // If it's also an array, return array of dates
        return hasArrayValidator ? z.array(z.date()) : z.date();
      }

      // Handle primitive array item types
      if (hasArrayValidator) {
        if (typeResult === String) {
          return z.array(z.string());
        }
        if (typeResult === Number) {
          return z.array(z.number());
        }
        if (typeResult === Boolean) {
          return z.array(z.boolean());
        }
      }

      // Check if it's a nested class (exclude primitive constructors)
      if (
        typeof typeResult === 'function' &&
        typeResult.prototype &&
        typeResult !== Object &&
        typeResult !== String &&
        typeResult !== Number &&
        typeResult !== Boolean &&
        typeResult !== Date &&
        typeResult !== Array
      ) {
        // Avoid infinite recursion by checking if we're already processing this class
        if (options.classCache.has(typeResult)) {
          const cachedSchema = options.classCache.get(typeResult)!;
          // If also marked as array, wrap in z.array()
          return hasArrayValidator ? z.array(cachedSchema) : cachedSchema;
        }

        const nestedSchema = classToZod(typeResult, options);

        // CRITICAL FIX: If this property has @IsArray() AND @Type(() => NestedClass),
        // wrap the nested schema in z.array()
        return hasArrayValidator ? z.array(nestedSchema) : nestedSchema;
      }
    }

    // Handle discriminated unions
    if (typeMetadata.options?.discriminator) {
      const discriminator = typeMetadata.options.discriminator;
      const variants = discriminator.subTypes.map((subType: any) => {
        const variantClass = subType.value;
        return classToZod(variantClass, options);
      });

      if (variants.length > 0) {
        return z.discriminatedUnion(discriminator.property, variants as any);
      }
    }
  }

  // Priority 2: Check class-validator type decorators
  const hasStringValidator = validatorMetadata.some((meta) => meta.name === 'isString');
  const hasNumberValidator = validatorMetadata.some(
    (meta) => meta.name === 'isNumber' || meta.name === 'isInt'
  );
  const hasBooleanValidator = validatorMetadata.some((meta) => meta.name === 'isBoolean');
  const hasDateValidator = validatorMetadata.some((meta) => meta.name === 'isDate');
  // hasArrayValidator already defined at the top of function
  const hasEnumValidator = validatorMetadata.some((meta) => meta.name === 'isEnum');

  if (hasStringValidator) {
    return z.string();
  }

  if (hasNumberValidator) {
    const hasIntValidator = validatorMetadata.some((meta) => meta.name === 'isInt');
    return hasIntValidator ? z.number().int() : z.number();
  }

  if (hasBooleanValidator) {
    return z.boolean();
  }

  if (hasDateValidator) {
    return z.date();
  }

  if (hasEnumValidator) {
    const enumMeta = validatorMetadata.find((meta) => meta.name === 'isEnum');
    if (enumMeta?.constraints?.[0]) {
      const enumObj = enumMeta.constraints[0];

      // Check if it's a native enum (object with string keys mapping to values)
      if (typeof enumObj === 'object' && !Array.isArray(enumObj)) {
        // It's a native enum
        return z.nativeEnum(enumObj);
      } else if (Array.isArray(enumObj)) {
        // It's an array of values
        return z.enum(enumObj as any);
      }
    }
  }

  if (hasArrayValidator) {
    // PRIORITY: Check if we have a stored item schema from Zod → Class conversion
    // This preserves constraints on primitive array items (e.g., z.array(z.string().min(2)))
    if (classConstructor && propertyName) {
      const storedItemSchema = getItemSchema(classConstructor.prototype, propertyName);
      if (storedItemSchema) {
        return z.array(storedItemSchema);
      }
    }

    // Try to get array item type from @Type decorator
    if (typeMetadata) {
      const typeFunction = typeMetadata.typeFunction;
      if (typeof typeFunction === 'function') {
        const itemType = typeFunction();

        // Handle primitive types
        if (itemType === Date) {
          return z.array(z.date());
        }
        if (itemType === String) {
          return z.array(z.string());
        }
        if (itemType === Number) {
          return z.array(z.number());
        }
        if (itemType === Boolean) {
          return z.array(z.boolean());
        }

        // Handle nested class types (not primitives)
        if (
          typeof itemType === 'function' &&
          itemType.prototype &&
          itemType !== Object &&
          itemType !== String &&
          itemType !== Number &&
          itemType !== Boolean &&
          itemType !== Date &&
          itemType !== Array
        ) {
          const itemSchema = classToZod(itemType, options);
          return z.array(itemSchema);
        }
      }
    }
    // Fallback to array of unknown
    return z.array(z.unknown());
  }

  // Priority 3: Use design:type as fallback
  if (designType === String) {
    return z.string();
  }
  if (designType === Number) {
    return z.number();
  }
  if (designType === Boolean) {
    return z.boolean();
  }
  if (designType === Date) {
    return z.date();
  }
  if (designType === Array) {
    return z.array(z.unknown());
  }

  // Check if it's a nested class type (exclude primitive constructors)
  if (
    typeof designType === 'function' &&
    designType.prototype &&
    designType !== Object &&
    designType !== String &&
    designType !== Number &&
    designType !== Boolean &&
    designType !== Date &&
    designType !== Array
  ) {
    // Recursively convert nested class
    return classToZod(designType, options);
  }

  return null;
}

/**
 * Apply class-validator decorators to Zod schema
 */
function applyValidators(schema: z.ZodTypeAny, validatorMetadata: any[]): z.ZodTypeAny {
  // Check if property is optional first
  const isOptional = validatorMetadata.some(
    (meta) => meta.type === 'conditionalValidation' || meta.name === 'isOptional'
  );

  // Apply all validators
  for (const meta of validatorMetadata) {
    schema = applySingleValidator(schema, meta);
  }

  // Apply optional modifier last
  if (isOptional) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Apply a single validator to Zod schema
 */
function applySingleValidator(schema: z.ZodTypeAny, meta: any): z.ZodTypeAny {
  // The validator name is in meta.name, not meta.type
  const name = meta.name;
  const constraints = meta.constraints || [];

  // Skip base type validators as they're already handled
  if (['isString', 'isNumber', 'isInt', 'isBoolean', 'isDate', 'isArray', 'isEnum', 'isOptional'].includes(name)) {
    return schema;
  }

  // String validators
  if (name === 'isEmail') {
    return (schema as z.ZodString).email();
  }
  if (name === 'isUuid') {
    return (schema as z.ZodString).uuid();
  }
  if (name === 'isUrl') {
    return (schema as z.ZodString).url();
  }
  if (name === 'isIp') {
    return (schema as z.ZodString).ip();
  }
  if (name === 'isDateString') {
    return (schema as z.ZodString).datetime();
  }
  if (name === 'minLength') {
    return (schema as z.ZodString).min(constraints[0]);
  }
  if (name === 'maxLength') {
    return (schema as z.ZodString).max(constraints[0]);
  }
  if (name === 'isLength') {
    // @Length(n) -> constraints = [n, undefined] -> exact length
    // @Length(min, max) -> constraints = [min, max] -> min and max
    const min = constraints[0];
    const max = constraints[1];

    if (max === null || max === undefined) {
      // Exact length
      return (schema as z.ZodString).length(min);
    } else {
      // Min and max length
      return (schema as z.ZodString).min(min).max(max);
    }
  }
  if (name === 'contains') {
    return (schema as z.ZodString).includes(constraints[0]);
  }
  if (name === 'matches') {
    return (schema as z.ZodString).regex(constraints[0]);
  }
  // Note: Specialized validators like @IsBase64(), @IsHexadecimal(), @IsJWT()
  // map to unsupported Zod methods in 3.22, so they're skipped.
  // They'll remain as z.string() which is less strict but maintains compatibility.

  // Number validators
  if (name === 'min') {
    return (schema as z.ZodNumber).min(constraints[0]);
  }
  if (name === 'max') {
    return (schema as z.ZodNumber).max(constraints[0]);
  }
  if (name === 'isPositive') {
    return (schema as z.ZodNumber).positive();
  }
  if (name === 'isNegative') {
    return (schema as z.ZodNumber).negative();
  }
  if (name === 'isDivisibleBy') {
    return (schema as z.ZodNumber).multipleOf(constraints[0]);
  }

  // Array validators
  if (name === 'arrayMinSize') {
    return (schema as z.ZodArray<any>).min(constraints[0]);
  }
  if (name === 'arrayMaxSize') {
    return (schema as z.ZodArray<any>).max(constraints[0]);
  }
  if (name === 'arrayNotEmpty') {
    return (schema as z.ZodArray<any>).nonempty();
  }

  // Date validators
  if (name === 'minDate') {
    const minDate = constraints[0] instanceof Date ? constraints[0] : new Date(constraints[0]);
    return (schema as z.ZodDate).min(minDate);
  }
  if (name === 'maxDate') {
    const maxDate = constraints[0] instanceof Date ? constraints[0] : new Date(constraints[0]);
    return (schema as z.ZodDate).max(maxDate);
  }

  return schema;
}
