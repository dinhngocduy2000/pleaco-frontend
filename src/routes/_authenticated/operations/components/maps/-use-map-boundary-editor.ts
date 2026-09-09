import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useRef, useState } from 'react'
import type { IMapBoundaryCoordinate } from '@/interface/maps'
import {
  clampCanvasPoint,
  getBoundaryPointUpdate,
  getMovedBoundaryPoints,
  hasMinimumCanvasMovement,
  type MapCanvasPoint,
  worldPointToCanvas,
} from './-map-boundary-geometry'
import {
  getMapGridPreviewGeometry,
  MAP_CANVAS_PADDING,
  MAP_PIXELS_PER_METER,
} from './-map-grid-preview'

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const SCALE_STEP = 0.5
const CLOSURE_TOLERANCE = 10
const DRAG_THRESHOLD = 2

/** Controlled boundary state and callbacks used by the canvas editor. */
export type MapBoundaryEditorProps = {
  /** Map width in meters. */
  dimensionX: number
  /** Map height in meters. */
  dimensionY: number
  /** World vertices in drawing order, without a repeated closing point. */
  points: IMapBoundaryCoordinate[]
  /** Whether the final vertex connects back to the first. */
  closed: boolean
  /** Enables drawing interactions; vertex dragging must also be gated by the caller. */
  interactive: boolean
  /** Receives accepted world vertices and closure state for the parent to persist. */
  onChange: (points: IMapBoundaryCoordinate[], closed: boolean) => void
  /** Reports a rejected geometric edit without changing the controlled boundary. */
  onInvalid: () => void
  /** Applies feature-specific validation after the shared polygon checks. */
  canChange?: (points: IMapBoundaryCoordinate[], closed: boolean) => boolean
  /** Handles a click on empty canvas while editing a closed polygon. */
  onBackgroundClick?: () => void
}

/** Initial and preview map-local pixel positions for an endpoint extension gesture. */
type ExtensionState = {
  start: MapCanvasPoint
  preview: MapCanvasPoint
}

/**
 * Coordinates controlled boundary editing with local zoom and endpoint-drag previews.
 * World vertices remain in meters; canvas projections include zoom but exclude padding.
 * Rejected edits call `onInvalid`; accepted edits are emitted through `onChange`.
 *
 * @param props - Map dimensions, controlled boundary state, interaction flag, and callbacks.
 * @param props.dimensionX - Map width in meters.
 * @param props.dimensionY - Map height in meters.
 * @param props.points - Controlled world-coordinate vertices without a repeated closing point.
 * @param props.closed - Whether the controlled polygon is closed.
 * @param props.interactive - Whether pointer and vertex editing interactions are enabled.
 * @param props.onChange - Receives accepted vertices and closure state.
 * @param props.onInvalid - Reports a rejected shared or feature-specific geometry update.
 * @param props.canChange - Optional feature-specific validator applied after shared validation.
 * @param props.onBackgroundClick - Optional callback for clicks outside a closed polygon.
 * @returns Canvas geometry, zoom availability, extension preview, and Konva event handlers.
 */
export function useMapBoundaryEditor({
  dimensionX,
  dimensionY,
  points,
  closed,
  interactive,
  onChange,
  onInvalid,
  canChange,
  onBackgroundClick,
}: MapBoundaryEditorProps) {
  const [scale, setScale] = useState(1)
  const [extension, setExtension] = useState<ExtensionState>()
  const suppressClick = useRef(false)
  const geometry = getMapGridPreviewGeometry(dimensionX, dimensionY, scale)
  const pixelsPerMeter = MAP_PIXELS_PER_METER * scale
  const canvasPoints = points.map((point) => worldPointToCanvas(point, dimensionY, pixelsPerMeter))

  /**
   * Reads the stage pointer, removes canvas padding, and clamps it to the map bounds.
   *
   * @param stage - Konva stage supplying the current pointer position.
   * @returns The clamped map-local pointer, or undefined when it cannot be resolved.
   */
  const getCanvasPointer = (stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition()
    if (!pointer || !geometry) return undefined
    return clampCanvasPoint(pointer, geometry.mapWidth, geometry.mapHeight, MAP_CANVAS_PADDING)
  }

  /**
   * Emits an accepted append/closure update or reports invalid geometry.
   *
   * @param canvasPoint - Candidate map-local canvas position.
   * @returns Nothing; invokes either `onChange` or `onInvalid`.
   */
  const commitCanvasPoint = (canvasPoint: MapCanvasPoint) => {
    const update = getBoundaryPointUpdate({
      canvasPoint,
      canvasPoints,
      points,
      dimensionX,
      dimensionY,
      pixelsPerMeter,
      closureTolerance: CLOSURE_TOLERANCE,
    })
    if (update && (!canChange || canChange(update.points, update.closed))) {
      onChange(update.points, update.closed)
    } else onInvalid()
  }

  /**
   * Adds or closes a boundary on click, consuming the synthetic click after an extension drag.
   *
   * @param event - Konva mouse event emitted by the stage.
   * @returns Nothing; may emit an accepted point update or background-click callback.
   */
  const handleStageClick = (event: KonvaEventObject<MouseEvent>) => {
    if (!interactive) return
    if (closed) {
      onBackgroundClick?.()
      return
    }
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }

    const stage = event.target.getStage()
    if (!stage) return
    const pointer = getCanvasPointer(stage)
    if (pointer) commitCanvasPoint(pointer)
  }

  /**
   * Starts an endpoint extension preview and prevents the event from bubbling to the stage.
   *
   * @param event - Konva mouse event emitted by an endpoint handle.
   * @returns Nothing; may initialize the extension preview.
   */
  const handleEndpointMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    if (!interactive || closed || points.length === 0) return
    event.cancelBubble = true
    const stage = event.target.getStage()
    if (!stage) return
    const pointer = getCanvasPointer(stage)
    if (pointer) setExtension({ start: pointer, preview: pointer })
  }

  /**
   * Updates the clamped extension preview while an endpoint gesture is active.
   *
   * @param event - Konva mouse event emitted as the pointer moves over the stage.
   * @returns Nothing; may update the extension preview position.
   */
  const handleStageMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    if (!extension) return
    const stage = event.target.getStage()
    if (!stage) return
    const pointer = getCanvasPointer(stage)
    if (pointer) setExtension((current) => (current ? { ...current, preview: pointer } : current))
  }

  /**
   * Ends the preview and commits drags of at least two pixels, suppressing the following click.
   *
   * @param event - Konva mouse event emitted when the stage pointer is released.
   * @returns Nothing; may commit a new endpoint and clear the extension preview.
   */
  const handleStageMouseUp = (event: KonvaEventObject<MouseEvent>) => {
    if (!extension) return
    const stage = event.target.getStage()
    if (!stage) return
    const pointer = getCanvasPointer(stage)
    const moved = pointer && hasMinimumCanvasMovement(extension.start, pointer, DRAG_THRESHOLD)
    setExtension(undefined)
    if (!pointer || !moved) return
    suppressClick.current = true
    commitCanvasPoint(pointer)
  }

  /**
   * Stops vertex-click bubbling and attempts closure when the first of at least three vertices is clicked.
   *
   * @param index - Zero-based index of the clicked vertex.
   * @param event - Konva mouse event emitted by the vertex handle.
   * @returns Nothing; may close the polygon or report invalid geometry.
   */
  const handleVertexClick = (index: number, event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true
    const firstCanvasPoint = canvasPoints[0]
    if (!interactive || closed || index !== 0 || points.length < 3 || !firstCanvasPoint) return

    const update = getBoundaryPointUpdate({
      canvasPoint: firstCanvasPoint,
      canvasPoints,
      points,
      dimensionX,
      dimensionY,
      pixelsPerMeter,
      closureTolerance: CLOSURE_TOLERANCE,
    })
    if (update && (!canChange || canChange(update.points, update.closed))) {
      onChange(update.points, update.closed)
    } else onInvalid()
  }

  /**
   * Validates and emits a moved vertex. The caller must disable dragging when editing is unavailable.
   *
   * @param index - Zero-based index of the dragged vertex.
   * @param event - Konva drag event containing the vertex's final canvas position.
   * @returns Nothing; emits the updated vertices or reports invalid geometry.
   */
  const handleVertexDragEnd = (index: number, event: KonvaEventObject<DragEvent>) => {
    if (!geometry) return
    const nextPoints = getMovedBoundaryPoints({
      points,
      index,
      canvasPoint: clampCanvasPoint(
        { x: event.target.x(), y: event.target.y() },
        geometry.mapWidth,
        geometry.mapHeight,
      ),
      dimensionX,
      dimensionY,
      pixelsPerMeter,
      closed,
    })
    if (nextPoints && (!canChange || canChange(nextPoints, closed))) onChange(nextPoints, closed)
    else onInvalid()
  }

  /**
   * Increases display scale by one step, capped at the maximum zoom.
   *
   * @returns Nothing; updates the local zoom scale.
   */
  const handleZoomIn = () => setScale((current) => Math.min(MAX_SCALE, current + SCALE_STEP))
  /**
   * Decreases display scale by one step, capped at the minimum zoom.
   *
   * @returns Nothing; updates the local zoom scale.
   */
  const handleZoomOut = () => setScale((current) => Math.max(MIN_SCALE, current - SCALE_STEP))

  return {
    canvasPoints,
    canZoomIn: scale < MAX_SCALE,
    canZoomOut: scale > MIN_SCALE,
    extension,
    geometry,
    handleEndpointMouseDown,
    handleStageClick,
    handleStageMouseMove,
    handleStageMouseUp,
    handleVertexClick,
    handleVertexDragEnd,
    handleZoomIn,
    handleZoomOut,
    scale,
  }
}
