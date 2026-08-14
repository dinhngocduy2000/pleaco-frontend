import { z } from 'zod'
import { getTranslations } from '@/lib/translation'

const toTrimmedString = (value: string) => {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

export const createEmailSchemas = () => {
  const t = getTranslations()
  return z.object({
    email: z.preprocess(
      toTrimmedString,
      z
        .string()
        .min(1, { message: t.validation_email_required() })
        .email({ message: t.validation_email_invalid() }),
    ),
  })
}

export const createPasswordSchemas = () => {
  const t = getTranslations()
  return z.object({
    password: z.preprocess(
      toTrimmedString,
      z.string().min(1, { message: t.validation_password_required() }),
    ),
  })
}

export const createLoginFormSchemas = () => {
  const t = getTranslations()
  return z.object({
    email: z
      .string()
      .min(1, { message: t.validation_email_required() })
      .email({ message: t.validation_email_invalid() }),

    password: z.string().min(1, { message: t.validation_password_required() }),
    is_save_session: z.boolean().default(false),
  })
}

export const createRegisterFormSchemas = () => {
  const t = getTranslations()
  return z
    .object({
      name: z.preprocess(
        toTrimmedString,
        z.string().min(1, { message: t.validation_name_required() }),
      ),
      email: z
        .string()
        .min(1, { message: t.validation_email_required() })
        .email({ message: t.validation_email_invalid() }),

      password: z
        .string()
        .min(1, { message: t.validation_password_required() })
        .min(8, { message: t.validation_password_min_length() })
        .regex(/[a-z]/, { message: t.validation_password_lowercase() })
        .regex(/[A-Z]/, { message: t.validation_password_uppercase() })
        .regex(/[0-9]/, { message: t.validation_password_number() })
        .regex(/[^a-zA-Z0-9]/, { message: t.validation_password_special() }),
      confirmPassword: z.string().min(1, { message: t.validation_confirm_password_required() }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t.validation_passwords_mismatch(),
      path: ['confirmPassword'],
    })
}

export const createOtpSchemas = () => {
  const t = getTranslations()
  return z.object({
    otp: z.preprocess(
      toTrimmedString,
      z
        .string()
        .min(1, { message: t.validation_otp_required() })
        .min(6, { message: t.validation_otp_incorrect() }),
    ),
  })
}

export const otpSchemas = () => {
  const t = getTranslations()
  return z.object({
    otp: z.preprocess(
      toTrimmedString,
      z
        .string()
        .min(1, { message: t.validation_otp_required() })
        .min(6, { message: t.validation_otp_incorrect() }),
    ),
  })
}
