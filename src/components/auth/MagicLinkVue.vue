<script setup>
import { ref } from 'vue'
import { authClient } from '@/utils/auth-client'
const email = ref('')
async function handleMagicLink() {
  try {
    const { data, error } = await authClient.signIn.magicLink({
      email: email.value,
    })
    if (error) {
      console.error('Magic link error:', error)
      alert('Failed to send magic link. Please try again.')
    } else {
      console.log('Magic link sent:', data)
      alert('Magic link sent! Check your email to log in.')
    }
  } catch (error) {
    console.error('Magic link error:', error)
    alert('An unexpected error occurred. Please try again.')
  }
}
</script>

<template>
  <main>
    <div class="card bg-base-100 shadow-xl p-6 w-full max-w-md mx-auto mt-10">
      <div class="card-title">Magic Link Login</div>
      <div class="card-body">
        <p>Enter your email to receive a magic link for login.</p>
        <form @submit.prevent="handleMagicLink">
          <input
            type="email"
            placeholder="Email"
            class="input"
            v-model="email"
          />
          <button type="submit" class="btn">Send Magic Link</button>
        </form>
      </div>
    </div>
  </main>
</template>