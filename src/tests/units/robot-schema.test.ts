import { describe, expect, it } from 'vitest'
import { RobotModel } from '@/enum/robot'
import { createRobotFormSchema } from '@/schemas/robot-schemas'

const validRobot = {
  name: 'Pleaco One',
  serial_num: 'PL-2026-0042',
  model: RobotModel.STANDARD,
  ip_address: '192.168.1.42',
  tags: ['00000000-0000-4000-8000-000000000001'],
}

describe('createRobotFormSchema', () => {
  it('trims accepted identity fields and validates an IPv4 address', () => {
    const result = createRobotFormSchema().safeParse({
      ...validRobot,
      name: ' Pleaco One ',
      serial_num: ' PL-2026-0042 ',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({
        ...validRobot,
        name: 'Pleaco One',
        serial_num: 'PL-2026-0042',
      })
    }
  })

  it('accepts an IPv6 address', () => {
    expect(
      createRobotFormSchema().safeParse({ ...validRobot, ip_address: '2001:db8::1' }).success,
    ).toBe(true)
  })

  it('rejects missing required fields, invalid IP addresses, and values over 50 characters', () => {
    const schema = createRobotFormSchema()

    expect(schema.safeParse({ ...validRobot, name: '' }).success).toBe(false)
    expect(schema.safeParse({ ...validRobot, serial_num: '' }).success).toBe(false)
    expect(schema.safeParse({ ...validRobot, model: undefined }).success).toBe(false)
    expect(schema.safeParse({ ...validRobot, ip_address: 'not-an-ip' }).success).toBe(false)
    expect(schema.safeParse({ ...validRobot, name: 'a'.repeat(51) }).success).toBe(false)
    expect(schema.safeParse({ ...validRobot, serial_num: 'a'.repeat(51) }).success).toBe(false)
  })
})
