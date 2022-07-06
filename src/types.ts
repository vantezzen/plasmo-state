export enum StateEnvironment {
  Popup = "popup",
  Background = "background",
  Content = "content"
}

export type SetupConfig<T> = {
  persistent?: (keyof T)[]
  tabId?: number
}

export type SyncMessage<T> = {
  type: "sync"
  action: "push" | "pull" | "tabId"
  data: T
  tabId: number
}
