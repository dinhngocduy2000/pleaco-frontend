import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    validation_email_required: () => 'Email required',
    validation_email_invalid: () => 'Email invalid',
    validation_password_required: () => 'Password required',
    validation_name_required: () => 'Name required',
    validation_password_min_length: () => 'Password too short',
    validation_password_lowercase: () => 'Password lowercase',
    validation_password_uppercase: () => 'Password uppercase',
    validation_password_number: () => 'Password number',
    validation_password_special: () => 'Password special',
    validation_confirm_password_required: () => 'Confirm required',
    validation_passwords_mismatch: () => 'Passwords differ',
    validation_otp_required: () => 'OTP required',
    validation_otp_incorrect: () => 'OTP incorrect',
  }),
}))

import {
  createEmailSchemas,
  createOtpSchemas,
  createPasswordSchemas,
  createRegisterFormSchemas,
} from '@/schemas/auth-schemas'

describe('auth schemas', () => {
  it('trims email, password, and OTP input before validating', () => {
    expect(createEmailSchemas().parse({ email: '  user@example.com ' }).email).toBe(
      'user@example.com',
    )
    expect(createPasswordSchemas().safeParse({ password: '  ' }).success).toBe(false)
    expect(createOtpSchemas().parse({ otp: ' 123456 ' }).otp).toBe('123456')
  })

  it('requires a secure matching registration password', () => {
    const schema = createRegisterFormSchemas()
    expect(
      schema.safeParse({
        name: ' A ',
        email: 'a@b.com',
        password: 'Password1!',
        confirmPassword: 'Password1!',
      }).success,
    ).toBe(true)
    const result = schema.safeParse({
      name: '',
      email: 'bad',
      password: 'short',
      confirmPassword: 'other',
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.message)).toContain('Passwords differ')
  })
})
