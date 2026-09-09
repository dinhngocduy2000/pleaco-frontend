import { useRef, useState } from 'react'
import { GeometryType, MapZoneType } from '@/enum/maps'
import type { IMapBoundaryCoordinate } from '@/interface/maps'
import {
  doesPathOverlapPolygons,
  isPathContainedInBoundary,
  serializeBoundary,
} from './-map-boundary-geometry'
import {
  createEmptyZoneDrafts,
  type IMapZoneDrafts,
  type IMapZoneShape,
  type MapLayoutTool,
} from './-map-zone-types'

export type MapLayoutValidationError = 'BOUNDARY_INVALID' | 'ZONE_INVALID' | 'ZONE_OVERLAP'

/** Boundary state and callbacks required to coordinate layout editing. */
type UseMapZonesOptions = {
  boundaryPoints: IMapBoundaryCoordinate[]
  boundaryClosed: boolean
  boundaryEditable: boolean
  boundaryValid: boolean
  disabled: boolean
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
  disabled,
  onBoundaryChange,
  onBoundaryClear,
  onBoundaryUndo,
}: UseMapZonesOptions) {
  const nextId = useRef(1)
  const invalidReason = useRef<MapLayoutValidationError | undefined>(undefined)
  const [activeTool, setActiveTool] = useState<MapLayoutTool>(MapZoneType.BOUNDARY)
  const [zones, setZones] = useState<IMapZoneShape[]>([])
  const [drafts, setDrafts] = useState<IMapZoneDrafts>(createEmptyZoneDrafts)
  const [selectedZoneId, setSelectedZoneId] = useState<string>()
  const [validationError, setValidationError] = useState<MapLayoutValidationError>()
  const selectedZone = zones.find((zone) => zone.clientId === selectedZoneId)
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
    activeTool === MapZoneType.BOUNDARY
      ? boundaryEditable && boundaryPoints.length > 0
      : isAreaZoneType(activeTool) &&
        (drafts[activeTool].points.length > 0 || zones.some((zone) => zone.zoneType === activeTool))
  const activeCanClear =
    activeTool === MapZoneType.BOUNDARY
      ? boundaryEditable && boundaryPoints.length > 0
      : isAreaZoneType(activeTool) && drafts[activeTool].points.length > 0
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
    if (!closed) {
      setDrafts((current) => ({ ...current, [zoneType]: { points } }))
      return
    }
    setZones((current) => [
      ...current,
      {
        clientId: `map-zone-${nextId.current++}`,
        zoneType,
        geometry: { type: GeometryType.POLYGON, coordinates: serializeBoundary(points) },
      },
    ])
    setDrafts((current) => ({ ...current, [zoneType]: { points: [] } }))
  }

  /**
   * Replaces the selected zone's geometry after an accepted reshape.
   *
   * @param points - Updated world-coordinate vertices without a repeated closing point.
   * @returns Nothing; leaves state unchanged when no zone is selected.
   */
  const handleSelectedZoneChange = (points: IMapBoundaryCoordinate[]) => {
    if (!selectedZoneId) return
    setZones((current) =>
      current.map((zone) =>
        zone.clientId === selectedZoneId
          ? { ...zone, geometry: { ...zone.geometry, coordinates: serializeBoundary(points) } }
          : zone,
      ),
    )
  }

  /**
   * Routes an accepted editor update to the boundary, selected zone, or active draft.
   *
   * @param points - Accepted world-coordinate vertices without a repeated closing point.
   * @param closed - Whether the editor path is closed.
   * @returns Nothing; updates the state owned by the active tool.
   */
  const handleActiveChange = (points: IMapBoundaryCoordinate[], closed: boolean) => {
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
    zones.every((zone) => isPathContainedInBoundary(geometryToPoints(zone), points, true)) &&
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
    const otherZones = zones
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

  /**
   * Removes the latest draft point or reopens the latest completed zone of a type.
   *
   * @param zoneType - Non-boundary zone type whose latest change should be undone.
   * @returns Nothing; leaves state unchanged when the type has no draft or completed zone.
   */
  const handleUndoZone = (zoneType: IMapZoneShape['zoneType']) => {
    if (drafts[zoneType].points.length > 0) {
      setDrafts((current) => ({
        ...current,
        [zoneType]: { points: current[zoneType].points.slice(0, -1) },
      }))
      return
    }
    const latestIndex = zones.reduce(
      (latest, zone, index) => (zone.zoneType === zoneType ? index : latest),
      -1,
    )
    if (latestIndex < 0) return
    const latestZone = zones[latestIndex]
    setZones((current) => current.filter((_, index) => index !== latestIndex))
    setDrafts((current) => ({ ...current, [zoneType]: { points: geometryToPoints(latestZone) } }))
    if (selectedZoneId === latestZone.clientId) setSelectedZoneId(undefined)
  }

  /**
   * Undoes the latest operation for the active drawing tool.
   *
   * @returns Nothing; delegates to boundary undo or updates zone state.
   */
  const handleUndo = () => {
    clearValidationError()
    if (activeTool === MapZoneType.BOUNDARY) onBoundaryUndo()
    else if (isAreaZoneType(activeTool)) handleUndoZone(activeTool)
  }

  /**
   * Clears the boundary or draft associated with the active drawing tool.
   *
   * @returns Nothing; delegates to boundary clearing or clears an active zone draft.
   */
  const handleClear = () => {
    clearValidationError()
    if (activeTool === MapZoneType.BOUNDARY) onBoundaryClear()
    else if (isAreaZoneType(activeTool)) {
      setDrafts((current) => ({ ...current, [activeTool]: { points: [] } }))
    }
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
    if (!selectedZoneId) return
    setZones((current) => current.filter((zone) => zone.clientId !== selectedZoneId))
    setSelectedZoneId(undefined)
  }

  return {
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
    zones,
  }
}
