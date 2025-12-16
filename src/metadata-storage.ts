import { z } from 'zod';

/**
 * Symbol used to store Zod item schemas in class metadata
 * This allows preserving array item constraints during round-trip conversions
 */
export const ZODIFY_ITEM_SCHEMA_KEY = Symbol('zodify:itemSchema');

/**
 * Store Zod item schema for a property
 * Used to preserve array item constraints during Zod → Class → Zod conversion
 */
export function setItemSchema(
  target: any,
  propertyName: string,
  itemSchema: z.ZodTypeAny
): void {
  if (!Reflect.hasMetadata(ZODIFY_ITEM_SCHEMA_KEY, target)) {
    Reflect.defineMetadata(ZODIFY_ITEM_SCHEMA_KEY, new Map(), target);
  }

  const metadataMap = Reflect.getMetadata(ZODIFY_ITEM_SCHEMA_KEY, target) as Map<string, z.ZodTypeAny>;
  metadataMap.set(propertyName, itemSchema);
}

/**
 * Get Zod item schema for a property
 * Returns undefined if no item schema was stored
 */
export function getItemSchema(
  target: any,
  propertyName: string
): z.ZodTypeAny | undefined {
  if (!Reflect.hasMetadata(ZODIFY_ITEM_SCHEMA_KEY, target)) {
    return undefined;
  }

  const metadataMap = Reflect.getMetadata(ZODIFY_ITEM_SCHEMA_KEY, target) as Map<string, z.ZodTypeAny>;
  return metadataMap.get(propertyName);
}
