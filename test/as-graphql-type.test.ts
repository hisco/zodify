import 'reflect-metadata';
import { Expose, Type } from 'class-transformer';
import { asGraphQLType } from '../src';

// NestJS GraphQL metadata storage for verification
const { TypeMetadataStorage } = require('@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage');
const { LazyMetadataStorage } = require('@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage');
const { Int, Float } = require('@nestjs/graphql');

/** Helper: get all @Field entries registered for a given class target */
function getFieldsForClass(target: any): any[] {
  LazyMetadataStorage.load();
  const allEntries = TypeMetadataStorage.metadataByTargetCollection.storageList;
  const fields: any[] = [];
  for (const entry of allEntries) {
    for (const f of entry.fields.all) {
      if (f.target === target) fields.push(f);
    }
  }
  return fields;
}

// ─── Test fixtures: simulated OpenAPI-generated classes ────────────────────

class Address {
  @Expose() street!: string;
  @Expose() city!: string;
  @Expose() zip!: string;

  static attributeTypeMap = [
    { name: 'street', type: 'string', description: 'Street address' },
    { name: 'city', type: 'string', description: 'City name' },
    { name: 'zip', type: 'string', description: 'Postal code' },
  ];
}

class Listener {
  @Expose() name!: string;
  @Expose() port!: number;
  @Expose() protocol!: string;

  static attributeTypeMap = [
    { name: 'name', type: 'string' },
    { name: 'port', type: 'number', format: 'int32' },
    { name: 'protocol', type: 'string' },
  ];
}

class Deployment {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() replicas!: number;
  @Expose() ready!: boolean;
  @Expose() createdAt!: Date;
  @Expose() tags!: string[];
  @Expose() score!: number;
  @Expose() @Type(() => Address) address!: Address;
  @Expose() @Type(() => Listener) listeners!: Listener[];
  @Expose() metadata!: any;
  @Expose() nickname?: string;

  static attributeTypeMap = [
    { name: 'id', type: 'string', description: 'Unique identifier' },
    { name: 'name', type: 'string', description: 'Deployment name' },
    { name: 'replicas', type: 'number', format: 'int32', description: 'Number of replicas' },
    { name: 'ready', type: 'boolean' },
    { name: 'createdAt', type: 'Date', format: 'date-time' },
    { name: 'tags', type: 'Array<string>' },
    { name: 'score', type: 'number', format: 'double' },
    { name: 'address', type: 'Address', modelClass: Address },
    { name: 'listeners', type: 'Array<Listener>', modelClass: Listener },
    { name: 'metadata', type: 'object' },
    { name: 'nickname', type: 'string | undefined' },
  ];
}

// A class with only @Expose and design:type (no attributeTypeMap)
class SimpleUser {
  @Expose() name!: string;
  @Expose() age!: number;
  @Expose() active!: boolean;
}

// A class with getAttributeTypeMap() method instead of static property
class WithMethod {
  @Expose() id!: string;
  @Expose() count!: number;

  static getAttributeTypeMap() {
    return [
      { name: 'id', type: 'string' },
      { name: 'count', type: 'number', format: 'int32' },
    ];
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('asGraphQLType', () => {
  describe('basic behavior', () => {
    it('should return a subclass, not mutate the original', () => {
      const Result = asGraphQLType(Address);
      expect(Result).not.toBe(Address);
      expect(Result.prototype).toBeInstanceOf(Address);
    });

    it('should preserve the constructor — instances are instanceof original', () => {
      const AddressModel = asGraphQLType(Address);
      const instance = new AddressModel();
      expect(instance).toBeInstanceOf(Address);
      expect(instance).toBeInstanceOf(AddressModel);
    });

    it('should use the class name by default', () => {
      const Result = asGraphQLType(Address);
      expect(Result.name).toBe('Address');
    });

    it('should use custom name when provided', () => {
      const Result = asGraphQLType(Address, { name: 'AddressModel' });
      expect(Result.name).toBe('AddressModel');
    });
  });

  describe('class-level decorators', () => {
    it('should register @ObjectType by default', () => {
      const Result = asGraphQLType(Address, { name: 'AddressOT' });

      const objectTypes = TypeMetadataStorage.getObjectTypesMetadata();
      const found = objectTypes.find((meta: any) => meta.target === Result);
      expect(found).toBeDefined();
      expect(found.name).toBe('AddressOT');
    });

    it('should register @InputType when type is InputType', () => {
      const Result = asGraphQLType(Address, { name: 'AddressIT', type: 'InputType' });

      LazyMetadataStorage.load();
      const inputTypes = TypeMetadataStorage.getInputTypesMetadata();
      const found = inputTypes.find((meta: any) => meta.target === Result);
      expect(found).toBeDefined();
    });
  });

  describe('scalar field types from attributeTypeMap', () => {
    let DeploymentModel: any;
    let fields: any[];

    beforeAll(() => {
      DeploymentModel = asGraphQLType(Deployment, { name: 'DeploymentFields' });
      fields = getFieldsForClass(DeploymentModel);
    });

    it('should map string fields to String', () => {
      const idField = fields.find((f: any) => f.name === 'id');
      expect(idField).toBeDefined();
      expect(idField.typeFn()).toBe(String);
    });

    it('should map number with int32 format to Int', () => {
      const replicasField = fields.find((f: any) => f.name === 'replicas');
      expect(replicasField).toBeDefined();
      expect(replicasField.typeFn()).toBe(Int);
    });

    it('should map number with double format to Float', () => {
      const scoreField = fields.find((f: any) => f.name === 'score');
      expect(scoreField).toBeDefined();
      expect(scoreField.typeFn()).toBe(Float);
    });

    it('should map boolean fields to Boolean', () => {
      const readyField = fields.find((f: any) => f.name === 'ready');
      expect(readyField).toBeDefined();
      expect(readyField.typeFn()).toBe(Boolean);
    });

    it('should map Date fields to Date', () => {
      const createdAtField = fields.find((f: any) => f.name === 'createdAt');
      expect(createdAtField).toBeDefined();
      expect(createdAtField.typeFn()).toBe(Date);
    });

    it('should include description from attributeTypeMap', () => {
      const idField = fields.find((f: any) => f.name === 'id');
      expect(idField.description).toBe('Unique identifier');
    });

    it('should mark optional fields as nullable', () => {
      const nicknameField = fields.find((f: any) => f.name === 'nickname');
      expect(nicknameField).toBeDefined();
      expect(nicknameField.options?.nullable).toBe(true);
    });
  });

  describe('array fields', () => {
    let DeploymentModel: any;
    let fields: any[];

    beforeAll(() => {
      DeploymentModel = asGraphQLType(Deployment, { name: 'DeploymentArrays' });
      fields = getFieldsForClass(DeploymentModel);
    });

    it('should map Array<string> to [String]', () => {
      const tagsField = fields.find((f: any) => f.name === 'tags');
      expect(tagsField).toBeDefined();
      // NestJS lazily unwraps [Type] on first typeFn() call → sets options.isArray
      expect(tagsField.typeFn()).toBe(String);
      expect(tagsField.options.isArray).toBe(true);
    });

    it('should map Array<NestedClass> to [SubClass]', () => {
      const listenersField = fields.find((f: any) => f.name === 'listeners');
      expect(listenersField).toBeDefined();
      const itemType = listenersField.typeFn();
      expect(listenersField.options.isArray).toBe(true);
      // Should be a subclass of Listener
      expect(itemType.prototype).toBeInstanceOf(Listener);
    });
  });

  describe('nested object fields', () => {
    it('should recursively process nested classes', () => {
      const DeploymentModel = asGraphQLType(Deployment, { name: 'DeploymentNested' });
      const fields = getFieldsForClass(DeploymentModel);

      const addressField = fields.find((f: any) => f.name === 'address');
      expect(addressField).toBeDefined();

      // The type function should return a subclass of Address
      const addressType = addressField.typeFn();
      expect(addressType.prototype).toBeInstanceOf(Address);

      // The nested class should also be registered as an ObjectType
      const objectTypes = TypeMetadataStorage.getObjectTypesMetadata();
      const nestedRegistered = objectTypes.find((meta: any) => meta.target === addressType);
      expect(nestedRegistered).toBeDefined();

      // The nested class should also have @Field decorators
      const nestedFields = getFieldsForClass(addressType);
      expect(nestedFields.length).toBeGreaterThanOrEqual(3);

      const streetField = nestedFields.find((f: any) => f.name === 'street');
      expect(streetField).toBeDefined();
      expect(streetField.typeFn()).toBe(String);
      expect(streetField.description).toBe('Street address');
    });

    it('should not process the same nested class twice', () => {
      const processedClasses = new Map();

      const D1 = asGraphQLType(Deployment, {
        name: 'DeploymentDedup1',
        processedClasses,
      });
      const D2 = asGraphQLType(Deployment, {
        name: 'DeploymentDedup2',
        processedClasses,
      });

      // Second call returns the cached subclass
      expect(D1).toBe(D2);
    });
  });

  describe('unknownScalar option', () => {
    it('should skip unknown-typed fields when unknownScalar is not set', () => {
      const DeploymentModel = asGraphQLType(Deployment, { name: 'DeploymentNoUnknown' });
      const fields = getFieldsForClass(DeploymentModel);

      const metadataField = fields.find((f: any) => f.name === 'metadata');
      expect(metadataField).toBeUndefined();
    });

    it('should use unknownScalar for unknown-typed fields when configured', () => {
      // Simulate a GraphQL scalar (like GraphQLJSON)
      const FakeJSONScalar = class GraphQLJSON {};

      const DeploymentModel = asGraphQLType(Deployment, {
        name: 'DeploymentWithUnknown',
        unknownScalar: FakeJSONScalar,
      });
      const fields = getFieldsForClass(DeploymentModel);

      const metadataField = fields.find((f: any) => f.name === 'metadata');
      expect(metadataField).toBeDefined();
      expect(metadataField.typeFn()).toBe(FakeJSONScalar);
    });
  });

  describe('design:type fallback (no attributeTypeMap)', () => {
    it('should infer types from design:type metadata', () => {
      const Result = asGraphQLType(SimpleUser, { name: 'SimpleUserGQL' });
      const fields = getFieldsForClass(Result);

      const nameField = fields.find((f: any) => f.name === 'name');
      expect(nameField).toBeDefined();
      expect(nameField.typeFn()).toBe(String);

      const ageField = fields.find((f: any) => f.name === 'age');
      expect(ageField).toBeDefined();
      expect(ageField.typeFn()).toBe(Float);

      const activeField = fields.find((f: any) => f.name === 'active');
      expect(activeField).toBeDefined();
      expect(activeField.typeFn()).toBe(Boolean);
    });
  });

  describe('getAttributeTypeMap() method support', () => {
    it('should read from getAttributeTypeMap() method', () => {
      const Result = asGraphQLType(WithMethod, { name: 'WithMethodGQL' });
      const fields = getFieldsForClass(Result);

      const idField = fields.find((f: any) => f.name === 'id');
      expect(idField).toBeDefined();
      expect(idField.typeFn()).toBe(String);

      const countField = fields.find((f: any) => f.name === 'count');
      expect(countField).toBeDefined();
      expect(countField.typeFn()).toBe(Int);
    });
  });

  describe('e2e: full deployment model', () => {
    it('should produce a fully decorated GraphQL type from an OpenAPI-generated class', () => {
      const DeploymentModel = asGraphQLType(Deployment, {
        name: 'DeploymentE2E',
        unknownScalar: class GraphQLJSON {},
      });

      // 1. Class is registered as ObjectType
      const objectTypes = TypeMetadataStorage.getObjectTypesMetadata();
      const classMeta = objectTypes.find((meta: any) => meta.target === DeploymentModel);
      expect(classMeta).toBeDefined();
      expect(classMeta.name).toBe('DeploymentE2E');

      // 2. All fields are registered
      const fields = getFieldsForClass(DeploymentModel);
      const fieldNames = fields.map((f: any) => f.name);
      expect(fieldNames).toEqual(expect.arrayContaining([
        'id', 'name', 'replicas', 'ready', 'createdAt',
        'tags', 'score', 'address', 'listeners', 'metadata', 'nickname',
      ]));

      // 3. Types are correct
      expect(fields.find((f: any) => f.name === 'id').typeFn()).toBe(String);
      expect(fields.find((f: any) => f.name === 'replicas').typeFn()).toBe(Int);
      expect(fields.find((f: any) => f.name === 'score').typeFn()).toBe(Float);
      expect(fields.find((f: any) => f.name === 'ready').typeFn()).toBe(Boolean);
      expect(fields.find((f: any) => f.name === 'createdAt').typeFn()).toBe(Date);

      // 4. Array types are correct (NestJS lazily unwraps [Type] on first typeFn() call)
      const tagsField = fields.find((f: any) => f.name === 'tags');
      expect(tagsField.typeFn()).toBe(String);
      expect(tagsField.options.isArray).toBe(true);

      const listenersField = fields.find((f: any) => f.name === 'listeners');
      const listenersResult = listenersField.typeFn();
      expect(listenersField.options.isArray).toBe(true);
      expect(listenersResult.prototype).toBeInstanceOf(Listener);

      // 5. Nested object type is correct
      const addressResult = fields.find((f: any) => f.name === 'address').typeFn();
      expect(addressResult.prototype).toBeInstanceOf(Address);

      // 6. Nested types are also registered as ObjectType
      const addressRegistered = objectTypes.some((meta: any) => meta.target === addressResult);
      const listenersRegistered = objectTypes.some((meta: any) => meta.target === listenersResult);
      expect(addressRegistered).toBe(true);
      expect(listenersRegistered).toBe(true);

      // 7. Descriptions are present
      expect(fields.find((f: any) => f.name === 'id').description).toBe('Unique identifier');
      expect(fields.find((f: any) => f.name === 'replicas').description).toBe('Number of replicas');

      // 8. Optional field is nullable
      expect(fields.find((f: any) => f.name === 'nickname').options?.nullable).toBe(true);

      // 9. Instances work correctly
      const instance = new DeploymentModel();
      expect(instance).toBeInstanceOf(Deployment);
      expect(instance).toBeInstanceOf(DeploymentModel);

      // 10. Can assign properties like normal
      instance.id = 'test-123';
      instance.name = 'my-deployment';
      instance.replicas = 3;
      expect(instance.id).toBe('test-123');
      expect(instance.name).toBe('my-deployment');
      expect(instance.replicas).toBe(3);
    });
  });
});
