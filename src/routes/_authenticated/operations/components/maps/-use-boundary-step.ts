import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { GeometryType, MapBoundarySource, MapZoneType } from '@/enum/maps'
import type { IMapBoundaryCoordinate, IMapListInfo, ISaveMapBoundaries } from '@/interface/maps'
import type { IAxiosError, IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import {
  useCreateEnvironmentZonesMutation,
  useSaveMapBoundariesMutation,
} from '@/queries/use-maps-query'
import {
  getFullMapBoundaries,
  getInitialBoundary,
  type InitialBoundaryState,
  isValidBoundaryPolygon,
  serializeBoundary,
} from './-map-boundary-geometry'
import { type MapLayoutValidationError, useMapZones } from './-use-map-zones'

const t = getTranslations()
const MAX_ENVIRONMENT_ZONES_PER_REQUEST = 100

export type MapBoundaryStepProps = {
  map: IMapListInfo
  onClose: () => void
  mode?: 'create' | 'adjust'
  onSavingChange?: (saving: boolean) => void
}

/**
 * Converts a layout validation code into a localized user-facing message.
 *
 * @param error - Current validation code, or undefined when the layout is valid.
 * @returns The matching localized message, or undefined when there is no error.
 */
const getValidationMessage = (error: MapLayoutValidationError | undefined) => {
  if (error === 'BOUNDARY_INVALID') return t.map_boundary_invalid_shape()
  if (error === 'ZONE_OVERLAP') return t.map_layout_zone_overlap_error()
  if (error === 'ZONE_INVALID') return t.map_layout_invalid_zone()
  return undefined
}

/**
 * Builds the boundary payload for the selected boundary method.
 *
 * @param mapId - Identifier of the map being updated.
 * @param method - Selected boundary source.
 * @param points - Custom boundary points without the repeated closing point.
 * @returns A dimensions or custom boundary save request.
 */
const createBoundaryRequest = (
  mapId: string,
  method: MapBoundarySource,
  points: IMapBoundaryCoordinate[],
): ISaveMapBoundaries =>
  method === MapBoundarySource.CUSTOM
    ? {
        map_id: mapId,
        source: MapBoundarySource.CUSTOM,
        geometry: {
          type: GeometryType.POLYGON,
          coordinates: serializeBoundary(points),
        },
      }
    : { map_id: mapId, source: MapBoundarySource.DIMENSIONS }

/**
 * Coordinates boundary editing, zone editing, validation, and sequential layout saving.
 *
 * @param options - Map data, editor mode, and modal lifecycle callbacks.
 * @param options.map - Map whose boundary and zones are being edited.
 * @param options.mode - Whether the editor is creating a boundary or adjusting a layout.
 * @param options.onClose - Closes the containing modal after a successful save.
 * @param options.onSavingChange - Receives the combined boundary-and-zone saving state.
 * @returns Boundary and zone editor state, derived UI flags, and action handlers.
 */
export function useBoundaryStep({
  map,
  mode = 'create',
  onClose,
  onSavingChange,
}: MapBoundaryStepProps) {
  const [initial] = useState<InitialBoundaryState>(() => getInitialBoundary(map, mode))
  const [method, setMethod] = useState<MapBoundarySource>(initial.method)
  const [points, setPoints] = useState<IMapBoundaryCoordinate[]>(initial.points)
  const [closed, setClosed] = useState<boolean>(initial.closed)
  const [isSaving, setIsSaving] = useState(false)
  const { mutateAsync: saveMapBoundaries } = useSaveMapBoundariesMutation()
  const { mutateAsync: createEnvironmentZones } = useCreateEnvironmentZonesMutation()
  const methodOptions = useMemo<IOption[]>(
    () => [
      { label: t.map_boundary_method_full(), value: MapBoundarySource.DIMENSIONS },
      { label: t.map_boundary_method_custom(), value: MapBoundarySource.CUSTOM },
      {
        disabled: true,
        label: t.map_boundary_method_teach(),
        subLabel: t.map_boundary_coming_soon(),
        value: MapBoundarySource.TEACH_MODE,
      },
    ],
    [],
  )

  useEffect(() => {
    onSavingChange?.(isSaving)
  }, [isSaving, onSavingChange])

  const selectedMethod = methodOptions.find((option) => option.value === method)
  const isCustom = method === MapBoundarySource.CUSTOM
  const fullMapPoints = getFullMapBoundaries(map.dimension_x, map.dimension_y)[0].slice(0, -1)
  const boundaryPoints = isCustom ? points : fullMapPoints
  const boundaryClosed = isCustom ? closed : true
  const boundaryIsValid = isValidBoundaryPolygon(boundaryPoints, boundaryClosed)

  const zoneEditor = useMapZones({
    boundaryPoints,
    boundaryClosed,
    boundaryEditable: isCustom,
    boundaryValid: boundaryIsValid,
    disabled: isSaving || initial.unsupported,
    onBoundaryChange: (nextPoints, nextClosed) => {
      setPoints(nextPoints)
      setClosed(nextClosed)
    },
    onBoundaryClear: () => {
      setPoints([])
      setClosed(false)
    },
    onBoundaryUndo: () => {
      if (closed) setClosed(false)
      else setPoints((current) => current.slice(0, -1))
    },
  })
  const hasOpenPolygon = (isCustom && points.length > 0 && !closed) || zoneEditor.hasOpenPolygon

  const handleMethodChange = (option: IOption | undefined) => {
    if (!option || option.disabled) return
    setMethod(option.value as MapBoundarySource)
    zoneEditor.clearValidationError()
    if (option.value !== MapBoundarySource.CUSTOM) {
      setPoints([])
      setClosed(false)
    }
  }

  const handleSave = async () => {
    if (isSaving || initial.unsupported || (isCustom && points.length === 0)) return
    if (hasOpenPolygon) {
      toast.error(t.map_layout_open_polygon_error())
      return
    }
    if (zoneEditor.zones.length > MAX_ENVIRONMENT_ZONES_PER_REQUEST) {
      toast.error(t.map_layout_zone_limit_error({ count: MAX_ENVIRONMENT_ZONES_PER_REQUEST }))
      return
    }

    setIsSaving(true)
    try {
      await saveMapBoundaries(createBoundaryRequest(map.id, method, points))
      if (mode === 'adjust' && zoneEditor.zones.length > 0) {
        await createEnvironmentZones({
          map_id: map.id,
          zones: zoneEditor.zones.map(({ zoneType, geometry }) => ({
            type: zoneType,
            geometry,
          })),
        })
      }
      setIsSaving(false)
      toast.success(mode === 'adjust' ? t.map_layout_save_success() : t.map_boundary_save_success())
      onClose()
    } catch (saveError) {
      const detail = (saveError as IAxiosError)?.response?.data?.detail
      setIsSaving(false)
      toast.error(
        typeof detail === 'string' && detail
          ? detail
          : mode === 'adjust'
            ? t.map_layout_save_error()
            : t.map_boundary_save_error(),
      )
    }
  }

  return {
    boundaryClosed,
    boundaryMethodDisabled:
      isSaving || initial.unsupported || zoneEditor.activeTool !== MapZoneType.BOUNDARY,
    boundaryPoints,
    handleMethodChange,
    handleSave,
    isCustom,
    isSaving,
    methodOptions,
    saveDisabled: isSaving || initial.unsupported || (isCustom && points.length === 0),
    selectedMethod,
    showDrawingActions:
      (mode === 'create' && isCustom) || (mode === 'adjust' && zoneEditor.activeTool !== 'SELECT'),
    toolbarDisabled: isSaving || initial.unsupported,
    unsupported: initial.unsupported,
    validationMessage: getValidationMessage(zoneEditor.validationError),
    zoneToolsDisabled: !boundaryIsValid,
    zoneEditor,
  }
}
