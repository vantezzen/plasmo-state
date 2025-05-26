import debugging from "debug"
import browser, { Runtime } from "webextension-polyfill"

import type State from "../State"
import type { ChangeSource, SyncMessage } from "../types"
import SyncModule from "./SyncModule"

const debug = debugging("plasmo-state:Sync:OffscreenSyncModule")

export default class OffscreenSyncModule<
  T extends object
> extends SyncModule<T> {
  constructor(state: State<T>) {
    super(state)
    debug("OffscreenSyncModule created")
  }

  async onPush(pushUpdateMessage: SyncMessage<T>) {
    debug("Pushing state to background:", pushUpdateMessage.payload)
    try {
      await browser.runtime.sendMessage({
        type: "sync",
        action: "pushStateOffscreen",
        tabId: this.state.tabId,
        payload: pushUpdateMessage.payload
      })
    } catch (error) {
      debug("Error pushing state to background:", error)
    }
  }

  async pull(): Promise<void> {
    debug("Pulling state from background")
    try {
      const response = await Promise.race([
        browser.runtime.sendMessage({
          type: "sync",
          action: "pullStateOffscreen",
          tabId: this.state.tabId
        }),
        new Promise<undefined>((resolve) =>
          setTimeout(() => resolve(undefined), 5000)
        )
      ])
      if (response) {
        debug("Received state from background on pull:", response)
        this.state.replace(response, "background")
      } else {
        console.error(
          "[plasmo-state] Couldn't sync with background script. Please make sure you have a background script and initialized plasmo-state in it!"
        )
      }
    } catch (error) {
      debug("Error pulling state from background:", error)
    }
  }

  destroy() {
    super.destroy()
    debug("OffscreenSyncModule destroyed")
  }
}
