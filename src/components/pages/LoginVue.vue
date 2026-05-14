<script setup lang="ts">
import { authClient } from '@/lib/auth-client'
import { navigate } from 'astro:transitions/client'
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const errorMessage = ref('')

async function handleLogin() {
  try {
    const { data, error } = await authClient.signIn.email({
      email: email.value,
      password: password.value,
    })
    if (error) {
      console.error('Login error:', error)
      errorMessage.value = 'Invalid email or password.'
    } else {
      console.log('Login successful:', data)
      navigate('/')
    }
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = 'An unexpected error occurred.'
  }
}
</script>

<template>
  <main>
    <div class="card bg-base-100 shadow-xl p-6 w-full max-w-md mx-auto mt-10">
      <div class="card-title">Login</div>
      <div class="card-body">
        <form @submit.prevent="handleLogin">
          <input
            type="email"
            placeholder="Email"
            class="input"
            v-model="email"
          />
          <input
            type="password"
            placeholder="Password"
            class="input"
            v-model="password"
          />
          <button type="submit" class="btn">Login</button>
          <p v-if="errorMessage" class="">{{ errorMessage }}</p>
        </form>
      </div>
    </div>
  </main>
</template>
