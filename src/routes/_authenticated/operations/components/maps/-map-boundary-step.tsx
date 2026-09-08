import { Trash2, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
import { Button } from '@/components/ui/button'
import { GeometryType, MapBoundarySource, MapZoneType } from '@/enum/maps'
import type { IMapBoundaryCoordinate, IMapListInfo } from '@/interface/maps'
import type { IAxiosError, IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { useSaveMapBoundariesMutation } from '@/queries/use-maps-query'
import { MapBoundaryEditor } from './-map-boundary-editor'
import {
  getFullMapBoundaries,
  getInitialBoundary,
  type InitialBoundaryState,
  isPathContainedInBoundary,
  isValidBoundaryPolygon,
  serializeBoundary,
} from './-map-boundary-geometry'
import { MapLayoutToolbar } from './-map-layout-toolbar'
import type { IMapZoneShape, MapLayoutTool } from './-map-zone-types'
import { useMapZones } from './-use-map-zones'

const t = getTranslations()

type MapBoundaryStepProps = {
  map: IMapListInfo
  onClose: () => void
  mode?: 'create' | 'adjust'
  onSavingChange?: (saving: boolean) => void
}

const isAreaZoneType = (tool: MapLayoutTool): tool is IMapZoneShape['zoneType'] =>
  tool === MapZoneType.OBSTACLE || tool === MapZoneType.NO_GO || tool === MapZoneType.CLEANING_ZONE

const geometryToEditorPoints = (zone: IMapZoneShape | undefined) =>
  (zone?.geometry.coordinates[0] ?? []).slice(0, -1).map(([x, y]): IMapBoundaryCoordinate => [x, y])

export function MapBoundaryStep({
  map,
  onClose,
  mode = 'create',
  onSavingChange,
}: MapBoundaryStepProps) {
  const [initial] = useState<InitialBoundaryState>(() => getInitialBoundary(map, mode))
  const [activeTool, setActiveTool] = useState<MapLayoutTool>(MapZoneType.BOUNDARY)
  const [method, setMethod] = useState<MapBoundarySource>(initial.method)
  const [points, setPoints] = useState<IMapBoundaryCoordinate[]>(initial.points)
  const [closed, setClosed] = useState<boolean>(initial.closed)
  const [error, setError] = useState<string>()
  const zoneEditor = useMapZones()
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
  const { mutate: saveMapBoundaries, isPending: isSaving } = useSaveMapBoundariesMutation({
    onSuccess: () => {
      toast.success(t.map_boundary_save_success())
      onClose()
    },
    onError: (saveError) => {
      const detail = (saveError as IAxiosError)?.response?.data?.detail
      toast.error(typeof detail === 'string' && detail ? detail : t.map_boundary_save_error())
    },
  })

  useEffect(() => {
    onSavingChange?.(isSaving)
  }, [isSaving, onSavingChange])

  const selectedMethod = methodOptions.find((option) => option.value === method)
  const isCustom = method === MapBoundarySource.CUSTOM
  const fullMapPoints = getFullMapBoundaries(map.dimension_x, map.dimension_y)[0].slice(0, -1)
  const boundaryPoints = isCustom ? points : fullMapPoints
  const boundaryClosed = isCustom ? closed : true
  const boundaryIsValid = isValidBoundaryPolygon(boundaryPoints, boundaryClosed)
  const selectedZonePoints = geometryToEditorPoints(zoneEditor.selectedZone)
  const activeZoneType =
    activeTool === 'SELECT'
      ? (zoneEditor.selectedZone?.zoneType ?? MapZoneType.BOUNDARY)
      : activeTool
  const activePoints =
    activeTool === MapZoneType.BOUNDARY
      ? boundaryPoints
      : activeTool === 'SELECT'
        ? selectedZonePoints
        : zoneEditor.drafts[activeTool].points
  const activeClosed =
    activeTool === MapZoneType.BOUNDARY ? boundaryClosed : activeTool === 'SELECT'
  const activeInteractive =
    !isSaving &&
    !initial.unsupported &&
    (activeTool === MapZoneType.BOUNDARY
      ? isCustom
      : activeTool === 'SELECT'
        ? Boolean(zoneEditor.selectedZone)
        : boundaryIsValid)
  const hasOpenPolygon =
    (isCustom && points.length > 0 && !closed) ||
    Object.values(zoneEditor.drafts).some((draft) => draft.points.length > 0)
  const activeCanUndo =
    activeTool === MapZoneType.BOUNDARY
      ? isCustom && points.length > 0
      : isAreaZoneType(activeTool) &&
        (zoneEditor.drafts[activeTool].points.length > 0 ||
          zoneEditor.zones.some((zone) => zone.zoneType === activeTool))
  const activeCanClear =
    activeTool === MapZoneType.BOUNDARY
      ? isCustom && points.length > 0
      : isAreaZoneType(activeTool) && zoneEditor.drafts[activeTool].points.length > 0

  const zonesFitBoundary = (nextBoundary: IMapBoundaryCoordinate[]) =>
    zoneEditor.zones.every((zone) =>
      isPathContainedInBoundary(geometryToEditorPoints(zone), nextBoundary, true),
    ) &&
    Object.values(zoneEditor.drafts).every((draft) =>
      isPathContainedInBoundary(draft.points, nextBoundary, false),
    )

  const handleMethodChange = (option: IOption | undefined) => {
    if (!option || option.disabled) return
    setMethod(option.value as MapBoundarySource)
    setError(undefined)
    if (option.value !== MapBoundarySource.CUSTOM) {
      setPoints([])
      setClosed(false)
    }
  }

  const handleBoundaryChange = (nextPoints: IMapBoundaryCoordinate[], nextClosed: boolean) => {
    setPoints(nextPoints)
    setClosed(nextClosed)
    setError(undefined)
  }

  const handleActiveChange = (nextPoints: IMapBoundaryCoordinate[], nextClosed: boolean) => {
    if (activeTool === MapZoneType.BOUNDARY) {
      handleBoundaryChange(nextPoints, nextClosed)
    } else if (activeTool === 'SELECT') {
      zoneEditor.handleSelectedZoneChange(nextPoints)
      setError(undefined)
    } else {
      zoneEditor.handleZoneChange(activeTool, nextPoints, nextClosed)
      setError(undefined)
    }
  }

  const canChangeActive = (nextPoints: IMapBoundaryCoordinate[], nextClosed: boolean) => {
    if (activeTool === MapZoneType.BOUNDARY) {
      return !nextClosed || zonesFitBoundary(nextPoints)
    }
    return isPathContainedInBoundary(nextPoints, boundaryPoints, nextClosed)
  }

  const handleUndo = () => {
    setError(undefined)
    if (activeTool === MapZoneType.BOUNDARY) {
      if (closed) setClosed(false)
      else setPoints((current) => current.slice(0, -1))
    } else if (isAreaZoneType(activeTool)) {
      zoneEditor.handleUndoZone(activeTool)
    }
  }

  const handleClear = () => {
    setError(undefined)
    if (activeTool === MapZoneType.BOUNDARY) {
      setPoints([])
      setClosed(false)
    } else if (isAreaZoneType(activeTool)) {
      zoneEditor.handleClearZoneDraft(activeTool)
    }
  }

  const handleToolChange = (tool: MapLayoutTool) => {
    setActiveTool(tool)
    setError(undefined)
    if (tool !== 'SELECT') zoneEditor.setSelectedZoneId(undefined)
  }

  const handleSave = () => {
    if (isSaving || initial.unsupported || (isCustom && points.length === 0)) return
    if (hasOpenPolygon) {
      toast.error(t.map_layout_open_polygon_error())
      return
    }
    saveMapBoundaries(
      isCustom
        ? {
            map_id: map.id,
            source: MapBoundarySource.CUSTOM,
            geometry: {
              type: GeometryType.POLYGON,
              coordinates: serializeBoundary(points),
            },
          }
        : { map_id: map.id, source: MapBoundarySource.DIMENSIONS },
    )
  }

  const showDrawingActions =
    (mode === 'create' && isCustom) || (mode === 'adjust' && activeTool !== 'SELECT')

  return (
    <div className="flex min-h-0 h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-muted/40 p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === 'adjust' ? t.map_boundary_adjust_title() : t.map_boundary_title()}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.map_boundary_description({ mapName: map.name })}
            </p>
          </div>
          <Button
            aria-label={t.map_create_close()}
            disabled={isSaving}
            size="icon"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            <X className="size-8 stroke-1" />
          </Button>
        </div>
        {mode === 'adjust' && (
          <MapLayoutToolbar
            activeTool={activeTool}
            deleteDisabled={!zoneEditor.selectedZoneId}
            disabled={isSaving || initial.unsupported}
            zoneToolsDisabled={!boundaryIsValid}
            onDelete={zoneEditor.handleDeleteSelectedZone}
            onToolChange={handleToolChange}
          />
        )}
        <MapBoundaryEditor
          activeZoneType={activeZoneType}
          boundaryClosed={boundaryClosed}
          boundaryPoints={boundaryPoints}
          canChange={mode === 'adjust' ? canChangeActive : undefined}
          closed={activeClosed}
          dimensionX={map.dimension_x}
          dimensionY={map.dimension_y}
          drafts={zoneEditor.drafts}
          interactive={activeInteractive}
          points={activePoints}
          selectedZoneId={zoneEditor.selectedZoneId}
          selectionMode={activeTool === 'SELECT'}
          zones={zoneEditor.zones}
          onBackgroundClick={() => zoneEditor.setSelectedZoneId(undefined)}
          onChange={handleActiveChange}
          onInvalid={() =>
            setError(
              activeTool === MapZoneType.BOUNDARY
                ? t.map_boundary_invalid_shape()
                : t.map_layout_invalid_zone(),
            )
          }
          onSelectZone={zoneEditor.setSelectedZoneId}
        />
      </div>
      <div className="border-t bg-background px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid flex-1 gap-2 md:max-w-xl">
            <span className="text-sm font-medium">{t.map_boundary_method_label()}</span>
            <AppSelectComponent
              ariaLabel={t.map_boundary_method_label()}
              disabled={isSaving || initial.unsupported || activeTool !== MapZoneType.BOUNDARY}
              options={methodOptions}
              value={selectedMethod}
              onChange={handleMethodChange}
            />
            <p className="text-sm text-muted-foreground">
              {activeTool === MapZoneType.BOUNDARY
                ? isCustom
                  ? t.map_boundary_custom_instructions()
                  : t.map_boundary_full_instructions()
                : activeTool === 'SELECT'
                  ? t.map_layout_select_instructions()
                  : t.map_layout_zone_instructions()}
            </p>
            <p aria-live="polite" className="text-sm text-destructive">
              {initial.unsupported ? t.map_boundary_adjust_unsupported() : error}
            </p>
            {activeTool !== 'SELECT' && activePoints.length > 0 && (
              <>
                <p aria-live="polite" className="text-xs text-muted-foreground">
                  {activeTool === MapZoneType.BOUNDARY
                    ? t.map_boundary_point_count({ count: activePoints.length })
                    : t.map_layout_point_count({ count: activePoints.length })}
                </p>
                <span className="sr-only">
                  {activeClosed ? t.map_layout_polygon_closed() : t.map_layout_polygon_open()}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {showDrawingActions && (
              <>
                <Button
                  disabled={!activeCanUndo || isSaving}
                  type="button"
                  variant="outline"
                  onClick={handleUndo}
                >
                  <Undo2 />
                  {t.map_boundary_undo()}
                </Button>
                <Button
                  disabled={!activeCanClear || isSaving}
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                >
                  <Trash2 />
                  {t.map_boundary_clear()}
                </Button>
              </>
            )}
            <Button disabled={isSaving} type="button" variant="ghost" onClick={onClose}>
              {mode === 'adjust' ? t.map_create_cancel() : t.map_boundary_maybe_later()}
            </Button>
            <Button
              disabled={isSaving || initial.unsupported || (isCustom && points.length === 0)}
              loading={isSaving}
              type="button"
              onClick={handleSave}
            >
              {t.map_boundary_save()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
