const DEVTOOLS_SELECTORS = [
  "[data-openui-devtools-auto-mount]",
  '[aria-label="Open OpenUI Inspect"]',
  '[aria-label="OpenUI Inspect"]',
  '[title="OpenUI Inspect"]',
];

export function removeOpenUIDevtoolsFromDom(root: ParentNode = document) {
  for (const selector of DEVTOOLS_SELECTORS) {
    root.querySelectorAll(selector).forEach((node) => {
      const el = node instanceof HTMLElement ? node : node.parentElement;
      (el?.closest("[data-openui-devtools-auto-mount]") ?? el)?.remove();
    });
  }
}

export function watchAndRemoveOpenUIDevtools() {
  if (typeof document === "undefined") return () => {};

  removeOpenUIDevtoolsFromDom();

  const observer = new MutationObserver(() => {
    removeOpenUIDevtoolsFromDom();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer.disconnect();
}
