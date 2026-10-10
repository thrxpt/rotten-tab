import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Tab Rotting Simulator: Mold Edition',
    description: 'Procedural mold and fungal spores consume inactive tabs to punish tab hoarding.',
    version: '1.0.0',
    permissions: ['storage', 'activeTab'],
  },
});
