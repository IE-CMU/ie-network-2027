<script setup lang="ts">
import { navigate } from 'astro:transitions/client'

interface Props {
  locale: 'th' | 'en'
  items: Record<
    string,
    {
      en: string
      th: string
      url: string
    }
  >
}
const { locale, items } = defineProps<Props>()

function handleLocaleChange(event: Event) {
  const selectElement = event.target as HTMLSelectElement
  const selectedLocale = selectElement.value
  console.log('Selected locale:', selectedLocale)
  console.log('Items:', items)
  //   const nextUrl = items[selectedLocale].url
  // navigate(nextUrl)
}
</script>

<template>
  <select @change="handleLocaleChange" class="">
    <option value="th" :selected="locale === 'th'">ไทย</option>
    <option value="en" :selected="locale === 'en'">English</option>
  </select>
</template>
