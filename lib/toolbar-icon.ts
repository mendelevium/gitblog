function setIcon(dark: boolean) {
  const prefix = dark ? 'icons/icon-light' : 'icons/icon';
  chrome.action.setIcon({
    path: {
      16: `${prefix}-16.png`,
      48: `${prefix}-48.png`,
      128: `${prefix}-128.png`,
    },
  });
}

export function syncToolbarIcon() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  setIcon(mq.matches);
  mq.addEventListener('change', (e) => setIcon(e.matches));
}
