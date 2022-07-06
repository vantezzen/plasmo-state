import debugging from "debug"
import browser, { Runtime } from "webextension-polyfill"

import type { SyncMessage } from "~types"

import SyncModule from "./SyncModule"

const debug = debugging("plasmo-state:Sync:ExtensionSyncModule")

/**
 * Sync Module to use when running in an extension environment (popup or background)
 */
export default class ExtensionSyncModule<
  T extends object
> extends SyncModule<T> {
  async onPush(pushUpdateMessage: SyncMessage<T>) {
    // Also push changes to the content script
    try {
      await browser.tabs.sendMessage(this.state.tabId, pushUpdateMessage)
    } catch (e) {
      debug("Error pushing config to content script", e)
    }
  }

  async onAfterPull(state?: T) {
    if (!state) {
      debug(
        "No state received from extension environment - trying content script"
      )
      return await browser.tabs.sendMessage(this.state.tabId, {
        type: "sync",
        action: "pull",
        tabId: this.state.tabId
      })
    }
    return state
  }
}
