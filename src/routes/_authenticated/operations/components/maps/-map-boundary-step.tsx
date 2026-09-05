import { Trash2, Undo2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
import { Button } from '@/components/ui/button'
import { GeometryType, MapBoundarySource } from '@/enum/maps'
import type { IMapBoundaryCoordinate, IMapListInfo } from '@/interface/maps'
import type { IAxiosError, IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { useSaveMapBoundariesMutation } from '@/queries/use-maps-query'
import { MapBoundaryEditor } from './-map-boundary-editor'
import {
  getFullMapBoundaries,
  isValidBoundaryPolygon,
  serializeBoundary,
} from './-map-boundary-geometry'

const t = getTranslations()

type MapBoundaryStepProps = {
  map: IMapListInfo
  onClose: () => void
}

export function MapBoundaryStep({ map, onClose }: MapBoundaryStepProps) {
  const [method, setMethod] = useState(MapBoundarySource.DIMENSIONS)
  const [points, setPoints] = useState<IMapBoundaryCoordinate[]>([])
  const [closed, setClosed] = useState(false)
  const [error, setError] = useState<string>()
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
  const selectedMethod = methodOptions.find((option) => option.value === method)
  const isCustom = method === MapBoundarySource.CUSTOM
  const customIsValid = isValidBoundaryPolygon(points, closed)
  const fullMapPoints = getFullMapBoundaries(map.dimension_x, map.dimension_y)[0].slice(0, -1)
  const displayedPoints = isCustom ? points : fullMapPoints

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

  const handleUndo = () => {
    setError(undefined)
    if (closed) {
      setClosed(false)
      return
    }
    setPoints((current) => current.slice(0, -1))
  }

  const handleClear = () => {
    setPoints([])
    setClosed(false)
    setError(undefined)
  }

  const handleSave = () => {
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

  return (
    <div className="flex min-h-0 h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-muted/40 p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{t.map_boundary_title()}</h2>
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
        <MapBoundaryEditor
          closed={isCustom ? closed : true}
          dimensionX={map.dimension_x}
          dimensionY={map.dimension_y}
          interactive={isCustom && !isSaving}
          points={displayedPoints}
          onChange={handleBoundaryChange}
          onInvalid={() => setError(t.map_boundary_invalid_shape())}
        />
      </div>
      <div className="border-t bg-background px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid flex-1 gap-2 md:max-w-xl">
            <span className="text-sm font-medium">{t.map_boundary_method_label()}</span>
            <AppSelectComponent
              ariaLabel={t.map_boundary_method_label()}
              disabled={isSaving}
              options={methodOptions}
              value={selectedMethod}
              onChange={handleMethodChange}
            />
            <p className="text-sm text-muted-foreground">
              {isCustom ? t.map_boundary_custom_instructions() : t.map_boundary_full_instructions()}
            </p>
            <p aria-live="polite" className="text-sm text-destructive">
              {error}
            </p>
            {isCustom && (
              <p aria-live="polite" className="text-xs text-muted-foreground">
                {t.map_boundary_point_count({ count: points.length })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isCustom && (
              <>
                <Button
                  disabled={points.length === 0 || isSaving}
                  type="button"
                  variant="outline"
                  onClick={handleUndo}
                >
                  <Undo2 />
                  {t.map_boundary_undo()}
                </Button>
                <Button
                  disabled={points.length === 0 || isSaving}
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
              {t.map_boundary_maybe_later()}
            </Button>
            <Button
              disabled={isSaving || (isCustom && !customIsValid)}
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
