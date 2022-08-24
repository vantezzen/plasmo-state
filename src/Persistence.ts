import debugging from "debug"
import browser from "webextension-polyfill"

import type State from "./State"
import type { ChangeSource } from "./types"

const debug = debugging("plasmo-state:Persistence")

/**
 * Provide persistence for the state.
 * This is a wrapper object around the "@plasmohq/storage" library.
 * This class will be used by the state class internally and doesn't need to be accessed directly.
 */
export default class Persistence<T extends object> {
  #state: State<T>
  #storageValue: Partial<T> = {}
  #STORAGE_KEY = "plasmo-sync"

  constructor(state: State<T>) {
    this.#state = state

    this.onStateChange = this.onStateChange.bind(this)
    this.#state.addListener("change", this.onStateChange)

    this.onBrowserStorageUpdate = this.onBrowserStorageUpdate.bind(this)
    browser.storage.sync.onChanged.addListener(this.onBrowserStorageUpdate)

    this.fetchStateFromStorage()
  }

  private onBrowserStorageUpdate(update: { [key: string]: any }) {
    if (update[this.#STORAGE_KEY]) {
      debug("Got storage value update info", update[this.#STORAGE_KEY])
      this.#handlePersistentDataUpdate(
        (update[this.#STORAGE_KEY] as any).newValue
      )
    }
  }

  private onStateChange(key: keyof T, source: ChangeSource) {
    if (source !== "user" || !this.#state.keyIsPersistent(key)) return

    this.#storageValue[key] = this.#state.current[key]
    browser.storage.sync.set({
      [this.#STORAGE_KEY]: JSON.stringify(this.#storageValue)
    })
    debug("Pushed changed to persistent storage")
  }

  async fetchStateFromStorage(): Promise<void> {
    const state = await browser.storage.sync.get(this.#STORAGE_KEY)
    debug("fetchStateFromStorage", state)

    if (!state[this.#STORAGE_KEY]) return
    this.#handlePersistentDataUpdate(state[this.#STORAGE_KEY])
  }

  #handlePersistentDataUpdate(stateString: string) {
    const state = JSON.parse(stateString)
    this.#storageValue = state

    this.#state.currentSource = "storage"
    for (const [key, value] of Object.entries(state)) {
      this.#state.current[key] = value
    }
    this.#state.currentSource = "user"
    debug("Fetched state from persistent storage")
  }

  destroy() {
    this.#state.removeListener("change", this.onStateChange)
    this.#state = null
    browser.storage.sync.onChanged.removeListener(this.onBrowserStorageUpdate)
  }
}
