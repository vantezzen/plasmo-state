import debugging from "debug"
import browser, { Runtime } from "webextension-polyfill"

import type State from "../State"
import type { SyncMessage } from "../types"

export default abstract class SyncModule<T extends object> {
  protected state: State<T>
  #debug: any

  constructor(state: State<T>) {
    this.state = state
    this.#debug = debugging(`plasmo-state:State:${this.state.environment}`)

    this.configUpdateListener = this.configUpdateListener.bind(this)
    browser.runtime.onMessage.addListener(this.configUpdateListener)

    this.#debug("Setup done")
  }

  configUpdateListener(msg: SyncMessage<T>, sender: Runtime.MessageSender) {
    if (typeof msg !== "object" || msg.type !== "sync") return

    const senderTab = msg.tabId === -1 ? sender.tab?.id : msg.tabId
    const isCurrentTab =
      this.state.tabId === senderTab || this.state.tabId === -1

    if (!isCurrentTab) {
      this.#debug("Ignoring message from other tab", msg)
      return
    }

    if (msg.action === "push") {
      this.state.replace(msg.data, "sync")
      this.#debug("Pushed new data from message", msg)
    } else if (msg.action === "pull") {
      this.#debug("Sending requested config")

      return Promise.resolve(this.state.currentRaw)
    }
  }

  async push() {
    if (!this.state.setupDone) {
      // TODO: Throw error or inform
      this.#debug("Tried to push before setup done")
      return
    }

    const pushUpdateMessage: SyncMessage<T> = {
      type: "sync",
      action: "push",
      data: this.state.currentRaw,
      tabId: this.state.tabId
    }

    this.onPush(pushUpdateMessage)

    browser.runtime.sendMessage(pushUpdateMessage).catch(() => {})

    this.#debug("Pushed updates")
  }
  async onPush(pushUpdateMessage: SyncMessage<T>) {}

  async pull() {
    let state = await browser.runtime
      .sendMessage({
        type: "sync",
        action: "pull",
        tabId: this.state.tabId
      })
      .catch(() => undefined)
    state = await this.onAfterPull(state)

    if (!state) {
      this.#debug("Fetched, but no result")
      return
    }

    if (JSON.stringify(this.state.currentRaw) === JSON.stringify(state)) {
      this.#debug("Fetched, but no change")
      return
    }

    this.#debug("Fetched, and change")
    this.state.replace(state, "sync")
  }
  async onAfterPull(state?: T) {
    return state
  }

  destroy() {
    browser.runtime.onMessage.removeListener(this.configUpdateListener)
  }
}
