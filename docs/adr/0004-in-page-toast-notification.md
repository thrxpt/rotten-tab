# In-Page Toast Notification over Top Sticky Banner

Injecting a sticky hazard banner at the top of arbitrary web pages causes layout shifts, conflicts with fixed navigation headers, and breaks site accessibility. We decided to replace the top banner with an isolated in-page toast notification rendered inside the shadow DOM root. The notification delivers live English status updates (e.g., "Tab Rotting: 45%") without displacing host DOM elements.
