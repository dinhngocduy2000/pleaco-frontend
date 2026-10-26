import { z } from 'zod'
import { getTranslations } from '@/lib/translation'

export const updateMapMetadataFormSchema = () => {
  const t = getTranslations()

  return z.object({
    name: z
      .string()
      .trim()
      .min(1, { message: t.validation_map_name_required() })
      .max(50, { message: t.validation_map_metadata_name_max() }),
    description: z
      .string()
      .max(250, { message: t.validation_map_metadata_description_max() })
      .optional(),
    tags: z.array(z.uuid({ message: t.validation_map_metadata_tag_invalid() })).nullish(),
  })
}

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
