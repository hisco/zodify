# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-17

### Added

#### Bidirectional Conversion Support
- **`classToZod()` function**: Convert classes with class-validator and class-transformer decorators back to Zod schemas
- Full round-trip conversion support: Zod → Class → Zod and Class → Zod → Class
- **100% type preservation** in both directions with 117/117 tests passing

#### Enhanced Array Support
- Array length constraints: `.min()`, `.max()`, `.length()`, `.nonempty()`
- Mapping between Zod array methods and class-validator decorators (`@ArrayMinSize`, `@ArrayMaxSize`, `@ArrayNotEmpty`)
- **Primitive array item constraints preservation** using transparent metadata storage
  - `z.array(z.string().min(2))` fully preserved in round-trips
  - Works for all Zod primitive constraints on array items
  - No user code changes required

#### Date Range Validation
- `z.date().min(date)` ↔ `@MinDate(date)`
- `z.date().max(date)` ↔ `@MaxDate(date)`
- Full bidirectional support with proper Date object handling

#### String Pattern Matching
- `z.string().startsWith('prefix')` → `@Matches(/^prefix/)`
- `z.string().endsWith('suffix')` → `@Matches(/suffix$/)`
- Automatic escaping of special regex characters

#### Specialized String Validators
- Support for base64, hexadecimal, JWT, nanoid, ulid formats
- Maps to appropriate class-validator decorators

#### Deep Nesting Support
- Tested and verified up to 5 levels of nesting
- Arrays at multiple nesting levels
- Optional nested objects at various depths
- Complex combinations (arrays within objects within arrays)

### Fixed
- **Critical fix**: ZodArray length constraints extraction
  - ZodArray stores constraints in `_def.minLength`/`_def.maxLength`/`_def.exactLength`, not in `_def.checks`
  - Updated schema walker to handle array constraints correctly
- @Length validator mapping (exact length constraint)
- Arrays of objects with @Type decorator
- Nested object validation with @ValidateNested()

### Documentation
- Comprehensive README with bidirectional conversion examples
- ARRAY_CONSTRAINTS_SOLUTION.md - Detailed solution documentation
- ENHANCED_FEATURES_SUMMARY.md - Feature summary with test results
- DATA_LOSS_ANALYSIS.md - Complete data preservation analysis

### Technical
- 117 total tests (up from 96), all passing
- 24 round-trip tests, all passing
- Zero data loss in bidirectional conversions
- Metadata storage system for array item constraints
- Proper TypeScript declaration files
- Full peer dependency support for Zod, class-validator, class-transformer

## [0.0.1] - Initial Release

### Added
- Initial implementation of `zodToClass()`
- Convert Zod schemas to TypeScript classes at runtime
- Generate TypeScript code strings from Zod schemas
- Basic class-validator decorator mapping
- Basic class-transformer decorator mapping
- Support for nested objects and arrays
- Support for discriminated unions
- Support for enums, optional, and nullable types
- String and number validators
- TypeScript type preservation

[0.1.0]: https://github.com/hisco/zodify/releases/tag/v0.1.0
[0.0.1]: https://github.com/hisco/zodify/releases/tag/v0.0.1
