// @ts-check
import { defineConfig } from 'astro/config'

import tailwindcss from '@tailwindcss/vite'

import node from '@astrojs/node'

import vue from '@astrojs/vue'

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
})
