# CSP-Immune In-Memory Audio Decoding

Using HTMLAudioElement and `chrome-extension://` media URLs failed on secondary tabs whenever host pages enforced strict Content Security Policies (such as GitHub, Twitter, and financial portals restricting media-src and connect-src). We decided to decode the audio asset directly in-memory via `AudioContext.decodeAudioData` using an embedded base64 module. This guarantees universal, zero-latency scrubbing sound across all tabs and websites without triggering CSP violations.
