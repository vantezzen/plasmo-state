/**
 * Environment that hosts the current State instance
 */
export enum StateEnvironment {
  Popup = "popup",
  Background = "background",
  Content = "content",
  Offscreen = "offscreen"
}

/**
 * Configuration for the state
 */
export type SetupConfig<T> = {
  persistent?: (keyof T)[]
  tabId?: number
}

/**
 * Messages sent internally for synchronization
 */
export type SyncMessage<T> = {
  type: "sync"
  action: "push" | "pull" | "tabId"
  data: T
  tabId: number
}

export type ChangeSource = "user" | "storage" | "sync"
