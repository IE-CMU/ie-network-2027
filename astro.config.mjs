// @ts-check
import node from '@astrojs/node'
import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
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
    locales: ['en', 'th'],
    defaultLocale: 'th',
    routing: { prefixDefaultLocale: false }, // Don't prefix default locale (th) in URL.
  },
})
