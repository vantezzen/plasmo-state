import debugging from "debug"
import browser, { Runtime } from "webextension-polyfill"

import type State from "../State"
import type { ChangeSource, SyncMessage } from "../types"
import { StateEnvironment } from "../types"
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
      console.log(
        "[plasmo-state] Adding runtime message listener for offscreen communication"
      )
      browser.runtime.onMessage.addListener(
        this.handleRuntimeMessage.bind(this)
      )
    }
  }

  private handleRuntimeMessage(
    message: SyncMessage<T>,
    sender: Runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean | void {
    if (
      message.type !== "sync" ||
      this.state.environment !== StateEnvironment.Background
    ) {
      return
    }

    console.log(
      `[plasmo-state] Received runtime message action=${message.action} from tabId=${message.tabId} (sender: ${sender.tab?.id}, url: ${sender.url})`
    )

    if (message.action === "pushStateOffscreen" && message.payload) {
      console.log("[plasmo-state] Handling pushStateOffscreen", message.payload)
      const prevStateSource = this.state.currentSource
      this.state.currentSource = "offscreen" as ChangeSource
      try {
        this.state.replace(message.payload, "offscreen" as ChangeSource)

        // Offscreen cannot push directly to e.g. content scripts,
        // so we re-push the state to the background script
        this.push()
      } finally {
        this.state.currentSource = prevStateSource
      }
    } else if (message.action === "pullStateOffscreen") {
      console.log(
        "[plasmo-state] Handling pullStateOffscreen, responding with currentRaw"
      )
      sendResponse(this.state.currentRaw)
      return true
    }
  }

  // Modified destroy method
  destroy() {
    if (this.state.environment === StateEnvironment.Background) {
      debug(
        "Background: Removing runtime message listener for offscreen communication"
      )
      browser.runtime.onMessage.removeListener(
        this.handleRuntimeMessage.bind(this)
      )
    }
    super.destroy()
  }

  async onPush(pushUpdateMessage: SyncMessage<T>) {
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
