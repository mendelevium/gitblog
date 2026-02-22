import { onMessage } from '../lib/messaging';

export default defineBackground(() => {
  onMessage('OPEN_EDITOR', async () => {
    const url = chrome.runtime.getURL('/editor.html');
    // Check if editor tab already exists
    const tabs = await chrome.tabs.query({ url });
    if (tabs.length > 0 && tabs[0].id) {
      await chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      await chrome.tabs.create({ url });
    }
  });
});
