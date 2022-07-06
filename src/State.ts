import EventEmitter from "events"

import Persistence from "./Persistence"
import ContentSyncModule from "./Sync/ContentSyncModule"
import ExtensionSyncModule from "./Sync/ExtensionSyncModule"
import type SyncModule from "./Sync/SyncModule"
import { getCurrentTabId } from "./getTabId"
import { SetupConfig, StateEnvironment } from "./types"

export default class State<T extends object> extends EventEmitter {
  #state: T
  #environment: StateEnvironment
  #config: SetupConfig<T>
  setupDone = false

  #syncModule: SyncModule<T>

  constructor(
    environment: StateEnvironment,
    initialState: T,
    config?: SetupConfig<T>
  ) {
    super()

    this.#environment = environment

    this.#state = initialState
    this.#config = config || {}

    new Persistence(this)

    this.#setup()
  }

  async #setup() {
    if (!("tabId" in this.#config)) {
      this.#config.tabId = await getCurrentTabId()
    }

    this.#syncModule = this.#createSyncModule()
    await this.#syncModule.pull()
    this.setupDone = true
  }

  #createSyncModule() {
    if (
      this.#environment === StateEnvironment.Background ||
      this.#environment === StateEnvironment.Popup
    ) {
      return new ExtensionSyncModule(this)
    }
    return new ContentSyncModule(this)
  }

  get current() {
    return new Proxy(this.#state, {
      get: (target, key) => {
        return target[key]
      },
      set: (target, key, value) => {
        target[key] = value

        this.#syncModule?.push()

        this.emit("change", key, value)
        return true
      }
    })
  }

  get currentRaw() {
    return this.#state
  }

  get tabId() {
    return this.#config.tabId
  }

  keyIsPersistent(key: keyof T) {
    if (!("persistent" in this.#config)) return false
    return this.#config.persistent.includes(key)
  }

  replace(state: T) {
    this.#state = state
    this.emit("change", "*", state)
  }
}
