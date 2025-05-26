import OFFSCREEN_DOCUMENT_PATH from "url:~offscreen/offscreen.html"

import { StateEnvironment } from "../src"
import getState from "./shared"

const plasmoState = getState(StateEnvironment.Popup)
setInterval(() => {
  plasmoState.current.background++
}, 1000)

// Setup Offscreen Page
// Source: https://github.com/PlasmoHQ/plasmo/issues/527#issuecomment-1546617808
async function createOffscreenDocument() {
  if (!(await hasDocument())) {
    console.log("Creating offscreen document...")

    // @ts-expect-error chrome.offscreen is not defined in the service worker
    await chrome.offscreen
      .createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        // @ts-expect-error chrome.offscreen is not defined in the service worker
        reasons: [chrome.offscreen.Reason.WEB_RTC],
        justification: "Demo"
      })
      .then(() => {
        console.log("Offscreen document created")
      })
      .catch((error) => {
        console.error("Failed to create offscreen document:", error)
      })
  }
}
createOffscreenDocument()

async function hasDocument() {
  // Check all windows controlled by the service worker if one of them is the offscreen document
  // @ts-ignore clients
  const matchedClients = await clients.matchAll()
  for (const client of matchedClients) {
    if (client.url.endsWith(OFFSCREEN_DOCUMENT_PATH)) {
      return true
    }
  }
  return false
}

// Needed for Typescript validation
export {}
