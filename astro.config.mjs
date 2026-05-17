// @ts-nocheck
import node from '@astrojs/node'
import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

import { serverPort } from './src/utils/env.js'

// https://astro.build/config
export default defineConfig({
  server: {
    port: parseInt(serverPort),
  },
  vite: {
    plugins: [tailwindcss()],
  },
  // Need to use "server" insteald of "static" because of catch-all routes for auth.
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [vue()],
  i18n: {
    locales: ['th', 'en'], // Make sure the order of locales is consistent with the order in localeList in src/utils/locale.ts.
    defaultLocale: 'th', // Default locale is Thai.
    routing: { prefixDefaultLocale: false }, // Don't prefix default locale (th) in URL.
  },
})
