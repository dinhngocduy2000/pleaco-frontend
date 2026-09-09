import { MousePointer2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MapZoneType } from '@/enum/maps'
import { getTranslations } from '@/lib/translation'
import { MAP_DRAWING_ZONE_TYPES, MAP_ZONE_STYLES, type MapLayoutTool } from './-map-zone-types'

const t = getTranslations()

const getZoneLabel = (zoneType: MapZoneType) => {
  switch (zoneType) {
    case MapZoneType.BOUNDARY:
      return t.map_layout_tool_boundary()
    case MapZoneType.OBSTACLE:
      return t.map_layout_tool_obstacle()
    case MapZoneType.NO_GO:
      return t.map_layout_tool_no_go()
    case MapZoneType.CLEANING_ZONE:
      return t.map_layout_tool_cleaning_zone()
  }
}

function ZonePreview({ zoneType }: { zoneType: MapZoneType }) {
  const style = MAP_ZONE_STYLES[zoneType]
  return (
    <span
      aria-hidden
      className="size-4 shrink-0 rounded-xs"
      style={{
        backgroundColor: style.fill,
        borderColor: style.stroke,
        borderStyle: style.dash ? 'dashed' : 'solid',
        borderWidth: style.strokeWidth,
      }}
    />
  )
}

type MapLayoutToolbarProps = {
  activeTool: MapLayoutTool
  deleteDisabled: boolean
  disabled: boolean
  zoneToolsDisabled: boolean
  onDelete: () => void
  onToolChange: (tool: MapLayoutTool) => void
}

export function MapLayoutToolbar({
  activeTool,
  deleteDisabled,
  disabled,
  zoneToolsDisabled,
  onDelete,
  onToolChange,
}: MapLayoutToolbarProps) {
  return (
    <div
      aria-label={t.map_layout_toolbar_label()}
      className="mb-3 flex flex-wrap items-center gap-2"
      role="toolbar"
    >
      {MAP_DRAWING_ZONE_TYPES.map((zoneType) => (
        <Button
          key={zoneType}
          aria-pressed={activeTool === zoneType}
          disabled={disabled || (zoneType !== MapZoneType.BOUNDARY && zoneToolsDisabled)}
          size="sm"
          type="button"
          variant={activeTool === zoneType ? 'secondary' : 'outline'}
          onClick={() => onToolChange(zoneType)}
        >
          <ZonePreview zoneType={zoneType} />
          {getZoneLabel(zoneType)}
        </Button>
      ))}
      <Button
        aria-pressed={activeTool === 'SELECT'}
        disabled={disabled || zoneToolsDisabled}
        size="sm"
        type="button"
        variant={activeTool === 'SELECT' ? 'secondary' : 'outline'}
        onClick={() => onToolChange('SELECT')}
      >
        <MousePointer2 />
        {t.map_layout_tool_select()}
      </Button>
      <Button
        aria-label={t.map_layout_tool_delete_selected()}
        disabled={disabled || deleteDisabled}
        size="sm"
        type="button"
        variant="outline"
        onClick={onDelete}
      >
        <Trash2 />
        {t.map_layout_tool_delete()}
      </Button>
    </div>
  )
}
