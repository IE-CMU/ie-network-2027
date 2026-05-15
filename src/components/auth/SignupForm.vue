<script setup lang="ts">
import { authClient } from '@lib/auth-client'
import { navigate } from 'astro:transitions/client'
import { ref } from 'vue'

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

async function handleSubmit(event: Event) {
  event.preventDefault()
  if (password.value !== confirmPassword.value) {
    alert('Passwords do not match!')
    return
  }
  try {
    const { data, error } = await authClient.signUp.email({
      name: name.value,
      email: email.value,
      password: password.value,
    })
    if (error) {
      console.error('Sign up error:', error)
    } else {
      console.log('Sign up successful, session:', data)
      // TODO: Need to pass URL from server based on locale
      navigate('/')
    }
  } catch (error) {
    console.error('Unexpected error during sign up:', error)
  }
}
</script>

<template>
  <form
    @submit="handleSubmit"
    class="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md"
  >
    <input
      v-model="name"
      type="text"
      placeholder="Name"
      required
      id="name"
      class="w-full mb-4 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />

    <input
      v-model="email"
      type="email"
      placeholder="Email"
      required
      id="email"
      class="w-full mb-4 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <input
      v-model="password"
      type="password"
      placeholder="Password"
      minlength="8"
      required
      id="password"
      class="w-full mb-4 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <input
      v-model="confirmPassword"
      type="password"
      minlength="8"
      placeholder="Confirm Password"
      required
      id="confirmPassword"
      class="w-full mb-4 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <button
      id="btn"
      type="submit"
      class="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors duration-300"
    >
      Sign Up
    </button>
  </form>
</template>
