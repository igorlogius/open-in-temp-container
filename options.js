/* global browser */

async function getFromStorage(type, id, fallback) {
  let tmp = await browser.storage.local.get(id);
  return typeof tmp[id] === type ? tmp[id] : fallback;
}

async function setToStorage(id, value) {
  let obj = {};
  obj[id] = value;
  return browser.storage.local.set(obj);
}

function onChange(evt) {
  let id = evt.target.id;
  let el = document.getElementById(id);

  let value = el.type === "checkbox" ? el.checked : el.value;
  let obj = {};

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

document.getElementById("regexstrs_save_btn").addEventListener("click", () => {
  const val = document.getElementById("textarea_regexstrs").value.trim();
  setToStorage("textarea_regexstrs", val);
});

browser.storage.local
  .get("textarea_regexstrs")
  .then((obj) => {
    let el = document.getElementById("textarea_regexstrs");
    let val = obj["textarea_regexstrs"];

    if (typeof val !== "undefined") {
      if (el.type === "checkbox") {
        el.checked = val;
      } else {
        el.value = val;
      }
    }
  })
  .catch(console.error);

["multiopen"].map((id) => {
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

["usecolors", "toolbarAction", "listmode"].map((id) => {
  browser.storage.local
    .get(id)
    .then((obj) => {
      let el = document.getElementById(id);
      let val = obj[id];

      for (var i = 0; i < el.options.length; i++) {
        if (Array.isArray(val)) {
          el.options[i].selected = val.includes(el.options[i].value);
        } else {
          el.options[i].selected = val == el.options[i].value;
        }
      }
    })
    .catch(console.error);

  let el = document.getElementById(id);
  el.addEventListener("input", () => {
    const selectedItems = Array.from(el.selectedOptions).map(
      (option) => option.value,
    );
    let obj = {};
    if (el.hasAttribute("multiple")) {
      obj[id] = selectedItems;
    } else {
      obj[id] = selectedItems[0];
    }
    browser.storage.local.set(obj).catch(console.error);
  });
});

document.getElementById("experimentalbtn").addEventListener("click", (el) => {
  const dp = document.getElementById("mainForm").style.display;
  if (dp === "none") {
    document.getElementById("mainForm").style.display = "block";
  } else {
    document.getElementById("mainForm").style.display = "none";
  }
});
