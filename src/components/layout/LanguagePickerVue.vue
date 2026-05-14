<script setup lang="ts">
import { type Locale } from '@utils/locale'
import { onMounted } from 'vue'

interface Props {
  locale: Locale
}
const { locale } = defineProps<Props>()

let url: URL | null = null

onMounted(() => {
  url = new URL(window.location.href)
  console.log('Current URL:', url?.href ?? 'sfsdfd')
})
const updateLocale = () => {
  alert('changeLocale')
  // Optionally update the URL or perform other actions
}
</script>

<template>
  <select value="locale">
    <option value="en">English</option>
    <option value="th">Thai</option>
  </select>
  <button @click="updateLocale">Update</button>
</template>
