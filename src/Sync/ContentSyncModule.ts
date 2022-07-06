import debugging from "debug"

import SyncModule from "./SyncModule"

const debug = debugging("plasmo-state:Sync:ContentSyncModule")

/**
 * Sync Module to use when running in a content script environment
 */
export default class ContentSyncModule<
  T extends object
> extends SyncModule<T> {}
