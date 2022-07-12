import browser from "webextension-polyfill"

/**
 * Get the current tab ID that is used for syncing or -1 if running in a tab-unaware environment
 */
export async function getCurrentTabId(): Promise<number> {
  if ("tabs" in browser) {
    const tabs = await browser.tabs.query({
      // TODO: Check how this behaves with multiple windows
      active: true
    })
    if (!tabs[0] || !tabs[0].id) {
      // We can't connect to a page
      return -1
    }
    return tabs[0].id
  }
  return -1
}
