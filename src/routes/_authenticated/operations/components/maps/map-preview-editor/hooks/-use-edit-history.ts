import { useState } from 'react'

/** Compares serialized snapshots; array and object-key order affect equality. */
const equal = <T>(left: T, right: T) => JSON.stringify(left) === JSON.stringify(right)

/**
 * Tracks unsaved editor changes within one mounted editing session.
 *
 * The baseline is the initial or most recently committed snapshot. Each distinct
 * change pushes the previous value onto `past`; undo consumes that stack without
 * crossing the baseline. Clear and commit both discard the stack, so neither
 * action can be undone. History is local to this hook instance and has no redo.
 *
 * Snapshots are retained by reference, not cloned. Treat inputs, returned values,
 * and updater arguments as immutable, including nested arrays and objects.
 * Equality uses JSON serialization, so use plain serializable data: omitted values
 * such as undefined properties are indistinguishable, and key order matters.
 * Function-valued snapshots are unsupported because functions are updater callbacks.
 *
 * @template T - Immutable, JSON-serializable editor snapshot type.
 * @param initial - Initial value and baseline, captured only on mount. Later prop
 * changes do not reset history; remount the editor to start a different session.
 * @returns Current snapshot, action availability, and local history actions.
 * @throws {TypeError} When JSON serialization encounters cycles or bigint values.
 */
export function useEditHistory<T>(initial: T) {
  const [state, setState] = useState(() => ({
    baseline: initial,
    present: initial,
    past: [] as T[],
  }))
  return {
    /** Current editable snapshot; callers must not mutate it. */
    value: state.present,
    /** Whether a prior snapshot remains, even if the current value equals the baseline. */
    canUndo: state.past.length > 0,
    /** Whether the current value differs from the baseline under serialized equality. */
    canClear: !equal(state.baseline, state.present),
    /**
     * Records a distinct edit, preserving the previous snapshot for undo.
     * Serialized no-ops leave both the current value and history unchanged.
     *
     * @param update - Replacement snapshot or pure updater receiving the latest
     * queued value. Use an updater for edits that depend on previous state.
     * @returns Nothing; schedules a React state update.
     */
    change: (update: T | ((value: T) => T)) =>
      setState((current) => {
        const next =
          typeof update === 'function' ? (update as (value: T) => T)(current.present) : update
        return equal(current.present, next)
          ? current
          : {
              ...current,
              present: next,
              past: [...current.past, current.present],
            }
      }),
    /** Restores and removes the latest prior snapshot; does nothing when history is empty. */
    undo: () =>
      setState((current) =>
        current.past.length === 0
          ? current
          : {
              ...current,
              present: current.past[current.past.length - 1],
              past: current.past.slice(0, -1),
            },
      ),
    /** Restores the baseline and discards all undo history without recording another edit. */
    clear: () => setState((current) => ({ ...current, present: current.baseline, past: [] })),
    /**
     * Makes the current value the baseline and discards all undo history.
     * This does not persist data. Call only after a successful save, keeping edits
     * disabled during that save so the committed value matches the saved snapshot.
     */
    commit: () =>
      setState((current) => ({ baseline: current.present, present: current.present, past: [] })),
  }
}
