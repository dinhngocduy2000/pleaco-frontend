import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { GeometryType, MapBoundarySource, MapZoneType } from '@/enum/maps'
import type {
  Geometry,
  IDockingStationInfo,
  IMapBoundaryCoordinate,
  IMapDetailZoneInfo,
  IMapLayoutBoundarySave,
  ISaveMapLayoutRequest,
} from '@/interface/maps'
import type { IAxiosError, IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { useSaveMapLayoutMutation } from '@/queries/use-maps-query'
import {
  getFullMapBoundaries,
  getInitialBoundary,
  type IMapBoundaryEditorMap,
  type InitialBoundaryState,
  isValidBoundaryPolygon,
  serializeBoundary,
} from './-map-boundary-geometry'
import { DOCKING_STATION_TOOL } from './-map-zone-types'
import { useEditHistory } from './-use-edit-history'
import { type MapLayoutValidationError, useMapZones } from './-use-map-zones'

const t = getTranslations()
const MAX_ENVIRONMENT_ZONES_PER_REQUEST = 100
const MAX_DOCKING_STATIONS_PER_REQUEST = 100

export type MapBoundaryStepProps = {
  map: IMapBoundaryEditorMap
  zones?: IMapDetailZoneInfo[]
  dockingStations?: IDockingStationInfo[]
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
 * @param method - Selected boundary source.
 * @param points - Custom boundary points without the repeated closing point.
 * @returns A dimensions or custom boundary save request.
 */
const createBoundaryRequest = (
  method: MapBoundarySource,
  points: IMapBoundaryCoordinate[],
): IMapLayoutBoundarySave =>
  method === MapBoundarySource.CUSTOM
    ? {
        source: MapBoundarySource.CUSTOM,
        geometry: {
          type: GeometryType.POLYGON,
          coordinates: serializeBoundary(points),
        },
      }
    : { source: MapBoundarySource.DIMENSIONS }

/**
 * Creates the effective GeoJSON polygon for the current boundary editor state.
 *
 * @param map - Map dimensions used by the full-map boundary method.
 * @param method - Selected boundary method.
 * @param points - Custom boundary points without the repeated closing point.
 * @returns A normalized, explicitly closed polygon geometry.
 */
const createBoundaryGeometry = (
  map: IMapBoundaryEditorMap,
  method: MapBoundarySource,
  points: IMapBoundaryCoordinate[],
): Geometry => ({
  type: GeometryType.POLYGON,
  coordinates:
    method === MapBoundarySource.CUSTOM
      ? serializeBoundary(points)
      : getFullMapBoundaries(map.dimension_x, map.dimension_y),
})

/**
 * Compares two normalized boundary GeoJSON objects, including point order.
 *
 * @param initialGeometry - Boundary geometry when the editor opened.
 * @param currentGeometry - Boundary geometry when Save was selected.
 * @returns Whether both GeoJSON polygon representations are identical.
 */
const boundaryGeometriesEqual = (initialGeometry: Geometry, currentGeometry: Geometry) =>
  JSON.stringify(initialGeometry) === JSON.stringify(currentGeometry)

/**
 * Coordinates boundary editing, zone editing, validation, and atomic layout saving.
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
  zones,
  dockingStations,
  mode = 'create',
  onClose,
  onSavingChange,
}: MapBoundaryStepProps) {
  const [initial] = useState<InitialBoundaryState>(() => getInitialBoundary(map, mode))
  const boundaryHistory = useEditHistory({
    method: initial.method,
    points: initial.points,
    closed: initial.closed,
  })
  const { method, points, closed } = boundaryHistory.value
  const [initialBoundaryGeometry, setInitialBoundaryGeometry] = useState<Geometry>(() =>
    createBoundaryGeometry(map, initial.method, initial.points),
  )
  const { isPending: isSaving, mutateAsync: saveMapLayout } = useSaveMapLayoutMutation()
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
    initialZones: (zones ?? []).map((zone) => ({
      clientId: zone.id,
      id: zone.id,
      to_delete: false,
      zoneType: zone.type,
      geometry: zone.geometry,
    })),
    initialDockingStations: (dockingStations ?? []).map((station) => ({
      clientId: station.id,
      id: station.id,
      to_delete: false,
      zoneType: DOCKING_STATION_TOOL,
      geometry: station.geometry,
      heading: station.heading,
      robot_id: station.robot_id,
    })),
    boundaryCanUndo: boundaryHistory.canUndo,
    boundaryCanClear: boundaryHistory.canClear,
    onBoundaryChange: (nextPoints, nextClosed) => {
      boundaryHistory.change({ method, points: nextPoints, closed: nextClosed })
    },
    onBoundaryClear: boundaryHistory.clear,
    onBoundaryUndo: boundaryHistory.undo,
  })
  const currentBoundaryGeometry = createBoundaryGeometry(map, method, points)
  const boundaryWasEdited = !boundaryGeometriesEqual(
    initialBoundaryGeometry,
    currentBoundaryGeometry,
  )
  const hasBoundaryChanges = mode === 'create' || boundaryWasEdited
  const hasUnsavedChanges =
    hasBoundaryChanges ||
    zoneEditor.hasEnvironmentZoneChanges ||
    zoneEditor.hasDockingStationChanges
  const hasOpenPolygon = (isCustom && points.length > 0 && !closed) || zoneEditor.hasOpenPolygon

  const handleMethodChange = (option: IOption | undefined) => {
    if (!option || option.disabled) return
    const nextMethod = option.value as MapBoundarySource
    boundaryHistory.change({
      method: nextMethod,
      points: nextMethod === MapBoundarySource.CUSTOM ? points : [],
      closed: nextMethod === MapBoundarySource.CUSTOM ? closed : false,
    })
    zoneEditor.clearValidationError()
  }

  const handleSave = async () => {
    if (isSaving || initial.unsupported || !hasUnsavedChanges || (isCustom && points.length === 0))
      return
    if (zoneEditor.issues.length > 0) {
      toast.error(t.map_layout_conflicts_error())
      return
    }
    if (hasOpenPolygon) {
      toast.error(t.map_layout_open_polygon_error())
      return
    }
    if (
      zoneEditor.hasEnvironmentZoneChanges &&
      zoneEditor.zones.length > MAX_ENVIRONMENT_ZONES_PER_REQUEST
    ) {
      toast.error(t.map_layout_zone_limit_error({ count: MAX_ENVIRONMENT_ZONES_PER_REQUEST }))
      return
    }
    if (zoneEditor.dockingStations.length > MAX_DOCKING_STATIONS_PER_REQUEST) {
      toast.error(t.map_layout_zone_limit_error({ count: MAX_DOCKING_STATIONS_PER_REQUEST }))
      return
    }

    try {
      const request: ISaveMapLayoutRequest = {
        map_id: map.id,
        ...(hasBoundaryChanges && { boundary: createBoundaryRequest(method, points) }),
        ...(zoneEditor.hasEnvironmentZoneChanges && {
          environment_zones: zoneEditor.zones.map(({ id, to_delete, zoneType, geometry }) =>
            id === undefined
              ? { to_delete, type: zoneType, geometry }
              : { id, to_delete, type: zoneType, geometry },
          ),
        }),
        ...(zoneEditor.hasDockingStationChanges && {
          docking_stations: zoneEditor.dockingStations.map(({ id, geometry, heading, robot_id }) =>
            id === undefined
              ? { geometry, heading, robot_id }
              : { id, geometry, heading, robot_id },
          ),
        }),
      }
      await saveMapLayout(request)
      if (hasBoundaryChanges) {
        boundaryHistory.commit()
        setInitialBoundaryGeometry(currentBoundaryGeometry)
      }
      if (zoneEditor.hasEnvironmentZoneChanges) zoneEditor.commitEnvironmentZones()
      if (zoneEditor.hasDockingStationChanges) zoneEditor.commitDockingStations()
      toast.success(t.map_layout_save_success())
      onClose()
    } catch (saveError) {
      const detail = (saveError as IAxiosError)?.response?.data?.detail
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
    saveDisabled:
      isSaving ||
      initial.unsupported ||
      zoneEditor.issues.length > 0 ||
      !hasUnsavedChanges ||
      (isCustom && points.length === 0),
    selectedMethod,
    showDrawingActions:
      (mode === 'create' && (isCustom || boundaryHistory.canUndo || boundaryHistory.canClear)) ||
      (mode === 'adjust' && zoneEditor.activeTool !== 'SELECT'),
    toolbarDisabled: isSaving || initial.unsupported,
    unsupported: initial.unsupported,
    validationMessage: getValidationMessage(zoneEditor.validationError),
    zoneToolsDisabled: !boundaryIsValid,
    zoneEditor,
  }
}
