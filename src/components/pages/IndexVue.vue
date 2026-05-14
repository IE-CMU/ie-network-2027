<script setup lang="ts">
interface Props {
  locale: string
}
const { locale } = defineProps<Props>()
console.log('Current locale in IndexVue.vue:', locale) // Debugging log to check the locale prop
</script>

<template>
  <div>
    <h1 v-if="locale === 'en'">Welcome to the IE Network!</h1>
    <h1 v-else-if="locale === 'th'">ยินดีต้อนรับสู่เครือข่าย IE!</h1>
  </div>
</template>
