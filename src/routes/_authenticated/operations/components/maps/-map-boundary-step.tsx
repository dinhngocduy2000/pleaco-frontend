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
  isValidBoundaryPolygon,
  serializeBoundary,
} from './-map-boundary-geometry'
import { MapLayoutToolbar } from './-map-layout-toolbar'
import { type MapLayoutValidationError, useMapZones } from './-use-map-zones'

const t = getTranslations()

type MapBoundaryStepProps = {
  map: IMapListInfo
  onClose: () => void
  mode?: 'create' | 'adjust'
  onSavingChange?: (saving: boolean) => void
}

const getValidationMessage = (error: MapLayoutValidationError | undefined) => {
  if (error === 'BOUNDARY_INVALID') return t.map_boundary_invalid_shape()
  if (error === 'ZONE_OVERLAP') return t.map_layout_zone_overlap_error()
  if (error === 'ZONE_INVALID') return t.map_layout_invalid_zone()
  return undefined
}

export function MapBoundaryStep({
  map,
  onClose,
  mode = 'create',
  onSavingChange,
}: MapBoundaryStepProps) {
  const [initial] = useState<InitialBoundaryState>(() => getInitialBoundary(map, mode))
  const [method, setMethod] = useState<MapBoundarySource>(initial.method)
  const [points, setPoints] = useState<IMapBoundaryCoordinate[]>(initial.points)
  const [closed, setClosed] = useState<boolean>(initial.closed)
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

  const handleBoundaryChange = (nextPoints: IMapBoundaryCoordinate[], nextClosed: boolean) => {
    setPoints(nextPoints)
    setClosed(nextClosed)
  }

  const zoneEditor = useMapZones({
    boundaryPoints,
    boundaryClosed,
    boundaryEditable: isCustom,
    boundaryValid: boundaryIsValid,
    disabled: isSaving || initial.unsupported,
    onBoundaryChange: handleBoundaryChange,
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
    (mode === 'create' && isCustom) || (mode === 'adjust' && zoneEditor.activeTool !== 'SELECT')

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
            activeTool={zoneEditor.activeTool}
            deleteDisabled={!zoneEditor.selectedZoneId}
            disabled={isSaving || initial.unsupported}
            zoneToolsDisabled={!boundaryIsValid}
            onDelete={zoneEditor.handleDeleteSelectedZone}
            onToolChange={zoneEditor.handleToolChange}
          />
        )}
        <MapBoundaryEditor
          activeZoneType={zoneEditor.activeZoneType}
          boundaryClosed={boundaryClosed}
          boundaryPoints={boundaryPoints}
          canChange={mode === 'adjust' ? zoneEditor.canChangeActive : undefined}
          closed={zoneEditor.activeClosed}
          dimensionX={map.dimension_x}
          dimensionY={map.dimension_y}
          drafts={zoneEditor.drafts}
          interactive={zoneEditor.activeInteractive}
          points={zoneEditor.activePoints}
          selectedZoneId={zoneEditor.selectedZoneId}
          selectionMode={zoneEditor.activeTool === 'SELECT'}
          zones={zoneEditor.zones}
          onBackgroundClick={() => zoneEditor.setSelectedZoneId(undefined)}
          onChange={zoneEditor.handleActiveChange}
          onInvalid={zoneEditor.handleInvalid}
          onSelectZone={zoneEditor.setSelectedZoneId}
        />
      </div>
      <div className="border-t bg-background px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid flex-1 gap-2 md:max-w-xl">
            <span className="text-sm font-medium">{t.map_boundary_method_label()}</span>
            <AppSelectComponent
              ariaLabel={t.map_boundary_method_label()}
              disabled={
                isSaving || initial.unsupported || zoneEditor.activeTool !== MapZoneType.BOUNDARY
              }
              options={methodOptions}
              value={selectedMethod}
              onChange={handleMethodChange}
            />
            <p className="text-sm text-muted-foreground">
              {zoneEditor.activeTool === MapZoneType.BOUNDARY
                ? isCustom
                  ? t.map_boundary_custom_instructions()
                  : t.map_boundary_full_instructions()
                : zoneEditor.activeTool === 'SELECT'
                  ? t.map_layout_select_instructions()
                  : t.map_layout_zone_instructions()}
            </p>
            <p aria-live="polite" className="text-sm text-destructive">
              {initial.unsupported
                ? t.map_boundary_adjust_unsupported()
                : getValidationMessage(zoneEditor.validationError)}
            </p>
            {zoneEditor.activeTool !== 'SELECT' && zoneEditor.activePoints.length > 0 && (
              <>
                <p aria-live="polite" className="text-xs text-muted-foreground">
                  {zoneEditor.activeTool === MapZoneType.BOUNDARY
                    ? t.map_boundary_point_count({ count: zoneEditor.activePoints.length })
                    : t.map_layout_point_count({ count: zoneEditor.activePoints.length })}
                </p>
                <span className="sr-only">
                  {zoneEditor.activeClosed
                    ? t.map_layout_polygon_closed()
                    : t.map_layout_polygon_open()}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {showDrawingActions && (
              <>
                <Button
                  disabled={!zoneEditor.activeCanUndo || isSaving}
                  type="button"
                  variant="outline"
                  onClick={zoneEditor.handleUndo}
                >
                  <Undo2 />
                  {t.map_boundary_undo()}
                </Button>
                <Button
                  disabled={!zoneEditor.activeCanClear || isSaving}
                  type="button"
                  variant="outline"
                  onClick={zoneEditor.handleClear}
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
