<script setup lang="ts">
import { authClient } from '@lib/auth/client'
import { toTypedSchema } from '@lib/forms/standardSchema'
import { z } from 'astro/zod'
import { useForm } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'

interface Props {
  locale: 'th' | 'en'
  /** Where to go after a successful magic-link sign-in. */
  redirectUrl: string
  /** Where better-auth sends the user (with ?error=...) if the link fails. */
  errorUrl: string
}
const { locale, redirectUrl, errorUrl } = defineProps<Props>()

// Don't let the user hammer the send button (and the mail queue).
const RESEND_COOLDOWN_S = 60

const text = {
  th: {
    intro: 'เข้าสู่ระบบครั้งแรก? กรอกอีเมลที่ลงทะเบียนไว้ เราจะส่งลิงก์สำหรับเข้าสู่ระบบให้ทางอีเมล ไม่ต้องใช้รหัสผ่าน',
    email: 'อีเมล',
    emailPlaceholder: 'you@example.com',
    submit: 'ส่งลิงก์เข้าสู่ระบบ',
    submitting: 'กำลังส่ง...',
    resendIn: (s: number) => `ส่งอีกครั้งได้ใน ${s} วินาที`,
    sent: 'หากอีเมลนี้ลงทะเบียนไว้ในระบบ เราได้ส่งลิงก์เข้าสู่ระบบไปแล้ว กรุณาตรวจสอบกล่องจดหมาย (และโฟลเดอร์สแปม)',
    errors: {
      required: 'กรุณากรอกอีเมล',
      invalidEmail: 'รูปแบบอีเมลไม่ถูกต้อง',
      invalidLink: 'ลิงก์เข้าสู่ระบบไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่',
      notRegistered: 'ไม่พบอีเมลนี้ในระบบ กรุณาใช้อีเมลที่ลงทะเบียนไว้ หรือติดต่อผู้จัดงาน',
      tooMany: 'มีการขอลิงก์หลายครั้งเกินไป กรุณาลองใหม่ภายหลัง',
      unexpected: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
    },
  },
  en: {
    intro:
      "First time signing in? Enter your registered email and we'll send you a sign-in link. No password needed.",
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    submit: 'Email me a sign-in link',
    submitting: 'Sending...',
    resendIn: (s: number) => `You can resend in ${s}s`,
    sent: "If this email is registered, we've sent a sign-in link. Please check your inbox (and spam folder).",
    errors: {
      required: 'Please enter your email.',
      invalidEmail: 'Please enter a valid email address.',
      invalidLink: 'This sign-in link is invalid or has expired. Please request a new one.',
      notRegistered:
        "We couldn't find this email. Please use the email you registered with, or contact the organizers.",
      tooMany: 'Too many requests. Please try again later.',
      unexpected: 'Something went wrong. Please try again.',
    },
  },
} as const
const t = computed(() => text[locale])

const sent = ref(false)
// Banner for server/link errors. Field errors live in vee-validate.
const errorMessage = ref('')
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

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
    })
  )
})

const { defineField, handleSubmit, errors, isSubmitting, submitCount } =
  useForm({
    validationSchema: schema,
    initialValues: { email: '' },
  })

// Lazy until the first submit attempt, then validate as the user types/leaves the field.
const [email, emailAttrs] = defineField('email', () => {
  const eager = submitCount.value > 0
  return {
    validateOnModelUpdate: eager,
    validateOnBlur: eager,
    validateOnChange: eager,
  }
})

function startCooldown() {
  cooldown.value = RESEND_COOLDOWN_S
  clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(timer)
  }, 1000)
}

// better-auth redirects back here with ?error=... when a link can't be used.
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('error')
  if (!code) return
  const e = t.value.errors
  errorMessage.value =
    code === 'new_user_signup_disabled'
      ? e.notRegistered
      : code === 'INVALID_TOKEN' || code === 'EXPIRED_TOKEN'
        ? e.invalidLink
        : e.unexpected
  // Drop the error from the URL so a refresh doesn't show it again.
  params.delete('error')
  params.delete('error_description')
  const query = params.toString()
  window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''))
})

const handleMagicLink = handleSubmit(
  async (values) => {
    if (cooldown.value > 0) return
    errorMessage.value = ''
    sent.value = false
    try {
      const { error } = await authClient.signIn.magicLink({
        email: values.email,
        callbackURL: redirectUrl,
        errorCallbackURL: errorUrl,
      })
      if (error) {
        console.error('Magic link error:', error)
        errorMessage.value = error.status === 429 ? t.value.errors.tooMany : t.value.errors.unexpected
        return
      }
      // Same message whether or not the email exists (no account enumeration).
      sent.value = true
      startCooldown()
    } catch (error) {
      console.error('Magic link error:', error)
      errorMessage.value = t.value.errors.unexpected
    }
  },
  () => {
    // Clear stale banners when the user retries with invalid input.
    errorMessage.value = ''
    sent.value = false
  }
)
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit="handleMagicLink">
    <p class="text-sm text-base-content/70">{{ t.intro }}</p>

    <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft text-sm">
      <span>{{ errorMessage }}</span>
    </div>
    <div v-if="sent" role="status" class="alert alert-success alert-soft text-sm">
      <span>{{ t.sent }}</span>
    </div>

    <fieldset class="fieldset gap-1 p-0">
      <label for="magic-email" class="fieldset-legend pb-1 text-sm">{{ t.email }}</label>
      <input
        id="magic-email"
        v-model="email"
        v-bind="emailAttrs"
        type="email"
        name="email"
        autocomplete="email"
        :placeholder="t.emailPlaceholder"
        class="input w-full"
        :class="{ 'input-error': errors.email }"
        :aria-invalid="!!errors.email"
        :aria-describedby="errors.email ? 'magic-email-error' : undefined"
        :disabled="isSubmitting"
      />
      <p v-if="errors.email" id="magic-email-error" class="label text-xs text-error">
        {{ errors.email }}
      </p>
    </fieldset>

    <button
      type="submit"
      class="btn w-full border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
      :disabled="isSubmitting || cooldown > 0"
    >
      <span v-if="isSubmitting" class="loading loading-spinner loading-sm" />
      {{ isSubmitting ? t.submitting : cooldown > 0 ? t.resendIn(cooldown) : t.submit }}
    </button>
  </form>
</template>
