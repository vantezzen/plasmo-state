# plasmo-state

This package allows you to have a synced state across your content scripts, background workers and popup page - optionally persisting specific values across tabs.

Many extensions require specific state info to be available across environments but often partitioned by tab and not always persistent - e.g. the current credentials for a password manager or if features are enabled on the current tab.
These use-cases are not currently supported by Plasmo's own "storage" package as it only supports persistent values across all tabs.

This package aims to provide a mostly unopinionated interface for storing that state while abstracting away browser-level details like state sync.

## Demo

A demo extension can be found in `./example`.

![](https://github.com/vantezzen/plasmo-state/raw/main/demo.gif)

## Installation

Simply install the NPM package via

```bash
npm i @vantezzen/plasmo-state
# or
pnpm i @vantezzen/plasmo-state
# or
yarn add @vantezzen/plasmo-state
```

Additionally, you need to add the `storage` permission to you manifest overrides if you want to use the feature:

```JSON
"manifest": {
  "permissions": [
    "storage"
  ]
}
```

## Usage

This library is Typescript-first - using it will ensure that your code is type-safe and will also help you to avoid common mistakes.

For a full example on how to use the library take a look at the [example](./example/) directory.

### setupState

The `State` class provides the main instance used for syncing state. You can create an instance using the `setupState` utility function:

```ts
import setupState, { StateEnvironment } from "@vantezzen/plasmo-state"

// State type that defines all your state properties for the current environment
export type State = {
  // Only used on a single tab - this is the default behaviour
  counter: number

  persistentKey: string

  // State key that doesn't have a default value
  withoutDefault?: string
}

// State that will be used by default and as long as no data has been provided by other environments yet
const initialState: State = {
  counter: 0,
  persistentKey: "Persistent"
}

const environment = StateEnvironment.Popup

const plasmoState = setupState<State>(environment, initialState, {
  // Peristent in the browser storage. Persistent keys will automatically be shared across tabs
  persistent: ["persistentKey"]
})
```

`setupState` requires two arguments:

- `environment`: The environment that the state is being used in. The state needs to be aware of if it is running in a popup, background or content script.
  Use the `StateEnvironment` enum to specify this or use the string "popup", "background", "offscreen" or "content" instead if you cannot use the enum.
- `initialState`: The initial state that will be used if no state has been provided by other environments yet.

You can also set the generic type of the state (as seen using `setupState<State>` above), otherwise the type checker will use the type of the initialState argument.

Optionally a third argument "config" can be provided to specify these properties:

- `persistent`: An array of property names that should be persisted in the browser storage.
  If you don't specify this, no properties will be persisted. By enabling persistence, the value will also be shared across tabs.
- `tabId`: The tab ID that the state should be shared with. If not specified, the tab ID of the current active tab will be used.
  This is only used if the environment is `StateEnvironment.Background`, `StateEnvironment.Offscreen` or `StateEnvironment.Popup` as `StateEnvironment.Content` will already be contained in a specific tab.
  It is highly recommended to specify this in the background script as working with multiple windows may result in unexpected behaviour.

### Get and modify state

The library uses [JavaScript Proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to provide an intuitive API for accessing and modifying state.

You can use `state.current` to get proxy object for the current state. This object will be updated automatically when the state is synced. This object can be read from and modified like a normal JS object.

```js
import setupState from "@vantezzen/plasmo-state"
const state = setupState(..., {
  counter: 0
});

console.log(state.current.counter) // 0
state.current.counter = 1
console.log(state.current.counter) // 1
```

Please note that this only works for top-level modifications. If modifying a nested property, you need to re-set the value manually:

```js
import setupState from "@vantezzen/plasmo-state"
const state = setupState(..., {
  todoItems: ["Buy milk"]
});

// Proxy doesn't get triggered by this!
state.current.todoItems.push("Buy eggs")

// This will trigger the proxy to update the state:
state.current.todoItems = [
  ...state.current.todoItems,
  "Buy eggs"
]
```

### React integration

This library provides a `usePlasmoState` hook that can be used to couple a state instance with a React component. This will automatically update the component when the state is updated.

Provide your current state as the first argument to the hook and the state returns the `state.current` proxy object that you can use to read and modify the state.

```js
import setupState, { usePlasmoState } from "@vantezzen/plasmo-state"
const plasmoState = setupState(..., {
  counter: 0
});

const Counter = () => {
  const state = usePlasmoState(plasmoState)

  return (
    <div>
      {state.counter}
      <button onClick={() => state.counter++}>
        Increment
      </button>
    </div>
  )
}
```

### Listen for changes

The `State` extends the NodeJS [`EventEmitter`](https://nodejs.org/api/events.html#class-eventemitter) to allow you to listen for changes in the state.

```js
import setupState, { ChangeSource } from "@vantezzen/plasmo-state"
const state = setupState(..., {
  counter: 0
});
state.on("change", (key: string, source: ChangeSource) => {
  console.log("State changed", key, source)
})
```

If the state is changed in the current environment (i.e. not synced across content script, popup or background worker), the key will be the changed property. For all other events (synced across, loaded from storage, etc.) the key will be `"*"`.

The source can be `"user"` if the change was triggered by your script, `"sync"` if the change was triggered by another environment, or `"storage"` if the change was triggered by the browser storage.

Additionally, you may use `.once(...)` or `.removeListener(...)` to customize listener behaviour.

### Listen for ready event

The `State` class also provides a `ready` event that is emitted when the state is ready to be used.

Before the `ready` event is emitted, the state might be your default provided state or a partial loaded state from storage or other environments. Due to this, code that can handle changes in the state (e.g. React input components) can be executed before the state is ready, static code that requires the state to be final (e.g. scripts that execute based on the saved behaviour) should instead be executed after the state is ready.

```js
import setupState, { ChangeSource } from "@vantezzen/plasmo-state"
const state = setupState(..., {
  counter: 0
});
state.on("ready", () => {
  console.log("State is ready")
})
```

### Destroy instance

The `State` class provides a `destroy` method that can be used to destroy the state instance. This will remove all internal listeners to allow the instance to be garbage collected.

```js
import setupState from "@vantezzen/plasmo-state"
const state = setupState(...);

state.destroy()
```

## Info

### Messages

Please note that this package will send browser messages when synchronizing data. If your extension uses messages too, please make sure that your listeners ignore the sync messages and won't crash. Sync messages can be identified by having `{ type: "sync" }` as one of their properties.

### Storage

This library uses the storage key `plasmo-sync` to store persistent state. Please make sure your code doesn't override that key manually as this might result in corrupted data.

### Plasmo

This library is not associated with Plasmo Corp. in any way.

## License

[MIT](./LICENSE)
