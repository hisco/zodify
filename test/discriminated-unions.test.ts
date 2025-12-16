import 'reflect-metadata';
import { z } from 'zod';
import { zodToClass } from '../src';

describe('Discriminated Unions', () => {
  it('should generate classes for discriminated union variants', () => {
    const schema = z.object({
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

    const CapabilityClass = zodToClass(schema, { className: 'Capability' });
    expect(CapabilityClass).toBeDefined();
  });

  it('should handle discriminated union with type property', () => {
    const schema = z.object({
      event: z.discriminatedUnion('kind', [
        z.object({
          kind: z.literal('click'),
          x: z.number(),
          y: z.number(),
        }),
        z.object({
          kind: z.literal('keypress'),
          key: z.string(),
        }),
      ]),
    });

    const EventClass = zodToClass(schema, { className: 'Event' });
    expect(EventClass).toBeDefined();

    const event1 = new EventClass({
      event: { kind: 'click', x: 100, y: 200 },
    });

    expect(event1.event.kind).toBe('click');

    const event2 = new EventClass({
      event: { kind: 'keypress', key: 'Enter' },
    });

    expect(event2.event.kind).toBe('keypress');
  });
});
