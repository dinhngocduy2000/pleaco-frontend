import { describe, expect, it } from 'vitest'
import { updateMapMetadataFormSchema } from '@/schemas/map-schemas'

describe('map metadata validation', () => {
  const schema = updateMapMetadataFormSchema()

  it.each(['', '   ', 'x'.repeat(51)])('rejects invalid name %j', (name) => {
    expect(schema.safeParse({ name }).success).toBe(false)
  })

  it('trims names and accepts the maximum text lengths', () => {
    expect(schema.parse({ name: ` ${'x'.repeat(50)} `, description: 'd'.repeat(250) })).toEqual({
      name: 'x'.repeat(50),
      description: 'd'.repeat(250),
    })
  })

  it('rejects descriptions longer than 250 characters', () => {
    expect(schema.safeParse({ name: 'Map', description: 'd'.repeat(251) }).success).toBe(false)
  })

  it.each([undefined, null, [], ['00000000-0000-4000-8000-000000000001']])(
    'accepts optional and nullable UUID tags: %j',
    (tags) => {
      expect(schema.safeParse({ name: 'Map', tags }).success).toBe(true)
    },
  )

  it('rejects invalid UUIDs and non-string metadata', () => {
    expect(schema.safeParse({ name: 'Map', tags: ['not-a-uuid'] }).success).toBe(false)
    expect(schema.safeParse({ name: 123 }).success).toBe(false)
    expect(schema.safeParse({ name: 'Map', description: 123 }).success).toBe(false)
  })
})
