let nativePort = browser.runtime.connectNative('lv.janhouse.tabinworkspace')

nativePort.onDisconnect.addListener((p) => {
  if (p.error) {
    console.log(`Disconnected due to an error: ${p.error.message}`);
  }
});

nativePort.onMessage.addListener(nativeMessage);
browser.windows.onCreated.addListener(windowAdded);

browser.windows.getAll().then(wins => {
  let ids=[];
  let pr=wins.forEach(w => {
    ids.push(w.id);
  });
  windowsAdded(ids);
});

async function windowAdded(window) {
  windowsAdded([window.id]);
}

async function windowsAdded(windowIds) {
  console.log(`Windows added: ${windowIds}`);
  notifyWindowManager(windowIds);
}

async function notifyWindowManager(windowIds) {
  await windowIds.forEach(async wId => {
    await browser.windows.update(wId, {
      titlePreface: `wid:${wId}:`
    });
  });
  nativePort.postMessage({
    action: "windowsAdded",
    windowIds: windowIds
  });
}

async function openUrl(url, windowId) {
  browser.tabs.create({
    url: url,
    windowId: windowId,
    active: true
  });
}

async function idLinked(windowId) {
  await browser.windows.update(windowId, {
    titlePreface: ''
  });
}

async function nativeMessage(message) {
  switch (message.action) {
    case 'openUrl':
      openUrl(message.url, parseInt(message.windowId))
      break
    case 'idLinked':
      idLinked(parseInt(message.windowId))
      break
  }
}