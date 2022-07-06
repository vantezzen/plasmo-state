import browser from "webextension-polyfill"

export async function getCurrentTabId(): Promise<number> {
  if ("tabs" in browser) {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true
    })
    if (!tabs[0] || !tabs[0].id) {
      // We can't connect to a page
      return -1
    }
    return tabs[0].id
  }
  return -1
}
