let audio: HTMLAudioElement | null = null;
let stopTimeout: number | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio('/scrub.mp3');
    audio.volume = 0.65;
    audio.loop = true;
  }
  return audio;
}

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!message || typeof message !== 'object') return;
  if ('type' in message) {
    if (message.type === 'OFFSCREEN_PLAY_SCRUB') {
      const a = getAudio();
      if (a.paused) {
        a.play().catch(() => {});
      }
      if (stopTimeout !== null) {
        window.clearTimeout(stopTimeout);
      }
      stopTimeout = window.setTimeout(() => {
        if (audio && !audio.paused) {
          audio.pause();
        }
        stopTimeout = null;
      }, 280);
    } else if (message.type === 'OFFSCREEN_STOP_SCRUB') {
      if (stopTimeout !== null) {
        window.clearTimeout(stopTimeout);
        stopTimeout = null;
      }
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }
});
