import { z } from 'zod'
import { getTranslations } from '@/lib/translation'

const toTrimmedString = (value: string) => {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

export const createGroupFormSchema = () => {
  const t = getTranslations()
  return z.object({
    name: z.preprocess(
      toTrimmedString,
      z
        .string()
        .min(1, { message: t.validation_group_name_required() })
        .max(50, { message: t.validation_group_name_max_length() }),
    ),
    description: z.preprocess(
      toTrimmedString,
      z
        .string()
        .max(250, { message: t.validation_group_description_max_length() })
        .optional()
        .or(z.literal('')),
    ),
  })
}

export const inviteGroupMemberFormSchema = () => {
  const t = getTranslations()
  return z.object({
    email: z.preprocess(
      toTrimmedString,
      z.string().min(1, { message: t.validation_email_required() }).email({
        message: t.validation_email_invalid(),
      }),
    ),
    role: z.string().min(1, { message: t.group_invite_member_role_required() }),
  })
}

export const updateGroupMemberFormSchema = () => {
  const t = getTranslations()
  return z.object({
    role: z.string().min(1, { message: t.group_invite_member_role_required() }),
  })
}
