/* global browser */

// cookieStoreIds of all managed containers
let historyPermissionEnabled = false;
let intId = null;
let historyCleanUpQueue = [];
let containerCleanupTimer = null;
let toolbarAction = "";
let histdeldelay = 30000;
let tcdeldelay = 5000;
let regexList = null;
let ignoredRegexList = null;
let emojis = [];
let emojisoffset = 0;

// array of all allowed container colors
const allcolors = [
  "blue",
  "turquoise",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
];
let usecolors = [];
const historyPermission = {
  permissions: ["history"],
};

function isOnRegexList(url) {
  for (let i = 0; i < regexList.length; i++) {
    if (regexList[i].test(url)) {
      return true;
    }
  }
  return false;
}

function isOnIngoreList(url) {
  for (let i = 0; i < ignoredRegexList.length; i++) {
    if (ignoredRegexList[i].test(url)) {
      return true;
    }
  }
  return false;
}

async function buildIgnoreRegexList() {
  const out = [];
  (await getFromStorage("string", "textarea_ignoreregexstrs", ""))
    .split("\n")
    .forEach((line) => {
      line = line.trim();
      if (line !== "") {
        try {
          out.push(new RegExp(line));
        } catch (e) {
          // todo: show a notification that a regex failed to compile ...
          console.warn(e);
        }
      }
    });
  return out;
}

async function buildRegExList() {
  const out = [];
  (await getFromStorage("string", "textarea_regexstrs", ""))
    .split("\n")
    .forEach((line) => {
      line = line.trim();
      if (line !== "") {
        try {
          out.push(new RegExp(line));
        } catch (e) {
          // todo: show a notification that a regex failed to compile ...
          console.warn(e);
        }
      }
    });
  return out;
}

async function getFromStorage(type, id, fallback) {
  let tmp = await browser.storage.local.get(id);
  if (typeof tmp[id] === type) {
    return tmp[id];
  }
  await setToStorage(id, fallback);
  return fallback;
}

async function setToStorage(id, value) {
  let obj = {};
  obj[id] = value;
  return browser.storage.local.set(obj);
}

browser.menus.create({
  title: "Open in Temp Container(s)",
  contexts: ["link", "selection", "tab", "bookmark"],
  onclick: async (clickdata, tab) => {
    const openAsActive = !clickdata.modifiers.includes("Ctrl");

    if (clickdata.linkUrl) {
      // link
      createTempContainerTab(clickdata.linkUrl, openAsActive);
    } else if (clickdata.selectionText) {
      const ret = await browser.tabs.executeScript({
        code: `
          selection = getSelection();
          out = new Set([...document.links]
           .filter((anchor) => (
                    selection.containsNode(anchor, true)
                    && typeof anchor.href === 'string'
                    && anchor.href.trim() !== ''
                )
            ).map((link) => link.href.trim() ));
          `,
      });

      const links = ret[0];

      for (const link of links) {
        createTempContainerTab(link, false);
      }
    } else if (clickdata.bookmarkId) {
      // bookmark or bookmark folder
      const bms = await browser.bookmarks.get(clickdata.bookmarkId);
      if (bms.length > 0) {
        const bm = bms[0];
        if (bm.url) {
          createTempContainerTab(bm.url);
        } else {
          for (const c of await browser.bookmarks.getChildren(
            clickdata.bookmarkId,
          )) {
            if (c.url) {
              createTempContainerTab(c.url, openAsActive);
            }
          }
        }
      }
    } else if (clickdata.frameUrl) {
      // frame
      createTempContainerTab(clickdata.frameUrl, openAsActive);
    } else if (clickdata.srcUrl) {
      // image or something with a src
      createTempContainerTab(clickdata.srcUrl);
    } else {
      // if tab.id is part of the highlighted group,
      // open the highlighted group in temp containers
      let hltabs = await browser.tabs.query({
        currentWindow: true,
        highlighted: true,
      });
      let hltids = hltabs.map((t) => t.id);
      if (hltids.includes(tab.id)) {
        for (const hlt of hltabs) {
          createTempContainerTab(hlt.url, openAsActive);
        }
      } else {
        // if the user clicked on a tab outside the highlighted group,
        // lets assume he only wants to open that tab
        createTempContainerTab(tab.url, openAsActive);
      }
    }
  },
});

// delayed container cleanup
async function onTabRemoved() {
  clearTimeout(containerCleanupTimer);
  containerCleanupTimer = setTimeout(async () => {
    const containerWithTabs = new Set(
      (await browser.tabs.query({})).map((t) => t.cookieStoreId),
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
  }, tcdeldelay);
}

async function createTempContainerTab(url, activ = true) {
  let container = await createContainer({});
  let tabs = await browser.tabs.query({ currentWindow: true, active: true });
  const index = tabs.length > 0 ? tabs[0].index + 1 : -1;

  let obj = {
    active: activ,
    index: index,
    cookieStoreId: container.cookieStoreId,
  };
  if (typeof url === "string" && url.startsWith("http")) {
    obj["url"] = url;
  }
  return browser.tabs.create(obj);
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

async function onBAClicked(tab) {
  if (toolbarAction === "newtab") {
    createTempContainerTab();
  } else {
    if (tab.url.startsWith("http")) {
      await createTempContainerTab(tab.url, true);
    } else {
      createTempContainerTab();
    }
  }
}

async function createContainer() {
  const color = usecolors[Math.floor(Math.random() * usecolors.length)];
  const now = "" + Date.now();
  let container = await browser.contextualIdentities.create({
    name:
      "Temp" +
      emojis[emojisoffset++ % (emojis.length - 1)] +
      now.split("").reverse().join(""),
    color: color,
    icon: "circle",
  });
  /*await browser.contextualIdentities.update(container.cookieStoreId, {
    name: "Temp" + Date.now(),
  });*/
  return container;
}

async function onStorageChange() {
  toolbarAction = await getFromStorage("string", "toolbarAction", "reopen");
  usecolors = await getFromStorage("object", "usecolors", allcolors);
  if (!Array.isArray(usecolors)) {
    usecolors = allcolors;
  }
  if (usecolors.length < 1) {
    usecolors = allcolors;
  }

  listmode = await getFromStorage("string", "listmode", "include");
  regexList = await buildRegExList();
  ignoredRegexList = await buildIgnoreRegexList();
  historyCleanUpQueue = await getFromStorage(
    "object",
    "historyCleanUpQueue",
    [],
  );
}

// show the user the options page on first installation
async function onInstall(details) {
  if (details.reason === "install") {
    browser.runtime.openOptionsPage();
  }
}

async function onCommand(command) {
  switch (command) {
    case "opennewtab":
      createTempContainerTab("about:newtab");
      break;
    case "openinsame":
      // get container of currently active tab
      // create new tab with container id
      const tabs = await browser.tabs.query({
        currentWindow: true,
        active: true,
      });
      if (tabs.length > 0) {
        const atab = tabs[0];
        openNewTabInExistingContainer(atab.cookieStoreId);
      }
      break;
  }
}

async function onBeforeNavigate(details) {
  // ignore everything not http/s, like about: and moz-extensions
  if (!details.url.startsWith("http")) {
    return;
  }

  const isIgnored = isOnIngoreList(details.url);

  if (isIgnored) {
    return;
  }

  let tabInfo;
  try {
    tabInfo = await browser.tabs.get(details.tabId);
  } catch (e) {
    console.error(e);
    return;
  }

  const [inContainer, inTempContainer] = await (async (cs) => {
    try {
      const container = await browser.contextualIdentities.get(cs);
      return [true, container.name.startsWith("Temp")];
    } catch (e) {
      return [false, false];
    }
  })(tabInfo.cookieStoreId);

  if (!inContainer) {
    // not in a container
    const _isOnList = isOnRegexList(details.url);
    if (
      (listmode === "exclude" && !_isOnList) ||
      (listmode === "include" && _isOnList)
    ) {
      await createTempContainerTab(details.url, tabInfo.active);
      browser.tabs.remove(tabInfo.id);
      return { cancel: true }; // prevent history from being created?
    }
  } else {
    // in a container
    if (inTempContainer) {
      if (!historyPermissionEnabled) {
        return;
      }
      if (historyCleanUpQueue.includes(details.url)) {
        return;
      }
      historyCleanUpQueue.push(details.url);
      setToStorage("historyCleanUpQueue", historyCleanUpQueue);
    }
  }
}

function cleanupHistory() {
  const len = historyCleanUpQueue.length;
  const its = len > 1 ? len / 2 : 1;
  for (let i = 0; i < its; i++) {
    try {
      browser.history.deleteUrl({
        url: historyCleanUpQueue.shift(),
      });
    } catch (e) {
      //noop
      console.warn(e);
    }
  }
  setToStorage("historyCleanUpQueue", historyCleanUpQueue);
}

async function handlePermissionChange() {
  historyPermissionEnabled =
    await browser.permissions.contains(historyPermission);
  clearInterval(intId);
  if (historyPermissionEnabled) {
    intId = setInterval(cleanupHistory, histdeldelay);
  }
}

async function onTabsUpdated(tabId, changeInfo, tabInfo) {
  if (typeof changeInfo.url === "string" && changeInfo.url.startsWith("http")) {
    const inTempContainer = await (async (cs) => {
      try {
        const container = await browser.contextualIdentities.get(cs);
        return container.name.startsWith("Temp");
      } catch (e) {
        return false;
      }
    })(tabInfo.cookieStoreId);

    if (inTempContainer) {
      if (!historyPermissionEnabled) {
        return;
      }
      if (historyCleanUpQueue.includes(changeInfo.url)) {
        return;
      }
      historyCleanUpQueue.push(changeInfo.url);
      setToStorage("historyCleanUpQueue", historyCleanUpQueue);
    }
  }
}

(async () => {
  browser.runtime.onInstalled.addListener(onInstall); // needs to be first

  // init vars
  await onStorageChange();
  await handlePermissionChange();

  let tmp = await fetch("emojis.json");
  emojis = await tmp.json();
  emojis = emojis
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
  emojisoffset = Math.floor(Math.random() * emojis.length);

  // trigger inital cleanup, for browser re-start
  setTimeout(onTabRemoved, tcdeldelay);

  // register listeners
  browser.browserAction.onClicked.addListener(onBAClicked);
  browser.commands.onCommand.addListener(onCommand);
  browser.permissions.onAdded.addListener(handlePermissionChange);
  browser.permissions.onRemoved.addListener(handlePermissionChange);
  browser.storage.onChanged.addListener(onStorageChange);
  browser.tabs.onRemoved.addListener(onTabRemoved);
  browser.webRequest.onBeforeRequest.addListener(
    onBeforeNavigate,
    { urls: ["<all_urls>"], types: ["main_frame"] },
    ["blocking"],
  );
  browser.tabs.onUpdated.addListener(onTabsUpdated, { properties: ["url"] });
})();
