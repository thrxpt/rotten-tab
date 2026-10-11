import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Tab Rot: Mold Edition",
    description:
      "Procedural mold consumes neglected browser tabs. Grab your sponge and scrub them clean before the 10s death purge!",
    version: "1.0.0",
    permissions: ["storage", "activeTab", "offscreen", "tabs"],
    web_accessible_resources: [
      {
        resources: ["scrub.mp3", "sponge.webp"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
