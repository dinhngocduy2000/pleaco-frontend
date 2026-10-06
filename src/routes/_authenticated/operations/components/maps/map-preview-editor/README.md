# Map preview editor: geometry and validation internals

This is an implementation reference for the map boundary and environment-zone editor.

## Directory structure

```text
map-preview-editor/
├── README.md
├── -map-boundary-step.tsx       # editor screen and controls
├── -map-boundary-editor.tsx     # Konva rendering
├── -map-layout-toolbar.tsx      # tool selection
├── -map-grid-preview.tsx        # map previews
├── geometry/
│   ├── -coordinates.ts         # canvas/world transforms, clamping, distances
│   ├── -segments.ts            # orientation, intersection, edge helpers
│   ├── -polygons.ts            # area, validity, point containment
│   └── -spatial-relations.ts   # path containment, zone overlap
├── model/
│   ├── -boundary-format.ts      # load, serialize, full-map rectangle
│   ├── -editor-proposals.ts     # append, close, move vertex
│   ├── -layout-issues.ts        # conflicts across current shapes
│   ├── -layout-payload.ts       # pure save-request construction
│   ├── -layout-types.ts         # zone and docking-station types
│   └── -layout-styles.ts        # toolbar/canvas appearance
└── hooks/
    ├── -use-boundary-step.ts    # editor session and save action
    ├── -use-map-zones.ts        # tool and zone state
    ├── -use-map-boundary-editor.ts # pointer gestures and zoom
    └── -use-edit-history.ts     # snapshots and undo
```

## Data model

All geometry uses map-local world coordinates in metres.

~~~ts
type IMapBoundaryCoordinate = [x: number, y: number]
type IMapBoundaryPolygon = IMapBoundaryCoordinate[]
type IMapBoundaries = IMapBoundaryPolygon[]

type Geometry = {
  type: GeometryType
  coordinates: IMapBoundaries
}
~~~

Editor state uses one ring whose points never repeat the first point:

~~~ts
type EditorPolygon = {
  points: IMapBoundaryCoordinate[]
  closed: boolean
}
~~~

serializeBoundary rounds components to two decimal places and repeats the first coordinate only
for the API representation.

## Coordinate transformation

~~~text
world to canvas: x_px = x_m * ppm
                 y_px = (dimensionY - y_m) * ppm

canvas to world: x_m = x_px / ppm
                 y_m = dimensionY - y_px / ppm
~~~

The base density is 10 px/m. Zoom is constrained to [0.5, 3] in 0.5 increments. The editor
removes 20 px stage padding and clamps the canvas pointer to the map rectangle before conversion.
The converted coordinate is clamped again to [0, dimensionX] x [0, dimensionY]. Consequently,
stored geometry is independent of zoom and pointer/drag proposals are always in map bounds.

## State and controlled update pipeline

~~~text
MapBoundaryStep
  owns: source, boundary points, boundary closure, saving
  |
  +-- useMapZones
  |     owns: active tool, selected zone, completed zones, drafts, validation error
  |
  +-- useMapBoundaryEditor
        owns: zoom, extension preview, synthetic-click suppression
        emits: accepted (points, closed) through onChange
~~~

The canvas never changes geometry directly:

~~~text
Konva event
  -> normalize pointer
  -> build proposal
  -> canCommitBoundaryPoints
  -> canChangeActive
  -> onChange, or onInvalid with no controlled-state mutation
~~~

handleActiveChange routes an accepted proposal to the parent boundary state, the current zone draft,
or the selected zone. Closing a zone draft serializes it, assigns a local clientId, appends it to
completed zones, and clears its draft. Persisted zone deletion sets to_delete; new-zone deletion
removes the item from state.

## Drawing algorithms

### Append and closure

getBoundaryPointUpdate receives a canvas point, projected canvas vertices, world vertices, map
dimensions, pixels per metre, and closure tolerance.

~~~text
if points.length >= 3 and distance(pointer, firstCanvasPoint) <= 10 px:
    proposal = { points, closed: true }
else:
    proposal = { points: [...points, clamp(canvasPointToWorld(pointer))], closed: false }

return proposal only when canCommitBoundaryPoints(proposal) succeeds
~~~

Closure does not append a duplicate first coordinate, and an invalid close does not fall back to
append. The last point of an open path is an extension handle: a drag appends only after 2 px of
Euclidean movement. suppressClick consumes the click emitted by Konva after a successful drag.

getMovedBoundaryPoints clones the array, replaces one vertex with the clamped converted coordinate,
and returns it only when the same shared validator accepts it. The open endpoint is not normally
draggable because its drag implements extension.

## Geometry primitives

All helpers use EPSILON = 1e-8 for equality, collinearity, on-segment, and negligible-area tests.

| Function | Algorithm and contract |
| --- | --- |
| coordinatesEqual | Component-wise absolute difference below EPSILON. |
| orientation(A, B, C) | 2D cross-product sign for the turn A -> B -> C; near zero is collinear. |
| isPointOnSegment(A, P, B) | Inclusive bounds test after collinearity is known. |
| segmentsIntersect | General orientation test plus four collinear endpoint-on-segment cases. Crossings, contact, and collinear overlap intersect. |
| getSegments | Consecutive edges, plus final-to-first when closed and there are at least three points. |
| getPolygonArea | Absolute shoelace formula; implicitly closes the ring and returns square metres. |
| isPointInBoundary | Inclusive edge test, then horizontal ray-casting parity. |

## Shared simple-polygon validation

canCommitBoundaryPoints is executed before every append, close, and drag for boundaries and zones.

~~~text
reject duplicate vertices within EPSILON
reject adjacent collinear edges that retrace one another
reject non-adjacent edges that intersect, touch, or overlap
if closed: require isValidBoundaryPolygon(points, true)
accept
~~~

isValidBoundaryPolygon requires a closed path with at least three points, shoelace area greater
than EPSILON, no duplicates, and no self-intersection. hasSelfIntersection first detects adjacent
backtracking with hasAdjacentOverlap, then compares every pair of non-adjacent edges. Adjacent
edges and the first/last closed-ring pair are skipped because their shared endpoint is valid.
Forward-moving collinear vertices and either winding direction are valid. Duplicate and pairwise
edge tests are O(n^2) for n vertices.

### Shared-validator examples

All examples below call the public geometry helper with world-metre coordinates. The closing point
is intentionally omitted from every input because the editor keeps it in the closed flag.

#### 1. Duplicate point: rejected before segment checks

~~~ts
canCommitBoundaryPoints(
  [
    [0, 0],
    [2, 0],
    [2, 0],
  ],
  false,
)
// false
~~~

The third point equals the second. hasDuplicateCoordinates compares every point with later points
using coordinatesEqual, so this is rejected even for an open path where no polygon area exists yet.
The same rule catches a non-adjacent repeat such as [0, 0] at both the first and fourth indices.

#### 2. Adjacent retracing: rejected as an overlapping pair of connected edges

~~~ts
canCommitBoundaryPoints(
  [
    [0, 0],
    [4, 0],
    [2, 0],
  ],
  false,
)
// false
~~~

The edges are [0,0] -> [4,0] and [4,0] -> [2,0]. orientation is zero, so they are collinear.
isPointOnSegment then proves that [2,0] lies on the previous edge. hasAdjacentOverlap rejects the
proposal because the second edge retraces the interval from x=4 to x=2. In contrast,
[[0, 0], [2, 0], [4, 0]] is accepted because it continues forward without overlapping.

#### 3. Non-adjacent crossing: rejected by orientation-based edge intersection

~~~ts
const bowTie = [
  [0, 0],
  [4, 4],
  [0, 4],
  [4, 0],
]

hasSelfIntersection(bowTie, true)
// true

isValidBoundaryPolygon(bowTie, true)
// false
~~~

Closing creates edges A-B, B-C, C-D, and D-A. A-B and C-D are non-adjacent and their endpoints
lie on opposite sides of the other segment's supporting line. segmentsIntersect therefore reports
a crossing. The polygon is rejected even though its absolute shoelace area can be nonzero for other
self-intersecting shapes.

#### 4. Degenerate closed shape: rejected by area

~~~ts
isValidBoundaryPolygon(
  [
    [0, 0],
    [2, 0],
    [4, 0],
  ],
  true,
)
// false
~~~

The three vertices are unique and do not retrace, but getPolygonArea returns zero because every
point is collinear. A closed polygon must have an area strictly greater than EPSILON.

## Containment validation

isPathContainedInBoundary validates every vertex and every segment, not just vertices:

~~~text
if points is empty: accept
if any vertex is outside the boundary: reject
for each path edge, including final -> first when closed:
    reject unless isSegmentInBoundary(edge, boundary)
accept
~~~

isSegmentInBoundary computes every intersection parameter t for P(t) = start + t * (end - start)
against each boundary edge. It supports both non-parallel and collinear intersections, sorts and
deduplicates t values, then tests the midpoint of each interval. This catches a segment that leaves
and re-enters a concave boundary despite both endpoints being inside. Outer-boundary contact is
valid. The algorithm is O(p * b), plus per-edge parameter sorting, for p path edges and b boundary
edges.

When closing or reshaping a boundary, zonesFitBoundary requires every completed zone as a closed
path and every draft as an open path to remain contained. A zone proposal must similarly be
contained by the current effective boundary.

### Containment examples

#### 1. Edge contact is contained

~~~ts
const boundary = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
]

isPathContainedInBoundary(
  [
    [0, 2],
    [4, 2],
    [4, 6],
    [0, 6],
  ],
  boundary,
  true,
)
// true
~~~

The first and last vertices lie on the boundary's x=0 edge. isPointInBoundary explicitly treats a
point on an edge as inside, and all resulting segments remain inside or on the boundary.

#### 2. Outside vertex is rejected immediately

~~~ts
isPathContainedInBoundary([[11, 5]], boundary, false)
// false
~~~

The initial every-point check fails because [11,5] is outside x=0..10. No segment intersection or
midpoint work is needed.

#### 3. Concave-boundary escape is rejected even though both endpoints are inside

~~~ts
const concaveBoundary = [
  [0, 0], [6, 0], [6, 6], [4, 6],
  [4, 2], [2, 2], [2, 6], [0, 6],
]

isPathContainedInBoundary(
  [
    [1, 5],
    [5, 5],
  ],
  concaveBoundary,
  false,
)
// false
~~~

Both endpoints pass isPointInBoundary, but the horizontal segment crosses the U-shaped indentation.
getSegmentIntersectionParameters splits the edge at those crossings; the midpoint of the interval
inside the indentation is outside the boundary, so isSegmentInBoundary rejects it.

## Zone overlap validation

doesPathOverlapPolygons compares a proposal with each completed zone. It reports overlap if a
proposed vertex is in/on a zone, any proposed edge intersects a zone edge, or a closed proposal
contains a zone vertex. Therefore crossing, edge contact, vertex contact, entering, and enclosing
all reject; zones require a gap. The selected zone is excluded while reshaping. Drafts compare with
completed zones but not other drafts. Edge comparison is O(q * p * z) for q zones, p proposed
edges, and up to z edges per zone.

### Overlap examples

~~~ts
const existingZone = [
  [2, 2],
  [6, 2],
  [6, 6],
  [2, 6],
]
~~~

#### 1. Proposed vertex inside an existing zone

~~~ts
doesPathOverlapPolygons([[3, 3]], false, [existingZone])
// true
~~~

The first overlap branch calls isPointInBoundary([3,3], existingZone), which returns true. This
also rejects a one-point open draft immediately after it starts inside a completed zone.

#### 2. Path crossing a zone

~~~ts
doesPathOverlapPolygons(
  [
    [1, 4],
    [7, 4],
  ],
  false,
  [existingZone],
)
// true
~~~

Neither endpoint is inside the zone, but the path crosses the x=2 and x=6 zone edges. The nested
path-segment/polygon-segment loop invokes segmentsIntersect and rejects the crossing.

#### 3. Edge contact is overlap, not adjacency

~~~ts
doesPathOverlapPolygons([[2, 4]], false, [existingZone])
// true
~~~

[2,4] lies exactly on the existing zone's left edge. isPointInBoundary is inclusive, therefore
this returns true. The same inclusive segment logic rejects a proposed edge that merely touches an
existing zone vertex.

#### 4. Proposed polygon encloses an existing zone

~~~ts
doesPathOverlapPolygons(
  [
    [1, 1],
    [7, 1],
    [7, 7],
    [1, 7],
  ],
  true,
  [existingZone],
)
// true
~~~

No proposed vertex lies in the inner zone and its edges do not have to cross the inner-zone edges.
The final closed-proposal branch tests existing-zone vertices against the proposal; [2,2] is inside,
so containment is treated as overlap.

#### 5. Separate polygon is accepted

~~~ts
doesPathOverlapPolygons(
  [
    [7, 7],
    [9, 7],
    [9, 9],
  ],
  true,
  [existingZone],
)
// false
~~~

No proposed point enters or touches existingZone, no edges intersect, and no existing-zone point is
inside the proposal. The policy can accept this proposal, subject to boundary containment.

## Domain policy, errors, and save invariants

canChangeActive accepts an open boundary proposal, but accepts a closed one only when all zones and
drafts fit. A zone proposal must be contained first, then must not overlap another completed zone.
Only accepted data reaches onChange; rejected input calls onInvalid and retains existing geometry.

| Validation code | Cause |
| --- | --- |
| BOUNDARY_INVALID | Invalid shared geometry or closed boundary excludes a zone/draft. |
| ZONE_INVALID | Invalid shared geometry or a zone leaves the effective boundary. |
| ZONE_OVERLAP | Intersection, contact, containment, or enclosure of another completed zone. |

Save is blocked when custom boundary points are absent, a boundary/zone draft is open, initial
geometry is unsupported, or visible zones exceed 100. In adjustment mode, the normalized boundary
is saved only when it differs from the initial Geometry; zone lifecycle items are sent after the
boundary request succeeds.

## Source map

| Responsibility | File |
| --- | --- |
| Geometry helpers and algorithms | [geometry/](./geometry/) |
| Canvas gestures and controlled updates | [hooks/-use-map-boundary-editor.ts](./hooks/-use-map-boundary-editor.ts) |
| Zone state and domain policy | [hooks/-use-map-zones.ts](./hooks/-use-map-zones.ts) |
| Konva rendering | [-map-boundary-editor.tsx](./-map-boundary-editor.tsx) |
| Save orchestration | [hooks/-use-boundary-step.ts](./hooks/-use-boundary-step.ts) |
| Request construction | [model/-layout-payload.ts](./model/-layout-payload.ts) |
| Algorithm tests | [map-boundary-geometry.test.ts](../../../../../../tests/units/routes/_authenticated/operations/maps/map-boundary-geometry.test.ts) |
