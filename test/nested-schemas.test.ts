import 'reflect-metadata';
import { z } from 'zod';
import { zodToClass } from '../src';
import { plainToInstance } from 'class-transformer';

describe('Nested Schemas', () => {
  it('should generate nested classes for object properties', () => {
    const schema = z.object({
      name: z.string(),
      address: z.object({
        street: z.string(),
        city: z.string(),
        zipCode: z.string(),
      }),
    });

    const UserClass = zodToClass(schema, { className: 'User' });
    expect(UserClass).toBeDefined();

    const user = new UserClass({
      name: 'John',
      address: { street: '123 Main St', city: 'Boston', zipCode: '02101' },
    });

    expect(user.name).toBe('John');
    expect(user.address).toBeDefined();
  });

  it('should handle arrays of objects', () => {
    const schema = z.object({
      name: z.string(),
      tags: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        })
      ),
    });

    const UserClass = zodToClass(schema, { className: 'User' });
    expect(UserClass).toBeDefined();

    const user = new UserClass({
      name: 'John',
      tags: [
        { label: 'admin', value: '1' },
        { label: 'user', value: '2' },
      ],
    });

    expect(user.tags).toHaveLength(2);
  });

  it('should handle deeply nested objects', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          settings: z.object({
            theme: z.string(),
            notifications: z.boolean(),
          }),
        }),
      }),
    });

    const DataClass = zodToClass(schema, { className: 'Data' });
    expect(DataClass).toBeDefined();

    const data = new DataClass({
      user: {
        profile: {
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
      },
    });

    expect(data.user.profile.settings.theme).toBe('dark');
  });

  it('should transform nested objects with class-transformer', () => {
    const schema = z.object({
      name: z.string(),
      address: z.object({
        street: z.string(),
        city: z.string(),
      }),
    });

    const UserClass = zodToClass(schema, { className: 'User' });

    const plain = {
      name: 'John',
      address: { street: '123 Main St', city: 'Boston' },
    };

    const user = plainToInstance(UserClass, plain) as any;
    expect(user.name).toBe('John');
    expect(user.address).toBeDefined();
  });
});
