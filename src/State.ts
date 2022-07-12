import debugging from "debug"
import EventEmitter from "events"

import Persistence from "./Persistence"
import ContentSyncModule from "./Sync/ContentSyncModule"
import ExtensionSyncModule from "./Sync/ExtensionSyncModule"
import type SyncModule from "./Sync/SyncModule"
import { getCurrentTabId } from "./getTabId"
import { SetupConfig, StateEnvironment } from "./types"

const debug = debugging("plasmo-state:State")

/**
 * Central state management class.
 */
export default class State<T extends object> extends EventEmitter {
  #state: T
  #environment: StateEnvironment
  #config: SetupConfig<T>
  setupDone = false
  #isDestroyed = false

  #syncModule: SyncModule<T>
  #persistence: Persistence<T>

  constructor(
    environment: StateEnvironment,
    initialState: T,
    config?: SetupConfig<T>
  ) {
    super()

    this.#environment = environment

    this.#state = initialState
    this.#config = config || {}
    this.#persistence = new Persistence(this)

    this.#setup()
  }

  async #setup() {
    debug("Setting up...")
    if (!this.#config.tabId) {
      this.#config.tabId = await getCurrentTabId(this.#environment)
      debug("Dynamically got tab ID", this.#config.tabId)
    }

    this.#syncModule = this.#createSyncModule()
    debug("Sync module created, pulling initial data")
    await this.#syncModule.pull()
    this.setupDone = true
    debug("Setup done")
  }

  #createSyncModule(): SyncModule<T> {
    if (
      this.#environment === StateEnvironment.Background ||
      this.#environment === StateEnvironment.Popup
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
        this.ensureNotDestroyed()

        target[key] = value

        this.#syncModule?.push()

        this.emit("change", key, value)
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
  replace(state: T) {
    this.ensureNotDestroyed()
    this.#state = state
    this.emit("change", "*", state)
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
