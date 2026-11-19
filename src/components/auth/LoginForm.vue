<script setup lang="ts">
import { authClient } from '@lib/auth/client'
import { toTypedSchema } from '@lib/forms/standardSchema'
import { z } from 'astro/zod'
import { useForm } from 'vee-validate'
import { computed, ref } from 'vue'

interface Props {
  locale: 'th' | 'en'
  redirectUrl: string
}
const { locale, redirectUrl } = defineProps<Props>()

const text = {
  th: {
    email: 'อีเมล',
    emailPlaceholder: 'you@example.com',
    password: 'รหัสผ่าน',
    passwordPlaceholder: 'กรอกรหัสผ่าน',
    showPassword: 'แสดงรหัสผ่าน',
    hidePassword: 'ซ่อนรหัสผ่าน',
    submit: 'เข้าสู่ระบบ',
    submitting: 'กำลังเข้าสู่ระบบ...',
    errors: {
      required: 'กรุณากรอกข้อมูลในช่องนี้',
      invalidEmail: 'รูปแบบอีเมลไม่ถูกต้อง',
      invalid: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      notVerified: 'กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ',
      banned: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
      tooMany: 'มีการพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง',
      unexpected: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
    },
  },
  en: {
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Sign in',
    submitting: 'Signing in...',
    errors: {
      required: 'This field is required.',
      invalidEmail: 'Please enter a valid email address.',
      invalid: 'Incorrect email or password.',
      notVerified: 'Please verify your email address before signing in.',
      banned: 'This account has been suspended. Please contact the organizers.',
      tooMany: 'Too many sign-in attempts. Please try again later.',
      unexpected: 'Something went wrong. Please try again.',
    },
  },
} as const
const t = computed(() => text[locale])

const showPassword = ref(false)
// Banner for server errors. Field errors live in vee-validate.
const errorMessage = ref('')
// Stays true after a successful sign-in until the page navigates away.
const redirecting = ref(false)

// Rebuilt when the locale (messages) changes.
const schema = computed(() => {
  const e = t.value.errors
  return toTypedSchema(
    z.object({
      email: z
        .string()
        .trim()
        .min(1, e.required)
        .pipe(z.email(e.invalidEmail)),
      password: z.string().min(1, e.required),
    })
  )
})

const { defineField, handleSubmit, errors, isSubmitting, submitCount } =
  useForm({
    validationSchema: schema,
    initialValues: { email: '', password: '' },
  })

// Lazy until the first submit attempt, then validate as the user types/leaves a field.
const fieldConfig = () => {
  const eager = submitCount.value > 0
  return {
    validateOnModelUpdate: eager,
    validateOnBlur: eager,
    validateOnChange: eager,
  }
}
const [email, emailAttrs] = defineField('email', fieldConfig)
const [password, passwordAttrs] = defineField('password', fieldConfig)

const busy = computed(() => isSubmitting.value || redirecting.value)

function errorFor(code?: string, status?: number): string {
  const e = t.value.errors
  if (status === 429) return e.tooMany
  switch (code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_EMAIL':
    case 'INVALID_PASSWORD':
      return e.invalid
    case 'EMAIL_NOT_VERIFIED':
      return e.notVerified
    case 'BANNED_USER':
      return e.banned
    default:
      return status && status < 500 ? e.invalid : e.unexpected
  }
}

const handleLogin = handleSubmit(
  async (values) => {
    if (redirecting.value) return
    errorMessage.value = ''
    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      })
      if (error) {
        console.error('Login error:', error)
        errorMessage.value = errorFor(error.code, error.status)
        return
      }
      redirecting.value = true
      // Full page load so the server re-renders the menu with the new session.
      window.location.assign(redirectUrl)
    } catch (error) {
      console.error('Login error:', error)
      errorMessage.value = t.value.errors.unexpected
    }
  },
  () => {
    // Clear a stale server error when the user retries with invalid input.
    errorMessage.value = ''
  }
)
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit="handleLogin">
    <div
      v-if="errorMessage"
      role="alert"
      class="alert alert-error alert-soft text-sm"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="size-5 shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" stroke-linecap="round" />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>

    <fieldset class="fieldset gap-1 p-0">
      <label for="login-email" class="fieldset-legend pb-1 text-sm">
        {{ t.email }}
      </label>
      <input
        id="login-email"
        v-model="email"
        v-bind="emailAttrs"
        type="email"
        name="email"
        autocomplete="email"
        :placeholder="t.emailPlaceholder"
        class="input w-full"
        :class="{ 'input-error': errors.email }"
        :aria-invalid="!!errors.email"
        :aria-describedby="errors.email ? 'login-email-error' : undefined"
        :disabled="busy"
      />
      <p
        v-if="errors.email"
        id="login-email-error"
        class="label text-xs text-error"
      >
        {{ errors.email }}
      </p>
    </fieldset>

    <fieldset class="fieldset gap-1 p-0">
      <label for="login-password" class="fieldset-legend pb-1 text-sm">
        {{ t.password }}
      </label>
      <label class="input w-full" :class="{ 'input-error': errors.password }">
        <input
          id="login-password"
          v-model="password"
          v-bind="passwordAttrs"
          :type="showPassword ? 'text' : 'password'"
          name="password"
          autocomplete="current-password"
          :placeholder="t.passwordPlaceholder"
          class="grow"
          :aria-invalid="!!errors.password"
          :aria-describedby="
            errors.password ? 'login-password-error' : undefined
          "
          :disabled="busy"
        />
        <button
          type="button"
          class="btn btn-ghost btn-xs btn-circle -mr-1"
          :aria-label="showPassword ? t.hidePassword : t.showPassword"
          :title="showPassword ? t.hidePassword : t.showPassword"
          @click="showPassword = !showPassword"
        >
          <!-- eye / eye-off -->
          <svg
            v-if="!showPassword"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4 opacity-60"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4 opacity-60"
            aria-hidden="true"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <path d="M1 1l22 22" />
          </svg>
        </button>
      </label>
      <p
        v-if="errors.password"
        id="login-password-error"
        class="label text-xs text-error"
      >
        {{ errors.password }}
      </p>
    </fieldset>

    <button
      type="submit"
      class="btn mt-2 w-full border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
      :disabled="busy"
    >
      <span v-if="busy" class="loading loading-spinner loading-sm" />
      {{ busy ? t.submitting : t.submit }}
    </button>
  </form>
</template>
