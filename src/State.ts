import debugging from "debug"
import EventEmitter from "events"

import Persistence from "./Persistence"
import ContentSyncModule from "./Sync/ContentSyncModule"
import ExtensionSyncModule from "./Sync/ExtensionSyncModule"
import type SyncModule from "./Sync/SyncModule"
import { getCurrentTabId } from "./getTabId"
import { ChangeSource, SetupConfig, StateEnvironment } from "./types"

/**
 * Central state management class.
 */
export default class State<T extends object> extends EventEmitter {
  #state: T
  #environment: StateEnvironment
  #config: SetupConfig<T>
  #readyProgress: number = 0
  setupDone = false
  #isDestroyed = false

  #syncModule: SyncModule<T>
  #persistence: Persistence<T>
  #debug: any

  currentSource: ChangeSource = "user"

  constructor(
    environment: StateEnvironment,
    initialState: T,
    config?: SetupConfig<T>
  ) {
    super()

    this.#environment = environment
    this.#debug = debugging(`plasmo-state:State:${environment}`)

    this.#debug("State created")

    this.#state = initialState
    this.#config = config || {}
    this.#persistence = new Persistence(this)

    this.#setup()
  }

  async #setup() {
    this.#debug("Setting up...")
    if (!this.#config.tabId) {
      this.#config.tabId = await getCurrentTabId(this.#environment)
      this.#debug("Dynamically got tab ID", this.#config.tabId)
    }

    this.#syncModule = this.#createSyncModule()
    this.#debug("Sync module created, pulling initial data")
    await this.#syncModule.pull()
    this.setupDone = true
    this.#debug("Setup done")
    this.increaseReadyProgress()
  }

  /**
   * Internal method to increase the ready progress
   * This is used to determine if the state is ready to be used
   *
   * Do not call this manually!
   */
  increaseReadyProgress() {
    this.#readyProgress++
    if (this.#readyProgress === 2) {
      this.emit("ready")
    }
  }

  #createSyncModule(): SyncModule<T> {
    if (
      this.#environment === StateEnvironment.Background ||
      this.#environment === StateEnvironment.Popup ||
      this.#environment === StateEnvironment.Offscreen
    ) {
      return new ExtensionSyncModule(this)
    }
    return new ContentSyncModule(this)
  }

  /**
   * Get the current state as a proxy object.
   *
   * This allows direct modification of the object without helper classes like "set" or "merge".
   */
  get current() {
    return new Proxy(this.#state, {
      get: (target, key) => {
        this.ensureNotDestroyed()
        return target[key]
      },
      set: (target, key, value) => {
        if (value === target[key]) return true

        this.ensureNotDestroyed()

        target[key] = value

        if (
          this.currentSource === "user" &&
          !this.keyIsPersistent(key as keyof T)
        ) {
          this.#syncModule?.push()
        }

        this.emit("change", key, this.currentSource)
        return true
      }
    })
  }

  /**
   * Gets the current state as a raw object.
   * Please note that this is NOT a proxy object. Do not modify it as changes will not be synced and may be overridden at any time
   */
  get currentRaw() {
    this.ensureNotDestroyed()
    return this.#state as Readonly<T>
  }

  /**
   * Get the current tab ID that is used for syncing
   */
  get tabId() {
    return this.#config.tabId
  }

  /**
   * Get the current environment this instance is set to work in
   */
  get environment(): StateEnvironment {
    return this.#environment
  }

  /**
   * Checks if a key should be persisted in the browser storage
   *
   * @param key Key to check
   * @returns
   */
  keyIsPersistent(key: keyof T) {
    if (!("persistent" in this.#config)) return false
    return this.#config.persistent.includes(key)
  }

  /**
   * Please the state object with new values without merging.
   * This is mostly used internally and should NOT be used for changing individual values.
   * Changes may not be synced - use the Proxy for that
   *
   * @param state New state object
   */
  replace(state: T, source: ChangeSource) {
    this.ensureNotDestroyed()
    this.#state = state
    this.emit("change", "*", source)
  }

  /**
   * Destroy the instance and clean up.
   * This will remove all listeners and stops syncing to enable the instance to be garbage collected.
   *
   * After detroying the instance, it is not possible to use it anymore!
   */
  destroy() {
    this.#syncModule.destroy()
    this.#persistence.destroy()
    this.#isDestroyed = true
  }

  /**
   * Check if the instance is destroyed
   */
  get isDestroyed() {
    return this.#isDestroyed
  }

  /**
   * Ensure that the state is not already destroyed, otherwise throw
   */
  ensureNotDestroyed() {
    if (this.#isDestroyed) {
      throw new Error("State is destroyed")
    }
  }
}
