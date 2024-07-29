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

document.getElementById("textarea_regexstrs").addEventListener("input", () => {
  let val = document.getElementById("textarea_regexstrs").value.trim();
  setToStorage("textarea_regexstrs", val);
});

document
  .getElementById("textarea_neveropenintcregexstrs")
  .addEventListener("input", () => {
    val = document
      .getElementById("textarea_neveropenintcregexstrs")
      .value.trim();
    setToStorage("textarea_neveropenintcregexstrs", val);
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

browser.storage.local
  .get("textarea_neveropenintcregexstrs")
  .then((obj) => {
    let el = document.getElementById("textarea_neveropenintcregexstrs");
    let val = obj["textarea_neveropenintcregexstrs"];

    if (typeof val !== "undefined") {
      if (el.type === "checkbox") {
        el.checked = val;
      } else {
        el.value = val;
      }
    }
  })
  .catch(console.error);

["multiopen", "multiopen2", "multiopen3"].map((id) => {
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

/* input[ radio || checkbox ] */
["toolbarAction", "usecolors", "listmode"].map((id) => {
  browser.storage.local
    .get(id)
    .then((obj) => {
      let val = obj[id];
      console.debug(id, val);

      /* checkbox */
      if (Array.isArray(val)) {
        let els = document.getElementsByName(id);

        for (let el of els) {
          if (val.includes(el.value)) {
            el.checked = true;
          } else {
            el.checked = false;
          }

          el.addEventListener("click", (evt) => {
            const vals = Array.from(document.getElementsByName(evt.target.name))
              .filter((el) => el.checked)
              .map((el) => el.value);

            console.debug(evt.target.name, vals);
            setToStorage(evt.target.name, vals);
          });
        }
      } else {
        /* radio group, only one active */
        let els = document.getElementsByName(id);

        for (let el of els) {
          if (el.value === val) {
            el.checked = true;
          } else {
            el.checked = false;
          }

          el.addEventListener("click", (evt) => {
            console.debug(evt.target.name, evt.target.value);
            setToStorage(evt.target.name, evt.target.value);
          });
        }
      }
    })
    .catch(console.error);
});
