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

async function onBAClicked(tab) {
  let container = await createContainer();
  await browser.tabs.create({
    active: true,
    index: tab.index,
    url: tab.url,
    cookieStoreId: container.cookieStoreId,
  });
  browser.tabs.remove(tab.id);
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
