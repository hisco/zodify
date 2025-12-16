# zodify

**Bidirectional conversion** between Zod schemas and TypeScript classes with class-transformer and class-validator decorators. **100% type preservation** in both directions!

## Features

- ✅ **Bidirectional conversion**: Zod ↔ Class with zero data loss
- ✅ **100% round-trip preservation**: Convert Zod → Class → Zod with all constraints intact
- ✅ **Array constraints**: Full support for `.min()`, `.max()`, `.length()`, `.nonempty()`
- ✅ **Primitive array items**: Preserve constraints like `z.array(z.string().min(2))`
- ✅ **Date ranges**: `z.date().min(date)` and `.max(date)` support
- ✅ **String patterns**: `startsWith()`, `endsWith()` with regex escaping
- ✅ **Deep nesting**: Tested up to 5 levels with full validation
- ✅ **Runtime class generation**: Dynamic class creation from Zod schemas
- ✅ **Code generation**: Generate TypeScript code strings
- ✅ **NestJS ready**: Perfect for DTOs and validation pipes

## Installation

```bash
npm install zodify zod class-transformer class-validator reflect-metadata
```

## Quick Start - Zod to Class

```typescript
import 'reflect-metadata';
import { z } from 'zod';
import { zodToClass } from 'zodify';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

// Define a Zod schema
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
  role: z.enum(['admin', 'user', 'guest']),
});

// Generate a runtime class
const UserClass = zodToClass(UserSchema, { className: 'User' });

// Use with class-validator
const user = plainToInstance(UserClass, {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  age: 25,
  role: 'admin',
});

const errors = await validate(user);
console.log(errors); // []
```

## Quick Start - Class to Zod

```typescript
import 'reflect-metadata';
import { classToZod } from 'zodify';
import { IsString, IsEmail, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Expose } from 'class-transformer';

// Define a class with decorators
class User {
  @IsString()
  @Expose()
  id: string;

  @IsString()
  @IsEmail()
  @Expose()
  email: string;

  @IsInt()
  @Min(0)
  @Max(120)
  @Expose()
  age: number;

  @IsEnum(['admin', 'user', 'guest'])
  @Expose()
  role: string;
}

// Convert to Zod schema
const UserSchema = classToZod(User);

// Use with Zod validation
const user = UserSchema.parse({
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  age: 25,
  role: 'admin',
});
```

## API Reference

### `zodToClass(schema, options)`

Convert a Zod schema to a runtime TypeScript class.

**Parameters:**
- `schema` - A Zod schema (must be `z.object()` at the root level)
- `options` - Configuration options:
  - `className?: string` - Generated class name (default: 'GeneratedClass')
  - `includeValidators?: boolean` - Include class-validator decorators (default: true)
  - `includeTransformers?: boolean` - Include class-transformer decorators (default: true)
  - `exportClass?: boolean` - Export the class (for code generation, default: true)
  - `includeImports?: boolean` - Add import statements (for code generation, default: true)

**Returns:** A JavaScript class constructor

**Example:**
```typescript
const UserClass = zodToClass(UserSchema, {
  className: 'User',
  includeValidators: true,
  includeTransformers: true,
});

const user = new UserClass({ name: 'John', email: 'john@example.com' });
```

### `zodToClass.toCode(schema, options)`

Generate TypeScript code string from a Zod schema.

**Parameters:** Same as `zodToClass()`

**Returns:** A string containing TypeScript code

**Example:**
```typescript
const code = zodToClass.toCode(UserSchema, { className: 'User' });
console.log(code);
```

Output:
```typescript
import { Expose } from 'class-transformer';
import { IsString, IsEmail } from 'class-validator';

export class User {
  @IsString()
  @Expose()
  name: string;

  @IsString()
  @IsEmail()
  @Expose()
  email: string;
}
```

### `classToZod(classConstructor, options)`

Convert a class with class-validator and class-transformer decorators to a Zod schema.

**Parameters:**
- `classConstructor` - A class constructor with decorator metadata
- `options` - Configuration options:
  - `useReflectMetadata?: boolean` - Use reflect-metadata for type inference (default: true)
  - `strict?: boolean` - Throw on unknown properties (default: false)
  - `classCache?: WeakMap` - Cache for circular references (default: new WeakMap())

**Returns:** A Zod schema (`z.ZodObject`)

**Example:**
```typescript
import { IsString, IsEmail } from 'class-validator';
import { Expose } from 'class-transformer';
import { classToZod } from 'zodify';

class User {
  @IsString()
  @IsEmail()
  @Expose()
  email: string;

  @IsString()
  @Expose()
  name: string;
}

const schema = classToZod(User);
// Returns: z.object({ email: z.string().email(), name: z.string() })

// Use with Zod validation
const user = schema.parse({ email: 'test@example.com', name: 'John' });
```

## Decorator to Zod Mapping

### class-validator to Zod

#### Type Validators

| class-validator Decorator | Zod Schema |
|---------------------------|------------|
| `@IsString()` | `z.string()` |
| `@IsNumber()` | `z.number()` |
| `@IsInt()` | `z.number().int()` |
| `@IsBoolean()` | `z.boolean()` |
| `@IsDate()` | `z.date()` |
| `@IsEnum(Enum)` | `z.enum([...])` or `z.nativeEnum(Enum)` |
| `@IsArray()` | `z.array(...)` |
| `@IsOptional()` | `.optional()` |

#### String Validators

| class-validator Decorator | Zod Schema |
|---------------------------|------------|
| `@IsEmail()` | `z.string().email()` |
| `@IsUUID()` | `z.string().uuid()` |
| `@IsUrl()` | `z.string().url()` |
| `@IsIP()` | `z.string().ip()` |
| `@IsDateString()` | `z.string().datetime()` |
| `@MinLength(n)` | `z.string().min(n)` |
| `@MaxLength(n)` | `z.string().max(n)` |
| `@Length(n, n)` | `z.string().length(n)` |
| `@Contains(str)` | `z.string().includes(str)` |
| `@Matches(regex)` | `z.string().regex(regex)` |

#### Number Validators

| class-validator Decorator | Zod Schema |
|---------------------------|------------|
| `@Min(n)` | `z.number().min(n)` |
| `@Max(n)` | `z.number().max(n)` |
| `@IsPositive()` | `z.number().positive()` |
| `@IsNegative()` | `z.number().negative()` |
| `@IsDivisibleBy(n)` | `z.number().multipleOf(n)` |

#### Array Validators

| class-validator Decorator | Zod Schema |
|---------------------------|------------|
| `@ArrayMinSize(n)` | `z.array(...).min(n)` |
| `@ArrayMaxSize(n)` | `z.array(...).max(n)` |
| `@ArrayNotEmpty()` | `z.array(...).nonempty()` |

#### Date Validators

| class-validator Decorator | Zod Schema |
|---------------------------|------------|
| `@MinDate(date)` | `z.date().min(date)` |
| `@MaxDate(date)` | `z.date().max(date)` |

## Zod to Decorator Mapping

### class-validator Decorators

#### Type Validators

| Zod Schema | class-validator Decorator |
|------------|---------------------------|
| `z.string()` | `@IsString()` |
| `z.number()` | `@IsNumber()` |
| `z.number().int()` | `@IsInt()` |
| `z.boolean()` | `@IsBoolean()` |
| `z.date()` | `@IsDate()` |
| `z.enum([...])` | `@IsEnum(EnumType)` |
| `z.array(T)` | `@IsArray()` |
| `z.optional()` | `@IsOptional()` |

#### String Validators

| Zod Schema | class-validator Decorator |
|------------|---------------------------|
| `z.string().email()` | `@IsEmail()` |
| `z.string().uuid()` | `@IsUUID()` |
| `z.string().url()` | `@IsUrl()` |
| `z.string().cuid()` | `@Matches(/^c[^\s-]{8,}$/i)` |
| `z.string().cuid2()` | `@Matches(/^[0-9a-z]+$/)` |
| `z.string().datetime()` | `@IsDateString()` |
| `z.string().ip()` | `@IsIP()` |
| `z.string().min(n)` | `@MinLength(n)` |
| `z.string().max(n)` | `@MaxLength(n)` |
| `z.string().length(n)` | `@Length(n, n)` |
| `z.string().includes(str)` | `@Contains(str)` |
| `z.string().regex(pattern)` | `@Matches(pattern)` |
| `z.string().startsWith('prefix')` | `@Matches(/^prefix/)` |
| `z.string().endsWith('suffix')` | `@Matches(/suffix$/)` |

#### Number Validators

| Zod Schema | class-validator Decorator |
|------------|---------------------------|
| `z.number().min(n)` | `@Min(n)` |
| `z.number().max(n)` | `@Max(n)` |
| `z.number().positive()` | `@IsPositive()` |
| `z.number().negative()` | `@IsNegative()` |
| `z.number().multipleOf(n)` | `@IsDivisibleBy(n)` |

#### Array Validators

| Zod Schema | class-validator Decorator |
|------------|---------------------------|
| `z.array(T).min(n)` | `@ArrayMinSize(n)` |
| `z.array(T).max(n)` | `@ArrayMaxSize(n)` |
| `z.array(T).length(n)` | `@ArrayMinSize(n)` + `@ArrayMaxSize(n)` |
| `z.array(T).nonempty()` | `@ArrayNotEmpty()` |

#### Date Validators

| Zod Schema | class-validator Decorator |
|------------|---------------------------|
| `z.date().min(date)` | `@MinDate(date)` |
| `z.date().max(date)` | `@MaxDate(date)` |

### class-transformer Decorators

| Zod Schema | class-transformer Decorator |
|------------|----------------------------|
| All properties | `@Expose()` |
| `z.object(...)` | `@Type(() => NestedClass)` |
| `z.array(z.object(...))` | `@Type(() => ItemClass)` |
| `z.date()` | `@Type(() => Date)` |
| `z.discriminatedUnion(...)` | `@Type(() => Object, { discriminator: {...} })` |

## Usage Examples

### Basic Schema

```typescript
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
});

const UserClass = zodToClass(UserSchema, { className: 'User' });
```

### Nested Objects

```typescript
const UserSchema = z.object({
  name: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string(),
  }),
});

const UserClass = zodToClass(UserSchema, { className: 'User' });

// Creates User class and UserAddress nested class
```

### Arrays

```typescript
const UserSchema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
  posts: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })),
});

const UserClass = zodToClass(UserSchema, { className: 'User' });

// Creates User class and UserPostsItem nested class for array items
```

### Enums

```typescript
const UserSchema = z.object({
  name: z.string(),
  role: z.enum(['admin', 'user', 'guest']),
});

const UserClass = zodToClass(UserSchema, { className: 'User' });
```

### Discriminated Unions

```typescript
const ComponentSchema = z.object({
  component: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('helm'),
      chartName: z.string(),
      version: z.string(),
    }),
    z.object({
      type: z.literal('kustomize'),
      path: z.string(),
    }),
    z.object({
      type: z.literal('manifest'),
      yaml: z.string(),
    }),
  ]),
});

const ComponentClass = zodToClass(ComponentSchema, { className: 'Component' });

// Creates separate classes for each variant with discriminator decorator
```

### Optional and Nullable

```typescript
const UserSchema = z.object({
  name: z.string(),
  nickname: z.string().optional(),
  middleName: z.string().nullable(),
  bio: z.string().optional().nullable(),
});

const UserClass = zodToClass(UserSchema, { className: 'User' });
```

### Round-trip Conversion

zodify preserves **100% of your constraints** in round-trip conversions:

```typescript
// Start with a Zod schema
const originalSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  tags: z.array(z.string()).min(1).max(10),
  startDate: z.date().min(new Date('2024-01-01')),
});

// Convert to class
const UserClass = zodToClass(originalSchema, { className: 'User' });

// Convert back to Zod
const regeneratedSchema = classToZod(UserClass);

// All constraints are preserved!
originalSchema.parse(data);      // ✅ Validates correctly
regeneratedSchema.parse(data);   // ✅ Validates identically
```

**What's preserved:**
- ✅ All type validators (string, number, boolean, date, array, etc.)
- ✅ All constraint validators (min, max, length, email, uuid, etc.)
- ✅ Array length constraints (min, max, length, nonempty)
- ✅ Date range constraints (min, max)
- ✅ String patterns (startsWith, endsWith, regex)
- ✅ Nested objects (unlimited depth)
- ✅ Optional and nullable properties
- ✅ Enums and discriminated unions
- ✅ **Even primitive array item constraints** like `z.array(z.string().min(2))`

### Code Generation

```typescript
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
});

// Generate code string
const code = zodToClass.toCode(UserSchema, {
  className: 'User',
  includeImports: true,
  exportClass: true,
});

// Write to file or use programmatically
import fs from 'fs';
fs.writeFileSync('./generated/user.dto.ts', code);
```

## NestJS Integration

zodify works seamlessly with NestJS applications.

```typescript
import { z } from 'zod';
import { zodToClass } from 'zodify';
import { Controller, Post, Body } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';

// Define Zod schema
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string(),
});

// Generate DTO class
const CreateUserDto = zodToClass(CreateUserSchema, { className: 'CreateUserDto' });

@Controller('users')
export class UsersController {
  @Post()
  async create(@Body() createUserDto: typeof CreateUserDto) {
    // createUserDto is already validated and transformed!
    return { success: true };
  }
}

// Enable validation in main.ts
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
}));
```

## TypeScript Configuration

Ensure your `tsconfig.json` has decorators enabled:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Limitations

zodify has some limitations:

### zodToClass (Zod → Class)

1. **Root must be z.object()**: The root schema must be a Zod object schema. Primitive types at the root are not supported.

2. **z.refine() and z.transform()**: Custom refinements and transformations cannot be converted to decorators. These are ignored during conversion.

3. **Recursive schemas**: `z.lazy()` for recursive schemas has limited support. Deep circular references may cause issues.

4. **z.record() and z.map()**: These are converted to generic TypeScript types (`Record<string, any>`, `Map<any, any>`) without specific validators.

5. **z.intersection()**: Intersection types are simplified by merging properties. Complex intersections may not work as expected.

6. **z.union()**: Non-discriminated unions have limited support. Use `z.discriminatedUnion()` for best results.

### classToZod (Class → Zod)

1. **Requires decorator metadata**: Classes must have class-validator decorators. Properties without decorators will use `design:type` metadata or default to `z.unknown()`.

2. **Custom validators**: Custom class-validator decorators (created with `@ValidatorConstraint()`) cannot be converted to Zod.

3. **Primitive array item constraints**: For manually written classes, constraints on primitive array items (e.g., "each string must be at least 2 chars") cannot be expressed with class-validator decorators alone. However, **this works perfectly for round-trip conversions** (Zod → Class → Zod) using metadata storage.

### Both Directions

- **z.tuple()**: Tuple types are not yet supported.
- **z.promise()** and **z.function()**: These types cannot be represented in decorators.
- **z.default()**: Default values are not preserved during conversion.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Related Projects

- [zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation
- [class-validator](https://github.com/typestack/class-validator) - Decorator-based validation
- [class-transformer](https://github.com/typestack/class-transformer) - Decorator-based transformation
- [klasik](https://github.com/hisco/klasik) - Generate TypeScript clients from OpenAPI specs
