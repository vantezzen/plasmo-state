import browser from "webextension-polyfill"

import { StateEnvironment } from "./types"

/**
 * Get the current tab ID that is used for syncing or -1 if running in a tab-unaware environment
 */
export async function getCurrentTabId(
  environment: StateEnvironment
): Promise<number> {
  if ("tabs" in browser) {
    const query: browser.Tabs.QueryQueryInfoType = { active: true }
    if (environment === StateEnvironment.Popup) {
      query.currentWindow = true
    }

    const tabs = await browser.tabs.query(query)
    if (!tabs[0] || !tabs[0].id) {
      // We can't connect to a page
      return -1
    }
    return tabs[0].id
  }
  return -1
}
