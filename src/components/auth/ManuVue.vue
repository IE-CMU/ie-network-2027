<script setup lang="ts">
import { type Session } from '@lib/auth'

// Define the props for the menu component
interface Props {
  session: Session | null
}
const props = defineProps<Props>()

// console.log('Session data in Manu.vue:', props.session ?? '') // Debugging log to check session data
</script>

<template>
  <nav class="sticky top-0 z-50 bg-white shadow-md">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center">
          <h1 class="text-2xl font-bold text-[#9E76B4]">IE Network 2027</h1>
        </div>
        <ul class="hidden md:flex space-x-8">
          <li>
            <a href="/" class="hover:text-[#9E76B4] transition">Home</a>
          </li>
          <li>
            <a href="/about" class="hover:text-[#9E76B4] transition">About</a>
          </li>
          <li>
            <a
              href="/conference-topics"
              class="hover:text-[#9E76B4] transition"
            >
              Topics
            </a>
          </li>
          <li>
            <a href="/important-dates" class="hover:text-[#9E76B4] transition">
              Dates
            </a>
          </li>
          <li>
            <a href="/submission" class="hover:text-[#9E76B4] transition">
              Submission
            </a>
          </li>
          <li>
            <a href="/contact" class="hover:text-[#9E76B4] transition">
              Contact
            </a>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
