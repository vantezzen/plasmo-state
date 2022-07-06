import { Storage } from "@plasmohq/storage"
import debugging from "debug"

import type State from "./State"

const debug = debugging("plasmo-state:Persistence")

export default class Persistence<T extends object> {
  #storage: Storage
  #state: State<T>
  #storageValue: Partial<T> = {}
  #STORAGE_KEY = "plasmo-sync"

  constructor(state: State<T>) {
    this.#storage = new Storage()
    this.#state = state

    this.#state.addListener("change", this.#onStateChange.bind(this))
    this.#storage.watch({
      [this.#STORAGE_KEY]: (syncValue) => {
        debug("Got storage value update info", syncValue.newValue)

        this.#storageValue = JSON.parse(syncValue.newValue)
      }
    })
    this.fetchStateFromStorage()
  }

  #onStateChange(key: keyof T, value: any) {
    if (key === "*" || !this.#state.keyIsPersistent(key)) return

    this.#storageValue[key] = value
    this.#storage.set(this.#STORAGE_KEY, JSON.stringify(this.#storageValue))
    debug("Pushed changed to persistent storage")
  }

  async fetchStateFromStorage(): Promise<void> {
    const stateString = await this.#storage.get(this.#STORAGE_KEY)
    if (!stateString) return

    const state = JSON.parse(stateString)
    this.#storageValue = state

    for (const [key, value] of Object.entries(state)) {
      this.#state.current[key] = value
    }
    debug("Fetched state from persistent storage")
  }
}
