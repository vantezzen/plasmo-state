import debugging from "debug"
import browser from "webextension-polyfill"

import type State from "./State"
import type { ChangeSource } from "./types"
import { StateEnvironment } from "./types" // Added import

/**
 * Provide persistence for the state.
 * This is a wrapper object around the "@plasmohq/storage" library.
 * This class will be used by the state class internally and doesn't need to be accessed directly.
 */
export default class Persistence<T extends object> {
  #state: State<T>
  #STORAGE_KEY = "plasmo-sync"
  #debug: any

  constructor(state: State<T>) {
    this.#state = state
    this.#debug = debugging(
      `plasmo-state:Persistence:${this.#state.environment}`
    )

    this.onStateChange = this.onStateChange.bind(this)
    this.#state.addListener("change", this.onStateChange)

    this.onBrowserStorageUpdate = this.onBrowserStorageUpdate.bind(this)
    // Conditionally add listener if not in Offscreen environment
    if (this.#state.environment !== StateEnvironment.Offscreen) {
      browser.storage.sync.onChanged.addListener(this.onBrowserStorageUpdate)
    }

    this.fetchStateFromStorage()
  }

  private onBrowserStorageUpdate(update: { [key: string]: any }) {
    // This check is fine as is, listener won't be added for Offscreen
    if (update[this.#STORAGE_KEY]) {
      this.#debug("Got storage value update info", update[this.#STORAGE_KEY])
      this.#handlePersistentDataUpdate(
        (update[this.#STORAGE_KEY] as any).newValue
      )
    }
  }

  private onStateChange(key: keyof T, source: ChangeSource) {
    // Skip if Offscreen
    if (this.#state.environment === StateEnvironment.Offscreen) {
      this.#debug("Offscreen environment: Skipping storage update onStateChange")
      return
    }

    if (source !== "user" || !this.#state.keyIsPersistent(key)) return

    // Filter out keys that are not persistent
    const currentState = this.#state.currentRaw
    const persistentState = Object.fromEntries(
      Object.entries(currentState).filter(([key]) =>
        this.#state.keyIsPersistent(key as keyof T)
      )
    )

    browser.storage.sync.set({
      [this.#STORAGE_KEY]: JSON.stringify(persistentState)
    })
    this.#debug("Pushed changed to persistent storage")
  }

  async fetchStateFromStorage(): Promise<void> {
    try {
      if (this.#state.environment === StateEnvironment.Offscreen) {
        this.#debug("Offscreen environment: Skipping fetch from storage")
        return Promise.resolve()
      }

      const state = await browser.storage.sync.get(this.#STORAGE_KEY)
      this.#debug("fetchStateFromStorage", state)

      if (state[this.#STORAGE_KEY]) {
        this.#handlePersistentDataUpdate(state[this.#STORAGE_KEY])
      }
    } catch (error) {
      this.#debug("Error in fetchStateFromStorage:", error)
      // Handle or log error as appropriate
    } finally {
      // Ensure increaseReadyProgress is always called
      this.#state.increaseReadyProgress()
    }
  }

  #handlePersistentDataUpdate(stateString: string) {
    const state = JSON.parse(stateString)

    this.#state.currentSource = "storage"
    for (const [key, value] of Object.entries(state)) {
      this.#state.current[key] = value
    }
    this.#state.currentSource = "user"
    this.#debug("Fetched state from persistent storage")
  }

  destroy() {
    this.#state.removeListener("change", this.onStateChange)
    // Conditionally remove listener if not in Offscreen environment
    if (this.#state.environment !== StateEnvironment.Offscreen) {
      browser.storage.sync.onChanged.removeListener(this.onBrowserStorageUpdate)
    }
    // Setting #state to null should be done carefully, ensure it's intended.
    // If #state can be null, other methods might need null checks for this.#state.environment
    // For now, assuming #state is valid until destroy is fully completed.
    // this.#state = null // Commenting this out for now as it might cause issues if other async operations are pending
    this.#debug("Persistence module destroyed")
  }
}
