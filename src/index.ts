import State from "./State"
import type { SetupConfig, StateEnvironment } from "./types"

export default function setupState<T extends object>(
  environment: StateEnvironment,
  initialState: T,
  config?: SetupConfig<T>
) {
  return new State<T>(environment, initialState, config)
}

export * from "./types"
export { default as usePlasmoState } from "./hook"
