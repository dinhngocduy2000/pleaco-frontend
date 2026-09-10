import { Trash2, Undo2, X } from 'lucide-react'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
import { Button } from '@/components/ui/button'
import { MapZoneType } from '@/enum/maps'
import { getTranslations } from '@/lib/translation'
import { MapBoundaryEditor } from './-map-boundary-editor'
import { MapLayoutToolbar } from './-map-layout-toolbar'
import { type MapBoundaryStepProps, useBoundaryStep } from './-use-boundary-step'

const t = getTranslations()

export function MapBoundaryStep({
  map,
  onClose,
  mode = 'create',
  onSavingChange,
}: MapBoundaryStepProps) {
  const {
    boundaryClosed,
    boundaryMethodDisabled,
    boundaryPoints,
    handleMethodChange,
    handleSave,
    isCustom,
    isSaving,
    methodOptions,
    saveDisabled,
    selectedMethod,
    showDrawingActions,
    toolbarDisabled,
    unsupported,
    validationMessage,
    zoneEditor,
    zoneToolsDisabled,
  } = useBoundaryStep({ map, mode, onClose, onSavingChange })

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
            disabled={toolbarDisabled}
            zoneToolsDisabled={zoneToolsDisabled}
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
              disabled={boundaryMethodDisabled}
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
              {unsupported ? t.map_boundary_adjust_unsupported() : validationMessage}
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
            <Button disabled={saveDisabled} loading={isSaving} type="button" onClick={handleSave}>
              {t.map_boundary_save()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
