import debugging from "debug"
import browser, { Runtime } from "webextension-polyfill"

import type { SyncMessage, ChangeSource } from "../types" // Adjusted import
import { StateEnvironment } from "../types" // Added StateEnvironment import
import type State from "../State" // Added import for State

import SyncModule from "./SyncModule"

const debug = debugging("plasmo-state:Sync:ExtensionSyncModule")

/**
 * Sync Module to use when running in an extension environment (popup or background)
 */
export default class ExtensionSyncModule<
  T extends object
> extends SyncModule<T> {
  constructor(state: State<T>) {
    super(state)
    if (this.state.environment === StateEnvironment.Background) {
      debug("Background: Adding runtime message listener for offscreen communication")
      browser.runtime.onMessage.addListener(this.handleRuntimeMessage.bind(this))
    }
  }

  private handleRuntimeMessage(
    // Ensure message.payload is available for pushStateOffscreen
    message: SyncMessage<T> & { action: string; payload?: T }, 
    sender: Runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean | void {
    if (message.type !== "sync" || this.state.environment !== StateEnvironment.Background) {
      return
    }

    debug(`Background: Received runtime message action=${message.action} from tabId=${message.tabId} (sender: ${sender.tab?.id}, url: ${sender.url})`)

    if (message.action === "pushStateOffscreen" && message.payload) { // Check message.payload exists
      debug("Background: Handling pushStateOffscreen", message.payload)
      const prevStateSource = this.state.currentSource
      this.state.currentSource = "offscreen" as ChangeSource // Cast to ChangeSource
      try {
        this.state.replace(message.payload, "offscreen" as ChangeSource) // Cast to ChangeSource
      } finally {
        this.state.currentSource = prevStateSource
      }
      // No sendResponse needed for push actions
    } else if (message.action === "pullStateOffscreen") {
      debug("Background: Handling pullStateOffscreen, responding with currentRaw")
      sendResponse(this.state.currentRaw)
      return true // Indicate async response
    }
  }

  // Modified destroy method
  destroy() {
    if (this.state.environment === StateEnvironment.Background) {
      debug("Background: Removing runtime message listener for offscreen communication")
      browser.runtime.onMessage.removeListener(this.handleRuntimeMessage.bind(this))
    }
    super.destroy() // Call SyncModule's destroy method
  }

  async onPush(pushUpdateMessage: SyncMessage<T>) {
    // Also push changes to the content script
    await browser.tabs
      .sendMessage(this.state.tabId, pushUpdateMessage)
      .catch(() => {})
  }

  async onAfterPull(state?: T) {
    if (!state) {
      debug(
        "No state received from extension environment - trying content script"
      )
      return await browser.tabs
        .sendMessage(this.state.tabId, {
          type: "sync",
          action: "pull",
          tabId: this.state.tabId
        })
        .catch(() => undefined)
    }
    return state
  }
}
