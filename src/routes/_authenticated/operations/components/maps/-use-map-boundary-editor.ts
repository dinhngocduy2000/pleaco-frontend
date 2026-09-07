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
}: MapBoundaryEditorProps) {
  const [scale, setScale] = useState(1)
  const [extension, setExtension] = useState<ExtensionState>()
  const suppressClick = useRef(false)
  const geometry = getMapGridPreviewGeometry(dimensionX, dimensionY, scale)
  const pixelsPerMeter = MAP_PIXELS_PER_METER * scale
  const canvasPoints = points.map((point) => worldPointToCanvas(point, dimensionY, pixelsPerMeter))

  /**
   * Reads the stage pointer, removes canvas padding, and clamps it to the map bounds.
   */
  const getCanvasPointer = (stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition()
    if (!pointer || !geometry) return undefined
    return clampCanvasPoint(pointer, geometry.mapWidth, geometry.mapHeight, MAP_CANVAS_PADDING)
  }

  /**
   * Emits an accepted append/closure update or reports invalid geometry.
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
    if (update) onChange(update.points, update.closed)
    else onInvalid()
  }

  /**
   * Adds or closes a boundary on click, consuming the synthetic click after an extension drag.
   */
  const handleStageClick = (event: KonvaEventObject<MouseEvent>) => {
    if (!interactive || closed) return
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
    if (update) onChange(update.points, update.closed)
    else onInvalid()
  }

  /**
   * Validates and emits a moved vertex. The caller must disable dragging when editing is unavailable.
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
    if (nextPoints) onChange(nextPoints, closed)
    else onInvalid()
  }

  /**
   * Increases display scale by one step, capped at the maximum zoom.
   */
  const handleZoomIn = () => setScale((current) => Math.min(MAX_SCALE, current + SCALE_STEP))
  /**
   * Decreases display scale by one step, capped at the minimum zoom.
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
