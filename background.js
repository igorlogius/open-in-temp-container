/* global browser */

// cookieStoreIds of all managed containers
var containers = new Set();
let containerCleanupTimer = null;

// array of all allowed container colors
const colors = [
  "blue",
  "turquoise",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
];

browser.menus.create({
  title: "Open in Temp Container",
  contexts: ["link", "page", "tab", "bookmark"],
  onclick: async (clickdata, tab) => {
    if (clickdata.linkUrl) {
      createTempContainerTab(clickdata.linkUrl);
    } else if (clickdata.bookmarkId) {
      const bms = await browser.bookmarks.get(clickdata.bookmarkId);
      if (bms.length > 0) {
        const bm = bms[0];
        if (bm.url) {
          createTempContainerTab(bm.url);
        }
      }
    } else if (clickdata.frameUrl) {
      createTempContainerTab(clickdata.frameUrl);
    } else if (clickdata.srcUrl) {
      createTempContainerTab(clickdata.srcUrl);
    } else if (clickdata.pageUrl) {
      createTempContainerTab(clickdata.pageUrl);
    } else if (tab.url) {
      createTempContainerTab(tab.url);
    }
  },
});

// delayed container cleanup
async function onTabRemoved() {
  if (containerCleanupTimer !== null) {
    clearTimeout(containerCleanupTimer);
  }

  containerCleanupTimer = setTimeout(async () => {
    const containerWithTabs = new Set(
      (await browser.tabs.query({})).map((t) => t.cookieStoreId)
    );
    containers.forEach((c) => {
      if (!containerWithTabs.has(c)) {
        containers.delete(c);
        browser.contextualIdentities.remove(c);
      }
    });
    containerCleanupTimer = null;
  }, 5000);
}

function fixurl(url) {
  if (url.startsWith("http") || url === "about:blank") {
    return url;
  }
  return "about:blank";
}

async function createTempContainerTab(url) {
  let container = await createContainer();

  let tabs = await browser.tabs.query({ currentWindow: true, active: true });

  const index = tabs.length > 0 ? tabs[0].index + 1 : -1;

  browser.tabs.create({
    active: true,
    index: index,
    url: fixurl(url),
    cookieStoreId: container.cookieStoreId,
  });
}

function onBAClicked(tab) {
  createTempContainerTab(tab.url);
}

async function createContainer() {
  let color = colors[Math.floor(Math.random() * colors.length)];
  let container = await browser.contextualIdentities.create({
    name: "Temp",
    color: color,
    icon: "circle",
  });
  let cookieStoreId = container.cookieStoreId;
  let name = "Temp " + Date.now();
  await browser.contextualIdentities.update(cookieStoreId, { name: name });
  containers.add(cookieStoreId);
  return container;
}

// register listeners
browser.tabs.onRemoved.addListener(onTabRemoved);
browser.browserAction.onClicked.addListener(onBAClicked);
