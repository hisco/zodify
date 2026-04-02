import 'reflect-metadata';
import { z } from 'zod';
import { zodToClass } from '../src/zod-to-class';

// NestJS GraphQL uses lazy metadata storage — need to load before querying
const { TypeMetadataStorage } = require('@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage');
const { LazyMetadataStorage } = require('@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage');

/**
 * Tests verifying two reported issues with zodify's GraphQL support:
 *
 * Issue 1: Runtime zodToClass() doesn't apply class-level @ObjectType()/@InputType()
 *          decorators, so NestJS TypeMetadataStorage never learns about these classes.
 *
 * Issue 2: zodToClass.toCode() always inlines nested types with auto-generated names
 *          (e.g. GatewaysViewGatewaysItemRuntimeListenersItem) instead of referencing
 *          separately named/registered schemas.
 */

describe('GraphQL issues', () => {
  describe('Issue 1: Runtime class-level @ObjectType decorator', () => {
    it('should apply @ObjectType decorator to the generated class', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().int(),
      });

      const GeneratedClass = zodToClass(schema, {
        className: 'TestUser',
        includeGraphQL: true,
        graphqlType: 'ObjectType',
      });

      // ObjectType is stored eagerly, so it should be available immediately
      const objectTypes = TypeMetadataStorage.getObjectTypesMetadata();
      const found = objectTypes.find((meta: any) => meta.target === GeneratedClass);

      expect(found).toBeDefined();
      expect(found.name).toBe('TestUser');
    });

    it('should apply @InputType decorator when graphqlType is InputType', () => {
      const schema = z.object({
        email: z.string(),
      });

      const GeneratedClass = zodToClass(schema, {
        className: 'TestInput',
        includeGraphQL: true,
        graphqlType: 'InputType',
      });

      // InputType uses LazyMetadataStorage — need to load before querying
      LazyMetadataStorage.load();

      const inputTypes = TypeMetadataStorage.getInputTypesMetadata();
      const found = inputTypes.find((meta: any) => meta.target === GeneratedClass);

      expect(found).toBeDefined();
    });

    it('should apply @ObjectType to nested classes too', () => {
      const schema = z.object({
        address: z.object({
          street: z.string(),
          city: z.string(),
        }),
      });

      const GeneratedClass = zodToClass(schema, {
        className: 'TestPerson',
        includeGraphQL: true,
      });

      const objectTypes = TypeMetadataStorage.getObjectTypesMetadata();

      // Both the parent and nested class should be registered
      const parentFound = objectTypes.find((meta: any) => meta.target === GeneratedClass);
      expect(parentFound).toBeDefined();

      // The nested class should also be registered as an ObjectType
      const nestedFound = objectTypes.find(
        (meta: any) => meta.target?.name === 'TestPersonAddress'
      );
      expect(nestedFound).toBeDefined();
    });

    it('should register @Field metadata for properties on the runtime class', () => {
      const schema = z.object({
        name: z.string(),
        count: z.number().int(),
      });

      const GeneratedClass = zodToClass(schema, {
        className: 'TestWidget',
        includeGraphQL: true,
      });

      // @Field uses LazyMetadataStorage — load it
      LazyMetadataStorage.load();

      // @Field stores target as the class constructor (prototype.constructor)
      const allFields = TypeMetadataStorage.metadataByTargetCollection.storageList;
      const classFields: any[] = [];
      for (const entry of allFields) {
        for (const f of entry.fields.all) {
          if (f.target === GeneratedClass) classFields.push(f);
        }
      }

      const nameField = classFields.find((f: any) => f.name === 'name');
      expect(nameField).toBeDefined();

      const countField = classFields.find((f: any) => f.name === 'count');
      expect(countField).toBeDefined();
    });
  });

  describe('Issue 2: Codegen inlines nested types instead of referencing shared schemas', () => {
    it('shows the problem: shared schema gets inlined with auto-generated name', () => {
      const GatewayListenerSchema = z.object({
        name: z.string(),
        protocol: z.string(),
        port: z.number().int(),
      });

      const MergedGatewaySchema = z.object({
        cluster: z.string(),
        name: z.string(),
        runtimeListeners: z.array(GatewayListenerSchema).optional(),
      });

      const GatewaysViewSchema = z.object({
        gateways: z.array(MergedGatewaySchema),
        failedClusters: z.array(z.string()),
      });

      const code = zodToClass.toCode(GatewaysViewSchema, {
        className: 'GatewaysView',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
      });

      // Currently this generates names like:
      //   GatewaysViewGatewaysItem
      //   GatewaysViewGatewaysItemRuntimeListenersItem
      // instead of referencing MergedGateway and GatewayListener

      // This PASSES today — showing the problem exists:
      expect(code).toContain('GatewaysViewGatewaysItem');
      expect(code).toContain('GatewaysViewGatewaysItemRuntimeListenersItem');

      // Without a registry, registered names won't appear
      expect(code).not.toContain('MergedGateway');
      expect(code).not.toContain('GatewayListener');
    });

    it('should use registered names from a SchemaRegistry in toCode()', () => {
      const GatewayListenerSchema = z.object({
        name: z.string(),
        protocol: z.string(),
        port: z.number().int(),
      });

      const MergedGatewaySchema = z.object({
        cluster: z.string(),
        name: z.string(),
        runtimeListeners: z.array(GatewayListenerSchema).optional(),
      });

      const GatewaysViewSchema = z.object({
        gateways: z.array(MergedGatewaySchema),
        failedClusters: z.array(z.string()),
      });

      const { SchemaRegistry } = require('../src/schema-registry');
      const registry = new SchemaRegistry();
      registry.register('GatewayListener', GatewayListenerSchema);
      registry.register('MergedGateway', MergedGatewaySchema);

      const code = zodToClass.toCode(GatewaysViewSchema, {
        className: 'GatewaysView',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
        registry,
      });

      // Should reference MergedGateway (registered name) instead of auto-generated
      expect(code).toContain('MergedGateway');
      expect(code).not.toContain('GatewaysViewGatewaysItem');

      // Should NOT inline definitions for registered schemas
      // (they're defined elsewhere)
      expect(code).not.toContain('class MergedGateway');

      // GatewayListener is nested inside MergedGateway, which is external,
      // so it shouldn't appear in this output at all
      expect(code).not.toContain('GatewaysViewGatewaysItemRuntimeListenersItem');

      // Should still define the top-level class
      expect(code).toContain('class GatewaysView');

      // Now verify that generating MergedGateway with the registry
      // references GatewayListener instead of inlining
      const mergedCode = zodToClass.toCode(MergedGatewaySchema, {
        className: 'MergedGateway',
        includeGraphQL: true,
        includeValidators: false,
        includeTransformers: false,
        registry,
      });

      expect(mergedCode).toContain('GatewayListener');
      expect(mergedCode).not.toContain('MergedGatewayRuntimeListenersItem');
      expect(mergedCode).not.toContain('class GatewayListener');
    });

    it('should use registered names in runtime zodToClass() too', () => {
      const GatewayListenerSchema = z.object({
        name: z.string(),
        protocol: z.string(),
        port: z.number().int(),
      });

      const MergedGatewaySchema = z.object({
        cluster: z.string(),
        name: z.string(),
        runtimeListeners: z.array(GatewayListenerSchema).optional(),
      });

      const GatewaysViewSchema = z.object({
        gateways: z.array(MergedGatewaySchema),
        failedClusters: z.array(z.string()),
      });

      const { SchemaRegistry } = require('../src/schema-registry');
      const registry = new SchemaRegistry();

      // Generate leaf types first, register them, then generate dependent types
      const GatewayListener = zodToClass(GatewayListenerSchema, {
        className: 'GatewayListener',
        includeGraphQL: true,
      });
      registry.register('GatewayListener', GatewayListenerSchema, GatewayListener);

      const MergedGateway = zodToClass(MergedGatewaySchema, {
        className: 'MergedGateway',
        includeGraphQL: true,
        registry,
      });
      registry.register('MergedGateway', MergedGatewaySchema, MergedGateway);

      const GatewaysView = zodToClass(GatewaysViewSchema, {
        className: 'GatewaysView',
        includeGraphQL: true,
        registry,
      });

      // The generated class should exist and have the right name
      expect(GatewaysView.name).toBe('GatewaysView');

      // Nested classes should reference the registered ones, not generate new ones
      LazyMetadataStorage.load();
      const objectTypes = TypeMetadataStorage.getObjectTypesMetadata();
      const gatewaysViewMeta = objectTypes.find((m: any) => m.target === GatewaysView);
      expect(gatewaysViewMeta).toBeDefined();
    });
  });
});
