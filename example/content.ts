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

state.addListener("change", () => {
  console.log("State changed:", state.current)

  const counterElement = document.getElementById("counter")
  if (counterElement) {
    counterElement.innerText = state.current.perTab.toString()
  }
})
