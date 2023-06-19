async function loadImageData(url: string) {
  const image = await createImageBitmap(await (await fetch(url)).blob());
  const { width, height } = image;
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  return imageData;
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.action.disable();

  chrome.declarativeContent.onPageChanged.removeRules(async () => {
    const defaultRule = {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostSuffix: "zendesk.com" }
        })
      ],
      actions: [
        new chrome.declarativeContent.SetIcon({
          imageData: {
            16: await loadImageData("/assets/icons/icon16.png"),
            32: await loadImageData("/assets/icons/icon32.png"),
            48: await loadImageData("/assets/icons/icon48.png"),
            64: await loadImageData("/assets/icons/icon64.png"),
            128: await loadImageData("/assets/icons/icon128.png")
          }
        }),
        new chrome.declarativeContent.ShowAction()
      ]
    };

    let rules = [defaultRule];
    chrome.declarativeContent.onPageChanged.addRules(rules);
  });
});
