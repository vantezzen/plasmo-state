import debugging from "debug"
import browser, { Runtime } from "webextension-polyfill"

import type State from "../State"
import { StateEnvironment, SyncMessage } from "../types"

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
    this.#debug("Got message", msg)
    if (typeof msg !== "object" || msg.type !== "sync") return

    const senderTab = (msg.tabId === -1 ? sender.tab?.id : msg.tabId) ?? -1
    const isCurrentTab = this.state.tabId === senderTab || senderTab === -1

    if (!isCurrentTab) {
      this.#debug("Ignoring message from other tab", msg)
      return
    }

    if (msg.action === "push") {
      this.state.replace(msg.data, "sync")
      this.#debug("Pushed new data from message", msg)
    } else if (msg.action === "pull") {
      this.#debug("Sending requested data", msg)

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

    if (
      this.state.tabId === -1 &&
      this.state.environment !== StateEnvironment.Content
    ) {
      console.warn(`[plasmo-state] You are using plasmo-state inside a non-content script context (e.g. popup or background) without providing a tab ID.
Due to this, your state changes will be pushed to *all* tabs, which may not be the intended behavior.

If you want to push state changes only to the current tab, please provide a valid tab ID in the state setup configuration, e.g.:
const plasmoState = setupState(environment, initialState, {
  tabId: await browser.tabs?.query({ active: true, currentWindow: true }).then(tabs => tabs[0]?.id)
})

To find out more, visit https://github.com/vantezzen/plasmo-state#setupstate
`)
    }

    this.onPush(pushUpdateMessage)

    browser.runtime.sendMessage(pushUpdateMessage).catch(() => {})

    this.#debug("Pushed updates")
  }

  /**
   * Extension point for subclasses
   */
  async onPush(pushUpdateMessage: SyncMessage<T>) {}

  async pull() {
    this.#debug("Pulling...")

    let state = await Promise.race(
      [
        browser.tabs
          ? browser.tabs
              ?.sendMessage(this.state.tabId, {
                type: "sync",
                action: "pull",
                tabId: this.state.tabId
              })
              .catch(() => undefined)
          : undefined,
        browser.runtime
          .sendMessage({
            type: "sync",
            action: "pull",
            tabId: this.state.tabId
          })
          .catch(() => undefined)
      ].filter(Boolean)
    )

    this.#debug("Fetched", state)
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

  /**
   * Extension point for subclasses to modify the state after a pull
   */
  async onAfterPull(state?: T) {
    return state
  }

  destroy() {
    browser.runtime.onMessage.removeListener(this.configUpdateListener)
  }
}
