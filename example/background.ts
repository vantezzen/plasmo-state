import OFFSCREEN_DOCUMENT_PATH from "url:~offscreen/offscreen.html"

import { StateEnvironment } from "../src"
import getState from "./shared"

const plasmoState = getState(StateEnvironment.Background)
// setInterval(() => {
//   plasmoState.current.background++
// }, 1000)

// Setup Offscreen Page
// Source: https://github.com/PlasmoHQ/plasmo/issues/527#issuecomment-1546617808
async function createOffscreenDocument() {
  // @ts-expect-error clients is not defined in the service worker global scope
  const existingContexts = await globalThis.chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [OFFSCREEN_DOCUMENT_PATH]
  })

  if (existingContexts.length > 0) {
    console.log("Offscreen document already exists.")
    return
  }

  console.log("Creating offscreen document...")
  // @ts-expect-error chrome.offscreen is not defined in the service worker
  await chrome.offscreen
    .createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      // @ts-expect-error chrome.offscreen is not defined in the service worker
      reasons: [chrome.offscreen.Reason.WEB_RTC], // Example reason
      justification: "Demo for plasmo-state with offscreen support"
    })
    .then(() => {
      console.log("Offscreen document created successfully")
    })
    .catch((error) => {
      console.error("Failed to create offscreen document:", error)
    })
}
createOffscreenDocument()

// Note: The hasDocument function using clients.matchAll() might not be reliable
// for checking offscreen document existence from a service worker.
// chrome.runtime.getContexts is more reliable.

// Needed for Typescript validation
export {}
