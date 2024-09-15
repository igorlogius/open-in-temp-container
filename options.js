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

document.getElementById("textarea_regexstrs").addEventListener("input", () => {
  let val = document.getElementById("textarea_regexstrs").value.trim();
  setToStorage("textarea_regexstrs", val);
});

document
  .getElementById("textarea_ignoreregexstrs")
  .addEventListener("input", () => {
    val = document.getElementById("textarea_ignoreregexstrs").value.trim();
    setToStorage("textarea_ignoreregexstrs", val);
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
  .get("textarea_ignoreregexstrs")
  .then((obj) => {
    let el = document.getElementById("textarea_ignoreregexstrs");
    let val = obj["textarea_ignoreregexstrs"];

    if (typeof val !== "undefined") {
      if (el.type === "checkbox") {
        el.checked = val;
      } else {
        el.value = val;
      }
    }
  })
  .catch(console.error);

/* input[ radio || checkbox ] */
["toolbarAction", "usecolors", "listmode"].map((id) => {
  browser.storage.local
    .get(id)
    .then((obj) => {
      let val = obj[id];

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
            setToStorage(evt.target.name, evt.target.value);
          });
        }
      }
    })
    .catch(console.error);
});

// Permission checkboxes

function handlePermissionChange() {
  Array.from(
    document.querySelectorAll('input[name="permission"][type="checkbox"]'),
  ).forEach(async (el) => {
    if (await browser.permissions.contains({ permissions: [el.value] })) {
      el.checked = true;
    } else {
      el.checked = false;
    }
  });
}

browser.permissions.onRemoved.addListener(handlePermissionChange);

browser.permissions.onAdded.addListener(handlePermissionChange);

Array.from(
  document.querySelectorAll('input[name="permission"][type="checkbox"]'),
).forEach(async (el) => {
  if (await browser.permissions.contains({ permissions: [el.value] })) {
    el.checked = true;
  } else {
    el.checked = false;
  }

  el.addEventListener("click", async (evt) => {
    if (evt.target.checked) {
      await browser.permissions.request({ permissions: [evt.target.value] });
    } else {
      await browser.permissions.remove({ permissions: [evt.target.value] });
    }

    handlePermissionChange();
  });
});
