/**
 * It is recommended to have a shared code file for initizating the state provider
 * to prevent duplicating this.
 */
import setupState, { StateEnvironment } from "../src"

// State type that defines all your state properties for the current environment
export type State = {
  perTab: number

  // Peristent in the browser storage. Persistent keys will automatically be shared across tabs
  persistent: string

  // This will be updated by the background script later
  background: number

  // State key that doesn't have a default value
  withoutDefault?: string

  offscreenCounter: number
}

// State that will be used by default and as long as no data has been provided by other environments yet
const initialState: State = {
  perTab: 0,
  persistent: "Persistent",
  background: 0,
  offscreenCounter: 0
}

export default function getState(environment: StateEnvironment) {
  return setupState<State>(environment, initialState, {
    persistent: ["persistent"]
  })
}
