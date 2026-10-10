# Offscreen Document Audio Playback across All Tabs

Content scripts running within host webpage frames are subject to Chromium's Autoplay Policy, which suppresses audio when users scrub via mousemove without a prior click gesture on secondary tabs. We decided to implement an Offscreen Document with the `AUDIO_PLAYBACK` reason managed by the background service worker. This provides an extension-privileged audio runtime completely exempt from webpage autoplay restrictions and CSP, guaranteeing that scrubbing plays audio reliably across every tab.
