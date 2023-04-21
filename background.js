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

async function onBAClicked(tab, clickdata = null) {
  let container = await createContainer();
  if (tab.incognito) {
    await browser.windows.create({
      url: fixurl(tab.url),
      focused: true,
      incognito: false,
      cookieStoreId: container.cookieStoreId,
    });
  } else {
    await browser.tabs.create({
      active: true,
      index: tab.index + 1,
      url: fixurl(tab.url),
      cookieStoreId: container.cookieStoreId,
    });
  }
  // remove tab if the user did not hold down Ctrl or clicked with the Auxiliary button (wheel)
  if (
    clickdata !== null &&
    !clickdata.modifiers.includes("Ctrl") &&
    clickdata.button !== 1
  ) {
    browser.tabs.remove(tab.id);
  }
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

browser.commands.onCommand.addListener(async (command) => {
  if (command === "onlyopen") {
    const tabs = await browser.tabs.query({
      currentWindow: true,
      active: true,
    });
    if (tabs.length > 0) {
      onBAClicked(tabs[0]);
    }
  }
});
