import { Storage } from "@plasmohq/storage"
import debugging from "debug"

import type State from "./State"

const debug = debugging("plasmo-state:Persistence")

/**
 * Provide persistence for the state.
 * This is a wrapper object around the "@plasmohq/storage" library.
 * This class will be used by the state class internally and doesn't need to be accessed directly.
 */
export default class Persistence<T extends object> {
  #storage: Storage
  #state: State<T>
  #storageValue: Partial<T> = {}
  #STORAGE_KEY = "plasmo-sync"

  constructor(state: State<T>) {
    this.#storage = new Storage()
    this.#state = state

    this.onStateChange = this.onStateChange.bind(this)
    this.#state.addListener("change", this.onStateChange)
    this.#storage.watch({
      [this.#STORAGE_KEY]: (syncValue) => {
        debug("Got storage value update info", syncValue.newValue)

        this.#handlePersistentDataUpdate(syncValue.newValue)
      }
    })
    this.fetchStateFromStorage()
  }

  private onStateChange(key: keyof T, value: any) {
    if (key === "*" || !this.#state.keyIsPersistent(key)) return

    this.#storageValue[key] = value
    this.#storage.set(this.#STORAGE_KEY, JSON.stringify(this.#storageValue))
    debug("Pushed changed to persistent storage")
  }

  async fetchStateFromStorage(): Promise<void> {
    const stateString = await this.#storage.get(this.#STORAGE_KEY)
    if (!stateString) return
    this.#handlePersistentDataUpdate(stateString)
  }

  #handlePersistentDataUpdate(stateString: string) {
    const state = JSON.parse(stateString)
    this.#storageValue = state

    for (const [key, value] of Object.entries(state)) {
      this.#state.current[key] = value
    }
    debug("Fetched state from persistent storage")
  }

  destroy() {
    this.#state.removeListener("change", this.onStateChange)
    this.#state = null
    // TODO: Remove storage listeners
  }
}
