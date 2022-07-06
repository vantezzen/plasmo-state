import debugging from "debug"
import browser, { Runtime } from "webextension-polyfill"

import type State from "~State"
import type { SyncMessage } from "~types"

const debug = debugging("plasmo-state:Sync:SyncModule")

export default abstract class SyncModule<T extends object> {
  protected state: State<T>

  constructor(state: State<T>) {
    this.state = state

    this.configUpdateListener = this.configUpdateListener.bind(this)
    browser.runtime.onMessage.addListener(this.configUpdateListener)

    debug("Setup done")
  }

  configUpdateListener(msg: SyncMessage<T>, sender: Runtime.MessageSender) {
    if (typeof msg !== "object" || msg.type !== "sync") return

    const senderTab = msg.tabId === -1 ? sender.tab?.id : msg.tabId
    const isCurrentTab =
      this.state.tabId === senderTab || this.state.tabId === -1

    if (!isCurrentTab) {
      debug("Ignoring message from other tab", msg)
      return
    }

    if (msg.action === "push") {
      this.state.replace(msg.data)
      debug("Pushed new data from message", msg)
    } else if (msg.action === "pull") {
      debug("Sending requested config")

      return Promise.resolve(this.state.currentRaw)
    }
  }

  async push() {
    if (!this.state.setupDone) {
      // TODO: Throw error or inform
      debug("Tried to push before setup done")
      return
    }

    const pushUpdateMessage: SyncMessage<T> = {
      type: "sync",
      action: "push",
      data: this.state.currentRaw,
      tabId: this.state.tabId
    }

    this.onPush(pushUpdateMessage)

    try {
      browser.runtime.sendMessage(pushUpdateMessage)
    } catch (e) {
      debug("Error pushing config to content script", e)
    }

    debug("Pushed updates")
  }
  async onPush(pushUpdateMessage: SyncMessage<T>) {}

  async pull() {
    let state = await browser.runtime.sendMessage({
      type: "sync",
      action: "pull",
      tabId: this.state.tabId
    })
    state = await this.onAfterPull(state)

    if (!state) {
      debug("Fetched, but no result")
      return
    }

    if (JSON.stringify(this.state.currentRaw) === JSON.stringify(state)) {
      debug("Fetched, but no change")
      return
    }

    debug("Fetched, and change")
    this.state.replace(state)
  }
  async onAfterPull(state?: T) {
    return state
  }
}
