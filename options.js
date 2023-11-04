/* global browser */

function onChange(evt) {
  let id = evt.target.id;
  let el = document.getElementById(id);

  let value = el.type === "checkbox" ? el.checked : el.value;
  let obj = {};

  console.log(id, value, el.type);
  if (value === "") {
    return;
  }
  if (el.type === "number") {
    try {
      value = parseInt(value);
      if (isNaN(value)) {
        value = el.min;
      }
      if (value < el.min) {
        value = el.min;
      }
    } catch (e) {
      value = el.min;
    }
  }

  obj[id] = value;

  browser.storage.local.set(obj).catch(console.error);
}

["deldelay", "opennewtab"].map((id) => {
  browser.storage.local
    .get(id)
    .then((obj) => {
      let el = document.getElementById(id);
      let val = obj[id];

      if (typeof val !== "undefined") {
        if (el.type === "checkbox") {
          el.checked = val;
        } else {
          el.value = val;
        }
      }
    })
    .catch(console.error);

  let el = document.getElementById(id);
  el.addEventListener("input", onChange);
});

["usecolors"].map((id) => {
  browser.storage.local
    .get(id)
    .then((obj) => {
      let el = document.getElementById(id);
      let val = obj[id];

      if (Array.isArray(val) && val.length > 0) {
        for (var i = 0; i < el.options.length; i++) {
          el.options[i].selected = val.includes(el.options[i].value);
        }
      }
    })
    .catch(console.error);

  let el = document.getElementById(id);
  el.addEventListener("input", () => {
    const selectedItems = Array.from(el.selectedOptions).map(
      (option) => option.value
    );
    console.debug(selectedItems);
    let obj = {};
    obj[id] = selectedItems;
    browser.storage.local.set(obj).catch(console.error);
  });
});
