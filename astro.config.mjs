// @ts-check
import { defineConfig } from 'astro/config'

import tailwindcss from '@tailwindcss/vite'

import node from '@astrojs/node'

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  output: 'server', // Need to use "server" insteald of "static" because of catch-all routes for auth.
  adapter: node({
    mode: 'standalone',
  }),
})
