function getLinks(message, sender, callback) {
  const result = new Set();

  const selection = window.getSelection();
  if (selection === null) {
    return;
  }
  if (selection.type === "Range") {
    // loop through all the ranges, so firefox's column select also works
    for (let ri = 0; ri < selection.rangeCount; ri++) {
      const ancestor = selection.getRangeAt(ri).commonAncestorContainer;
      if (ancestor.nodeName == "#text") {
        continue;
      }
      // To find all selected links we'll get all <a> elements found in the
      // commonAncestorContainer of the selection, and then filter those
      // to find the ones that are at least partially within the selection.
      ancestor.querySelectorAll("a").forEach((e) => {
        if (
          !selection.containsNode(e, true) ||
          e.href === "" ||
          result.has(e.href)
        ) {
          return; // Need only links from selection, with duplicates filtered out
        }
        result.add(e.href);
      });
    }
    callback(Array.from(result));
  }
}

browser.runtime.onMessage.addListener(getLinks);
