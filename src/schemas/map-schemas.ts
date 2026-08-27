import { z } from 'zod'
import { getTranslations } from '@/lib/translation'

const toTrimmedString = (value: string) => {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

export const createMapFormSchema = () => {
  const t = getTranslations()

  return z.object({
    name: z.preprocess(
      toTrimmedString,
      z.string().min(1, { message: t.validation_map_name_required() }),
    ),
    description: z.preprocess(toTrimmedString, z.string()),
    dimension_x: z.coerce
      .number({ message: t.validation_map_dimension_required() })
      .positive({ message: t.validation_map_dimension_positive() }),
    dimension_y: z.coerce
      .number({ message: t.validation_map_dimension_required() })
      .positive({ message: t.validation_map_dimension_positive() }),
    robot_ids: z.array(z.string().uuid()),
    tag_ids: z.array(z.string().uuid()),
  })
}
