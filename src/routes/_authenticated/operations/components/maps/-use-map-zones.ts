import { useRef, useState } from 'react'
import { GeometryType } from '@/enum/maps'
import type { IMapBoundaryCoordinate } from '@/interface/maps'
import { serializeBoundary } from './-map-boundary-geometry'
import { createEmptyZoneDrafts, type IMapZoneDrafts, type IMapZoneShape } from './-map-zone-types'

const geometryToPoints = (zone: IMapZoneShape): IMapBoundaryCoordinate[] => {
  const points = zone.geometry.coordinates[0] ?? []
  const withoutClosure = points.slice(0, -1)
  return withoutClosure.map(([x, y]) => [x, y])
}

export function useMapZones() {
  const nextId = useRef(1)
  const [zones, setZones] = useState<IMapZoneShape[]>([])
  const [drafts, setDrafts] = useState<IMapZoneDrafts>(createEmptyZoneDrafts)
  const [selectedZoneId, setSelectedZoneId] = useState<string>()
  const selectedZone = zones.find((zone) => zone.clientId === selectedZoneId)

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

  const handleUndoZone = (zoneType: IMapZoneShape['zoneType']) => {
    if (drafts[zoneType].points.length > 0) {
      setDrafts((current) => ({
        ...current,
        [zoneType]: { points: current[zoneType].points.slice(0, -1) },
      }))
      return
    }
    const latestIndex = zones.findLastIndex((zone) => zone.zoneType === zoneType)
    if (latestIndex < 0) return
    const latestZone = zones[latestIndex]
    setZones((current) => current.filter((_, index) => index !== latestIndex))
    setDrafts((current) => ({
      ...current,
      [zoneType]: { points: geometryToPoints(latestZone) },
    }))
    if (selectedZoneId === latestZone.clientId) setSelectedZoneId(undefined)
  }

  const handleClearZoneDraft = (zoneType: IMapZoneShape['zoneType']) => {
    setDrafts((current) => ({ ...current, [zoneType]: { points: [] } }))
  }

  const handleDeleteSelectedZone = () => {
    if (!selectedZoneId) return
    setZones((current) => current.filter((zone) => zone.clientId !== selectedZoneId))
    setSelectedZoneId(undefined)
  }

  return {
    drafts,
    handleClearZoneDraft,
    handleDeleteSelectedZone,
    handleSelectedZoneChange,
    handleUndoZone,
    handleZoneChange,
    selectedZone,
    selectedZoneId,
    setSelectedZoneId,
    zones,
  }
}
