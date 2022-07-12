import { StateEnvironment } from "../src"
import getState from "./shared"

const plasmoState = getState(StateEnvironment.Popup)
setInterval(() => {
  plasmoState.current.background++
}, 1000)

// Needed for Typescript validation
export {}
