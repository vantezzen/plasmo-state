import { useEffect, useState } from "react"

import type State from "./State"

/**
 * Use a plasmo-state instance inside a react component
 * This will automatically re-render when the state changes.
 *
 * The return value is the proxy of the state object. You can
 * directly modify its properties without needing to call a
 * function like "setState".
 *
 * Usage:
 * const myState = setupState(...);
 *
 * () => {
 *   const state = usePlasmoState(myState);
 *   return (
 *    <div>
 *      {state.couter}
 *      <button onClick={() => state.counter++}>Increment</button>
 *   </div>
 *   );
 * }
 *
 * @param state The plasmo-state instance
 * @returns The current state proxy
 */
export default function usePlasmoState<T extends object>(state: State<T>) {
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const listener = () => {
      forceUpdate({})
    }

    state.addListener("change", listener)
    return () => {
      state.removeListener("change", listener)
    }
  }, [state])

  return state.current
}
