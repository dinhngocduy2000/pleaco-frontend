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

export type MapBoundaryEditorProps = {
  dimensionX: number
  dimensionY: number
  points: IMapBoundaryCoordinate[]
  closed: boolean
  interactive: boolean
  onChange: (points: IMapBoundaryCoordinate[], closed: boolean) => void
  onInvalid: () => void
}

type ExtensionState = {
  start: MapCanvasPoint
  preview: MapCanvasPoint
}

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

  const getCanvasPointer = (stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition()
    if (!pointer || !geometry) return undefined
    return clampCanvasPoint(pointer, geometry.mapWidth, geometry.mapHeight, MAP_CANVAS_PADDING)
  }

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

  const handleEndpointMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    if (!interactive || closed || points.length === 0) return
    event.cancelBubble = true
    const stage = event.target.getStage()
    if (!stage) return
    const pointer = getCanvasPointer(stage)
    if (pointer) setExtension({ start: pointer, preview: pointer })
  }

  const handleStageMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    if (!extension) return
    const stage = event.target.getStage()
    if (!stage) return
    const pointer = getCanvasPointer(stage)
    if (pointer) setExtension((current) => (current ? { ...current, preview: pointer } : current))
  }

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

  const handleZoomIn = () => setScale((current) => Math.min(MAX_SCALE, current + SCALE_STEP))
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
