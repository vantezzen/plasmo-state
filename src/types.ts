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
  action: "push" | "pull" | "tabId" | "pushStateOffscreen" | "pullStateOffscreen" // Added offscreen actions
  data?: T // Made data optional as pullStateOffscreen might not have it
  payload?: T // Added for offscreen messages, consistent with handleRuntimeMessage
  tabId: number
}

// Added "content", "background", and "offscreen" to ChangeSource
export type ChangeSource = "user" | "content" | "background" | "storage" | "sync" | "offscreen";
