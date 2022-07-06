import type { PlasmoContentScript } from "plasmo"

export const config: PlasmoContentScript = {
  matches: ["<all_urls>"],
  all_frames: true
}

console.log("Extension loaded")
