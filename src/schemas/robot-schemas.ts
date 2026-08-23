import { z } from 'zod'
import { RobotModel } from '@/enum/robot'
import { getTranslations } from '@/lib/translation'

const toTrimmedString = (value: string) => {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

export const createRobotFormSchema = () => {
  const t = getTranslations()

  return z.object({
    name: z.preprocess(
      toTrimmedString,
      z
        .string()
        .min(1, { message: t.validation_robot_name_required() })
        .max(50, { message: t.validation_robot_name_max_length() }),
    ),
    serial_num: z.preprocess(
      toTrimmedString,
      z
        .string()
        .min(1, { message: t.validation_robot_serial_required() })
        .max(50, { message: t.validation_robot_serial_max_length() }),
    ),
    model: z.enum(RobotModel, { message: t.validation_robot_model_required() }),
    map_id: z.string().uuid().optional(),
    ip_address: z.preprocess(
      toTrimmedString,
      z.union([z.ipv4(), z.ipv6()], { message: t.validation_robot_ip_invalid() }),
    ),
    tags: z.array(z.string().uuid()),
  })
}
