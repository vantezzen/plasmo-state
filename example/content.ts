import type { PlasmoContentScript } from "plasmo"

import { StateEnvironment } from "../src"
import getState from "./shared"

export const config: PlasmoContentScript = {
  matches: ["<all_urls>"],
  all_frames: true
}

const state = getState(StateEnvironment.Content)

const incrementButton = document.getElementById("increment")
if (incrementButton) {
  incrementButton.addEventListener("click", () => {
    state.current.perTab++
  })
}
const persistentElement = document.getElementById("persistent")
persistentElement.innerText = state.current.persistent.toString()

state.addListener("change", () => {
  console.log("State changed:", state.current)

  const counterElement = document.getElementById("counter")
  if (counterElement) {
    counterElement.innerText = state.current.perTab.toString()
  }
  persistentElement.innerText = state.current.persistent.toString()

  const backgroundElement = document.getElementById("background")
  if (backgroundElement) {
    backgroundElement.innerText = state.current.background.toString()
  }
})
