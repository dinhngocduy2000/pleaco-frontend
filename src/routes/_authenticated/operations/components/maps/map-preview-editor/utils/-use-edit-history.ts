import { useState } from 'react'

const equal = <T>(left: T, right: T) => JSON.stringify(left) === JSON.stringify(right)

/** Session-local snapshots; committing a save establishes a new undo limit. */
export function useEditHistory<T>(initial: T) {
  const [state, setState] = useState(() => ({
    baseline: initial,
    present: initial,
    past: [] as T[],
  }))
  return {
    value: state.present,
    canUndo: state.past.length > 0,
    canClear: !equal(state.baseline, state.present),
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
    clear: () => setState((current) => ({ ...current, present: current.baseline, past: [] })),
    commit: () =>
      setState((current) => ({ baseline: current.present, present: current.present, past: [] })),
  }
}
