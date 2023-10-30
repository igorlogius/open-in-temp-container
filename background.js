/* global browser */

// cookieStoreIds of all managed containers
let containerCleanupTimer = null;
let opennewtab = false;
let groupcolor = "random";
let deldelay = 3000;

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

async function getFromStorage(type, id, fallback) {
  let tmp = await browser.storage.local.get(id);
  return typeof tmp[id] === type ? tmp[id] : fallback;
}

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

    containers = await browser.contextualIdentities.query({});

    containers.forEach((c) => {
      if (
        !containerWithTabs.has(c.cookieStoreId) &&
        c.name.startsWith("Temp")
      ) {
        browser.contextualIdentities.remove(c.cookieStoreId);
      }
    });
    containerCleanupTimer = null;
  }, deldelay);
}

function fixurl(url) {
  if (url.startsWith("http") || url === "about:blank") {
    return url;
  }
  return "about:blank";
}

async function createTempContainerTab(url) {
  let container = await createContainer({});
  let tabs = await browser.tabs.query({ currentWindow: true, active: true });
  const index = tabs.length > 0 ? tabs[0].index + 1 : -1;
  browser.tabs.create({
    active: true,
    index: index,
    url: fixurl(url),
    cookieStoreId: container.cookieStoreId,
  });
}

async function openNewTabInExistingContainer(cookieStoreId) {
  let tabs = await browser.tabs.query({ currentWindow: true, active: true });
  const index = tabs.length > 0 ? tabs[0].index + 1 : -1;
  browser.tabs.create({
    active: true,
    index: index,
    cookieStoreId: cookieStoreId,
  });
}

function onBAClicked(tab) {
  if (opennewtab) {
    createTempContainerTab("about:newtab");
  } else {
    createTempContainerTab(tab.url);
  }
}

async function createContainer() {
  let color =
    groupcolor !== "random"
      ? groupcolor
      : colors[Math.floor(Math.random() * colors.length)];
  let container = await browser.contextualIdentities.create({
    name: "Temp",
    color: color,
    icon: "circle",
  });
  let cookieStoreId = container.cookieStoreId;
  let name = "Temp " + Date.now();
  await browser.contextualIdentities.update(cookieStoreId, { name: name });
  return container;
}

async function syncMemory() {
  opennewtab = await getFromStorage("boolean", "opennewtab", false);
  groupcolor = await getFromStorage("string", "groupcolor", "random");
  deldelay = await getFromStorage("number", "deldelay", 3000);
}

(async () => {
  await syncMemory();
  setTimeout(onTabRemoved, deldelay);
})();

// register listeners
browser.tabs.onRemoved.addListener(onTabRemoved);
browser.browserAction.onClicked.addListener(onBAClicked);
//browser.runtime.onStartup.addListener(onTabRemoved);

browser.storage.onChanged.addListener(syncMemory);

browser.commands.onCommand.addListener(async (command) => {
  if (command === "opennewtab") {
    createTempContainerTab("about:newtab");
  }

  if (command === "openinsame") {
    // get container of currently active tab
    // create new tab with container id
    let tabs = await browser.tabs.query({ currentWindow: true, active: true });
    if (tabs.length > 0) {
      const atab = tabs[0];
      openNewTabInExistingContainer(atab.cookieStoreId);
    }
  }
});
