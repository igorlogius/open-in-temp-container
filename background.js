/* global browser */

// cookieStoreIds of all managed containers
let historyPermissionEnabled = false;
let intId = null;
let historyCleanUpQueue = [];
let containerCleanupTimer = null;
let toolbarAction = "";
let deldelay = 30000; // delay until Tmp Containers and History Entries are removed
let multiopen = 2;
let multiopen2 = 3;
let multiopen3 = 4;
let regexList = null;
let neverOpenInTempContainerRegexList = null;
let containerForSameOrigin = true;

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

function isOnNeverOpenInTempContainerRegexList(url) {
  for (let i = 0; i < neverOpenInTempContainerRegexList.length; i++) {
    if (neverOpenInTempContainerRegexList[i].test(url)) {
      return true;
    }
  }
  return false;
}

async function buildNeverOpenInTempContainerRegExList() {
  const out = [];
  (await getFromStorage("string", "textarea_neveropenintcregexstrs", ""))
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
  if (containerCleanupTimer !== null) {
    clearTimeout(containerCleanupTimer);
  }

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
    containerCleanupTimer = null;
  }, deldelay);
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

function onBAClicked(tab) {
  if (toolbarAction === "newtab") {
    createTempContainerTab();
  } else {
    createTempContainerTab(tab.url);
  }
}

async function createContainer() {
  let color = usecolors[Math.floor(Math.random() * usecolors.length)];
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

async function onStorageChange() {
  toolbarAction = await getFromStorage("string", "toolbarAction", "reopen");
  usecolors = await getFromStorage("object", "usecolors", allcolors);
  if (!Array.isArray(usecolors)) {
    usecolors = allcolors;
  }
  if (usecolors.length < 1) {
    usecolors = allcolors;
  }
  multiopen = await getFromStorage("number", "multiopen", 2);
  multiopen2 = await getFromStorage("number", "multiopen2", 3);
  multiopen3 = await getFromStorage("number", "multiopen3", 4);

  listmode = await getFromStorage("string", "listmode", "include");

  regexList = await buildRegExList();

  neverOpenInTempContainerRegexList =
    await buildNeverOpenInTempContainerRegExList();

  historyCleanUpQueue = await getFromStorage(
    "object",
    "historyCleanUpQueue",
    [],
  );

  containerForSameOrigin = await getFromStorage("boolean", "sameorigin", true);
}

// show the user the options page on first installation
async function onInstall(details) {
  if (details.reason === "install") {
    browser.runtime.openOptionsPage();
  }
  // convert storage data
  if (details.reason === "update") {
    let selectors = await getFromStorage("object", "selectors", []);

    out = "";
    selectors.forEach((e) => {
      if (typeof e.url_regex === "string") {
        out = out + e.url_regex + "\n";
      }
    });

    if (out !== "") {
      setToStorage("textarea_regexstrs", out);
    }
  }
}

async function onCommand(command) {
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

  if (command.startsWith("multiopen")) {
    let repeat = 0;

    switch (command) {
      case "multiopen":
        repeat = multiopen;
        break;
      case "multiopen2":
        repeat = multiopen2;
        break;
      case "multiopen3":
        repeat = multiopen3;
        break;
      default:
        return;
    }
    let tabs = await browser.tabs.query({ currentWindow: true, active: true });
    if (tabs.length > 0) {
      const atab = tabs[0];
      for (let i = 0; i < repeat; i++) {
        createTempContainerTab(atab.url);
      }
    }
  }
}

function sameOrigin(urlA, urlB) {
  const a = new URL(urlA);
  const b = new URL(urlB);
  return a.origin === b.origin;
}

async function onBeforeNavigate(details) {
  if (details.frameId > 0) {
    return;
  }
  if (typeof details.url !== "string") {
    return;
  }
  if (!details.url.startsWith("http")) {
    return;
  }
  const _isOnNeverInTempContainerRegexList =
    isOnNeverOpenInTempContainerRegexList(details.url);

  const tabInfo = await browser.tabs.get(details.tabId);
  try {
    const container = await browser.contextualIdentities.get(
      tabInfo.cookieStoreId,
    );
    // in a container
    if (container.name.startsWith("Temp")) {
      if (_isOnNeverInTempContainerRegexList) {
        const obj = {
          active: tabInfo.active || false,
          url: details.url,
        };
        browser.tabs.create(obj);
        browser.tabs.remove(details.tabId);
        return;
      }

      // make links open from containered tabs not open in the same container
      // !experimental
      if (tabInfo.openerTabId && containerForSameOrigin) {
        const openertabInfo = await browser.tabs.get(tabInfo.openerTabId);
        if (openertabInfo.cookieStoreId === tabInfo.cookieStoreId) {
          if (!sameOrigin(details.url, openertabInfo.url)) {
            await createTempContainerTab(details.url, tabInfo.active);
            browser.tabs.remove(details.tabId);
          }
        }
      }

      if (!historyPermissionEnabled) {
        return;
      }
      if (historyCleanUpQueue.includes(details.url)) {
        return;
      }
      historyCleanUpQueue.push(details.url);
      setToStorage("historyCleanUpQueue", historyCleanUpQueue);
    }
  } catch (e) {
    if (!_isOnNeverInTempContainerRegexList) {
      // not in a container
      const _isOnList = isOnRegexList(details.url);
      if (
        (listmode === "exclude" && !_isOnList) ||
        (listmode === "include" && _isOnList)
      ) {
        await createTempContainerTab(details.url, tabInfo.active);
        browser.tabs.remove(details.tabId);
      }
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
    }
  }

  setToStorage("historyCleanUpQueue", historyCleanUpQueue);
}

async function handlePermissionChange() {
  historyPermissionEnabled =
    await browser.permissions.contains(historyPermission);
  clearInterval(intId);
  if (historyPermissionEnabled) {
    intId = setInterval(cleanupHistory, deldelay);
  }
}

(async () => {
  browser.runtime.onInstalled.addListener(onInstall); // needs to be first

  // init vars
  await onStorageChange();

  await handlePermissionChange();

  // trigger inital cleanup, for browser restart
  setTimeout(onTabRemoved, deldelay);

  // register listeners
  browser.browserAction.onClicked.addListener(onBAClicked);
  browser.commands.onCommand.addListener(onCommand);
  browser.storage.onChanged.addListener(onStorageChange);
  browser.tabs.onRemoved.addListener(onTabRemoved);

  browser.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate);
  browser.webNavigation.onHistoryStateUpdated.addListener(onBeforeNavigate);
  browser.webNavigation.onReferenceFragmentUpdated.addListener(
    onBeforeNavigate,
  );
  browser.webNavigation.onErrorOccurred.addListener(onBeforeNavigate);
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
    if (changeInfo.url) {
      onBeforeNavigate({
        frameId: 0,
        tabId,
        url: changeInfo.url,
      });
    }
  });

  browser.permissions.onAdded.addListener(handlePermissionChange);
  browser.permissions.onRemoved.addListener(handlePermissionChange);
})();
