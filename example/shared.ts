/**
 * It is recommended to have a shared code file for initizating the state provider
 * to prevent duplicating this.
 */
import setupState, { StateEnvironment } from "../src"

// State type that defines all your state properties for the current environment
export type State = {
  // Only used on a single tab - this is the default behaviour
  perTab: number

  // Shares the same value across tabs is another tab is requesting the same key
  acrossTabs: string

  // Peristent in the browser storage. Persistent keys will automatically be shared across tabs
  persistent: string

  // State key that doesn't have a default value
  withoutDefault?: string
}

// State that will be used by default and as long as no data has been provided by other environments yet
const initialState: State = {
  perTab: 0,
  acrossTabs: "Across Tabs",
  persistent: "Persistent"
}

export default function getState(environment: StateEnvironment) {
  return setupState<State>(environment, initialState, {
    shared: ["acrossTabs"],
    persistent: ["persistent"]
  })
}
