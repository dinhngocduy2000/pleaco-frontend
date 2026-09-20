import { useRef, useState } from 'react'
import { GeometryType, MapZoneType } from '@/enum/maps'
import type { IMapBoundaryCoordinate } from '@/interface/maps'
import {
  doesPathOverlapPolygons,
  isPathContainedInBoundary,
  serializeBoundary,
} from './-map-boundary-geometry'
import { getLayoutIssues } from './-map-layout-issues'
import type { IMapZoneShape, MapLayoutTool } from './-map-zone-types'
import { useEditHistory } from './-use-edit-history'

export type MapLayoutValidationError = 'BOUNDARY_INVALID' | 'ZONE_INVALID' | 'ZONE_OVERLAP'

/** Boundary state and callbacks required to coordinate layout editing. */
type UseMapZonesOptions = {
  boundaryPoints: IMapBoundaryCoordinate[]
  boundaryClosed: boolean
  boundaryEditable: boolean
  boundaryCanUndo: boolean
  boundaryCanClear: boolean
  boundaryValid: boolean
  disabled: boolean
  initialZones?: IMapZoneShape[]
  onBoundaryChange: (points: IMapBoundaryCoordinate[], closed: boolean) => void
  onBoundaryClear: () => void
  onBoundaryUndo: () => void
}

/**
 * Narrows a layout tool to one of the non-boundary zone types.
 *
 * @param tool - Currently selected layout tool.
 * @returns Whether the tool draws an obstacle, no-go zone, or cleaning zone.
 */
const isAreaZoneType = (tool: MapLayoutTool): tool is IMapZoneShape['zoneType'] =>
  tool === MapZoneType.OBSTACLE || tool === MapZoneType.NO_GO || tool === MapZoneType.CLEANING_ZONE

/**
 * Converts a stored, explicitly closed zone geometry into editor vertices.
 *
 * @param zone - Zone to convert, or undefined when no zone is selected.
 * @returns World-coordinate vertices without the repeated closing coordinate.
 */
const geometryToPoints = (zone: IMapZoneShape | undefined): IMapBoundaryCoordinate[] => {
  const points = zone?.geometry.coordinates[0] ?? []
  return points.slice(0, -1).map(([x, y]) => [x, y])
}

/**
 * Coordinates layout-tool state, zone drafts, completed zones, and geometry validation.
 *
 * @param options - Current boundary state and callbacks for boundary mutations.
 * @param options.boundaryPoints - Effective boundary vertices without a repeated closing point.
 * @param options.boundaryClosed - Whether the effective boundary is closed.
 * @param options.boundaryEditable - Whether the active boundary can be changed.
 * @param options.boundaryValid - Whether zone drawing may use the effective boundary.
 * @param options.disabled - Whether all canvas editing interactions are disabled.
 * @param options.onBoundaryChange - Receives accepted boundary vertices and closure state.
 * @param options.onBoundaryClear - Clears the editable boundary.
 * @param options.onBoundaryUndo - Undoes the latest boundary operation.
 * @returns Layout editor state, derived interaction flags, validators, and action handlers.
 */
export function useMapZones({
  boundaryPoints,
  boundaryClosed,
  boundaryEditable,
  boundaryValid,
  boundaryCanUndo,
  boundaryCanClear,
  disabled,
  initialZones = [],
  onBoundaryChange,
  onBoundaryClear,
  onBoundaryUndo,
}: UseMapZonesOptions) {
  const nextId = useRef(1)
  const invalidReason = useRef<MapLayoutValidationError | undefined>(undefined)
  const [activeTool, setActiveTool] = useState<MapLayoutTool>(MapZoneType.BOUNDARY)
  const initialType = (type: IMapZoneShape['zoneType']) => ({
    zones: initialZones.filter((zone) => zone.zoneType === type),
    draft: { points: [] as IMapBoundaryCoordinate[] },
  })
  const histories = {
    [MapZoneType.OBSTACLE]: useEditHistory(initialType(MapZoneType.OBSTACLE)),
    [MapZoneType.NO_GO]: useEditHistory(initialType(MapZoneType.NO_GO)),
    [MapZoneType.CLEANING_ZONE]: useEditHistory(initialType(MapZoneType.CLEANING_ZONE)),
  }
  const zones = Object.values(histories).flatMap((history) => history.value.zones)
  const drafts = {
    [MapZoneType.OBSTACLE]: histories.OBSTACLE.value.draft,
    [MapZoneType.NO_GO]: histories.NO_GO.value.draft,
    [MapZoneType.CLEANING_ZONE]: histories.CLEANING_ZONE.value.draft,
  }
  const [selectedZoneId, setSelectedZoneId] = useState<string>()
  const [validationError, setValidationError] = useState<MapLayoutValidationError>()
  const visibleZones = zones.filter((zone) => !zone.to_delete)
  const selectedZone = visibleZones.find((zone) => zone.clientId === selectedZoneId)
  const selectedZonePoints = geometryToPoints(selectedZone)
  const activeZoneType =
    activeTool === 'SELECT' ? (selectedZone?.zoneType ?? MapZoneType.BOUNDARY) : activeTool
  const activePoints =
    activeTool === MapZoneType.BOUNDARY
      ? boundaryPoints
      : activeTool === 'SELECT'
        ? selectedZonePoints
        : drafts[activeTool].points
  const activeClosed =
    activeTool === MapZoneType.BOUNDARY ? boundaryClosed : activeTool === 'SELECT'
  const activeInteractive =
    !disabled &&
    (activeTool === MapZoneType.BOUNDARY
      ? boundaryEditable
      : activeTool === 'SELECT'
        ? Boolean(selectedZone)
        : boundaryValid)
  const activeCanUndo =
    !disabled &&
    (activeTool === MapZoneType.BOUNDARY
      ? boundaryCanUndo
      : isAreaZoneType(activeTool) && histories[activeTool].canUndo)
  const activeCanClear =
    !disabled &&
    (activeTool === MapZoneType.BOUNDARY
      ? boundaryCanClear
      : isAreaZoneType(activeTool) && histories[activeTool].canClear)
  const issues = getLayoutIssues(visibleZones, drafts, boundaryPoints, boundaryClosed)
  const hasOpenPolygon = Object.values(drafts).some((draft) => draft.points.length > 0)

  /**
   * Clears the current layout validation error.
   *
   * @returns Nothing; resets validation state.
   */
  const clearValidationError = () => setValidationError(undefined)

  /**
   * Persists an open draft or commits a newly closed zone.
   *
   * @param zoneType - Non-boundary type being drawn.
   * @param points - Proposed world-coordinate vertices without a repeated closing point.
   * @param closed - Whether the proposed vertices form a completed polygon.
   * @returns Nothing; updates draft or completed-zone state.
   */
  const handleZoneChange = (
    zoneType: IMapZoneShape['zoneType'],
    points: IMapBoundaryCoordinate[],
    closed: boolean,
  ) => {
    const history = histories[zoneType]
    if (!closed) {
      history.change((current) => ({ ...current, draft: { points } }))
      return
    }
    const clientId = `map-zone-${nextId.current++}`
    history.change((current) => ({
      zones: [
        ...current.zones,
        {
          clientId,
          to_delete: false,
          zoneType,
          geometry: { type: GeometryType.POLYGON, coordinates: serializeBoundary(points) },
        },
      ],
      draft: { points: [] },
    }))
  }

  /**
   * Replaces the selected zone's geometry after an accepted reshape.
   *
   * @param points - Updated world-coordinate vertices without a repeated closing point.
   * @returns Nothing; leaves state unchanged when no zone is selected.
   */
  const handleSelectedZoneChange = (points: IMapBoundaryCoordinate[]) => {
    if (!selectedZone) return
    const history = histories[selectedZone.zoneType]
    history.change({
      ...history.value,
      zones: history.value.zones.map((zone) =>
        zone.clientId === selectedZoneId
          ? { ...zone, geometry: { ...zone.geometry, coordinates: serializeBoundary(points) } }
          : zone,
      ),
    })
  }

  /**
   * Routes an accepted editor update to the boundary, selected zone, or active draft.
   *
   * @param points - Accepted world-coordinate vertices without a repeated closing point.
   * @param closed - Whether the editor path is closed.
   * @returns Nothing; updates the state owned by the active tool.
   */
  const handleActiveChange = (points: IMapBoundaryCoordinate[], closed: boolean) => {
    if (disabled) return
    clearValidationError()
    if (activeTool === MapZoneType.BOUNDARY) onBoundaryChange(points, closed)
    else if (activeTool === 'SELECT') handleSelectedZoneChange(points)
    else handleZoneChange(activeTool, points, closed)
  }

  /**
   * Checks that all completed zones and drafts fit within a proposed boundary.
   *
   * @param points - Proposed closed boundary vertices.
   * @returns Whether every current zone path is contained by the proposed boundary.
   */
  const zonesFitBoundary = (points: IMapBoundaryCoordinate[]) =>
    visibleZones.every((zone) => isPathContainedInBoundary(geometryToPoints(zone), points, true)) &&
    Object.values(drafts).every((draft) => isPathContainedInBoundary(draft.points, points, false))

  /**
   * Applies tool-specific containment and overlap checks to an editor update.
   *
   * @param points - Proposed world-coordinate vertices without a repeated closing point.
   * @param closed - Whether the proposed path is closed.
   * @returns Whether the active boundary or zone may accept the proposed update.
   */
  const canChangeActive = (points: IMapBoundaryCoordinate[], closed: boolean) => {
    invalidReason.current = undefined
    if (activeTool === MapZoneType.BOUNDARY) return !closed || zonesFitBoundary(points)
    if (!isPathContainedInBoundary(points, boundaryPoints, closed)) return false

    const excludedZoneId = activeTool === 'SELECT' ? selectedZoneId : undefined
    const otherZones = visibleZones
      .filter((zone) => zone.clientId !== excludedZoneId)
      .map(geometryToPoints)
    if (!doesPathOverlapPolygons(points, closed, otherZones)) return true

    invalidReason.current = 'ZONE_OVERLAP'
    return false
  }

  /**
   * Records the most specific validation error available for the rejected edit.
   *
   * @returns Nothing; updates validation state and consumes the pending reason.
   */
  const handleInvalid = () => {
    const fallback = activeTool === MapZoneType.BOUNDARY ? 'BOUNDARY_INVALID' : 'ZONE_INVALID'
    setValidationError(invalidReason.current ?? fallback)
    invalidReason.current = undefined
  }

  /** Restores one accepted edit for the active type, never crossing its baseline. */
  const handleUndo = () => {
    if (!activeCanUndo) return
    clearValidationError()
    setSelectedZoneId(undefined)
    if (activeTool === MapZoneType.BOUNDARY) onBoundaryUndo()
    else if (isAreaZoneType(activeTool)) histories[activeTool].undo()
  }

  /** Discards all unsaved edits for the active type. */
  const handleClear = () => {
    if (!activeCanClear) return
    clearValidationError()
    setSelectedZoneId(undefined)
    if (activeTool === MapZoneType.BOUNDARY) onBoundaryClear()
    else if (isAreaZoneType(activeTool)) histories[activeTool].clear()
  }

  /**
   * Selects a layout tool and clears incompatible zone selection state.
   *
   * @param tool - Boundary, zone drawing, or selection tool to activate.
   * @returns Nothing; updates the active layout tool.
   */
  const handleToolChange = (tool: MapLayoutTool) => {
    setActiveTool(tool)
    clearValidationError()
    if (tool !== 'SELECT') setSelectedZoneId(undefined)
  }

  /**
   * Removes the selected completed zone, if one exists.
   *
   * @returns Nothing; updates completed-zone and selection state.
   */
  const handleDeleteSelectedZone = () => {
    if (disabled || !selectedZone) return
    const history = histories[selectedZone.zoneType]
    history.change({
      ...history.value,
      zones:
        selectedZone.id === undefined
          ? history.value.zones.filter((zone) => zone.clientId !== selectedZoneId)
          : history.value.zones.map((zone) =>
              zone.clientId === selectedZoneId ? { ...zone, to_delete: true } : zone,
            ),
    })
    setSelectedZoneId(undefined)
  }

  return {
    issues,
    activeCanClear,
    activeCanUndo,
    activeClosed,
    activeInteractive,
    activePoints,
    activeTool,
    activeZoneType,
    canChangeActive,
    clearValidationError,
    drafts,
    handleActiveChange,
    handleClear,
    handleDeleteSelectedZone,
    handleInvalid,
    handleToolChange,
    handleUndo,
    hasOpenPolygon,
    selectedZoneId,
    setSelectedZoneId,
    validationError,
    visibleZones,
    zones,
  }
}
