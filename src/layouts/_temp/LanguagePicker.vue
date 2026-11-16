<script setup lang="ts">
import { navigate } from 'astro:transitions/client'

interface Props {
  locale: 'th' | 'en'
  localeUrlList: Record<'th' | 'en', string>
}

const { locale, localeUrlList } = defineProps<Props>()
// console.log('Locale URL List:', localeUrlList)

function handleLocaleChange(event: Event) {
  const selectElement = event.target as HTMLSelectElement
  const selectedLocale = selectElement.value
  console.log('Selected locale:', selectedLocale)

  if (selectedLocale === 'th' || selectedLocale === 'en') {
    const nextUrl = localeUrlList[selectedLocale]
    navigate(nextUrl)
  } else {
    console.error('Invalid locale selected:', selectedLocale)
  }
}
</script>

<template>
  <select
    @change="handleLocaleChange"
    class="border border-gray-300 rounded-md p-2"
  >
    <option value="th" :selected="locale === 'th'">ไทย</option>
    <option value="en" :selected="locale === 'en'">English</option>
  </select>
</template>
