async function setupOffscreenDocument() {
  if (typeof browser !== 'undefined' && 'offscreen' in browser && browser.offscreen) {
    const hasDoc = await browser.offscreen.hasDocument();
    if (hasDoc) return;
    await browser.offscreen.createDocument({
      url: '/offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play tactile scrubbing audio effects across all tabs',
    });
  }
}

export default defineBackground(() => {
  console.log('[Tab Rotting Simulator] Service worker initialized.');

  setupOffscreenDocument().catch(() => {});

  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (!message || typeof message !== 'object') return;
    if ('type' in message) {
      if (message.type === 'SCRUB_AUDIO_PLAY' || message.type === 'SCRUB_AUDIO_STOP') {
        setupOffscreenDocument()
          .then(() => {
            browser.runtime.sendMessage({
              type: message.type === 'SCRUB_AUDIO_PLAY' ? 'OFFSCREEN_PLAY_SCRUB' : 'OFFSCREEN_STOP_SCRUB',
            }).catch(() => {});
          })
          .catch(() => {});
      } else if (message.type === 'TERMINATE_TAB' && typeof sender.tab?.id === 'number') {
        const tab = sender.tab;
        const tabId = tab.id;
        if (typeof tabId === 'number') {
          // Termination Safeguards: Pinned or Audible tabs are protected
          if (tab.pinned || tab.audible) return;
          browser.tabs.remove(tabId).catch(() => {});
        }
      }
    }
  });
});
