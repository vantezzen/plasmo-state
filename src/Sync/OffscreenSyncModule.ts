import debugging from "debug"
import browser, { Runtime } from "webextension-polyfill"
import type { SyncMessage, ChangeSource } from "../types" // Adjusted path
import type State from "../State" // Adjusted path
import SyncModule from "./SyncModule"

const debug = debugging("plasmo-state:Sync:OffscreenSyncModule")

export default class OffscreenSyncModule<T extends object> extends SyncModule<T> {
  constructor(state: State<T>) {
    super(state)
    debug("OffscreenSyncModule created")
    // IMPORTANT: Unlike ExtensionSyncModule, DO NOT initialize a Persistence object here.
    // Offscreen documents cannot directly access chrome.storage.

    // Add listener for messages from the background script
    browser.runtime.onMessage.addListener(this.handleRuntimeMessage.bind(this))
  }

  private handleRuntimeMessage(message: SyncMessage<T>, sender: Runtime.MessageSender) {
    // Filter messages not intended for this module or from other offscreen documents
    if (message.type !== "sync" || message.tabId !== this.state.tabId) { // tabId might be undefined or need adjustment for offscreen
        // Or perhaps a dedicated message type for offscreen->background communication.
        // For now, let's assume background will send messages with the correct tabId or a specific identifier.
      return
    }

    debug("Received message from background:", message)

    if (message.action === "update") {
      this.state.replace(message.payload, "background") // Or an appropriate ChangeSource
    }
    // Potentially handle other actions if needed in the future
  }

  async push(pushUpdateMessage: SyncMessage<T>) {
    debug("Pushing state to background:", pushUpdateMessage.payload)
    try {
      // Send a message to the background script to handle persistence and relay
      await browser.runtime.sendMessage({
        type: "sync", // Keep consistent with other messages
        action: "pushStateOffscreen", // Specific action for background to identify
        tabId: this.state.tabId, // Include tabId or a unique identifier for this offscreen document
        payload: pushUpdateMessage.payload
      })
    } catch (error) {
      debug("Error pushing state to background:", error)
      // Handle error (e.g., if background script is not available)
    }
  }

  async pull(): Promise<T | void> {
    debug("Pulling state from background")
    try {
      const response = await browser.runtime.sendMessage({
        type: "sync",
        action: "pullStateOffscreen", // Specific action
        tabId: this.state.tabId
      })
      if (response) {
        debug("Received state from background on pull:", response)
        // The replace method expects the full state, not just a part of it.
        // Ensure the background sends the complete state object.
        this.state.replace(response, "background") // Or an appropriate ChangeSource
        return response
      }
    } catch (error) {
      debug("Error pulling state from background:", error)
      // Handle error (e.g., if background script is not available)
    }
    // Do not call super.pull() as it might try to use Persistence
  }
  
  // Override destroy to remove the runtime message listener
  destroy() {
    super.destroy() // Call if SyncModule.destroy() has generic cleanup
    browser.runtime.onMessage.removeListener(this.handleRuntimeMessage.bind(this))
    debug("OffscreenSyncModule destroyed")
  }

  // Offscreen environments do not directly handle persistence.
  // Override methods related to persistence if SyncModule has them,
  // or ensure they are not called for OffscreenSyncModule.
  // For example, if SyncModule.destroy() tries to call this.persistence.destroy(),
  // #persistence will be undefined.
  // The State class creates the persistence instance. We need to ensure it's not used.
  // The easiest is to ensure OffscreenSyncModule doesn't have a `this.#persistence` property.
}
