Open a tab, page, link or bookmark in a temporary container 

Not sure what containers are about? Take a look at https://support.mozilla.org/kb/how-use-firefox-containers

[![](https://raw.githubusercontent.com/igorlogius/igorlogius/main/geFxAddon.png)](https://addons.mozilla.org/firefox/addon/open-in-temp-container/)

### [Click here to report a bug, make a suggestion or ask a question](https://github.com/igorlogius/igorlogius/issues/new/choose)

<b>Short Demo Video:</b>

https://github.com/igorlogius/open-in-temp-container/assets/67047467/996f18a0-f95f-40ca-9082-d690d4a95b35

<b>Usage/Features</b>
<ul>
  <li>context menu on various elements</li>
  <li>custum shortcut</li>
  <li>toolbar button</li>
  <li>bookmark context entry</li>
  <li>delete history</li>
</ul>

### Why is the context menu visible when no link has been selected? 

This is a sideeffect from adding the feature to open multilple links in selections.
Fixing this would currently require to always analyse the selection and update the context menu when there are no links found in the selections, but
since this would require the very "frightening" `<all_urls>` permission i opted to just always displayed the context menu, instead as the better way to go about this.

### Glitchy text selection in textareas in "Options" tabs?

Seems to be a firefox issue. See https://bugzilla.mozilla.org/show_bug.cgi?id=1904286
