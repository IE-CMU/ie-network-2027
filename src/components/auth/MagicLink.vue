<script setup lang="ts">
import { authClient } from '@lib/auth/client'
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
      invalidLink: 'This sign-in link is invalid or has expired. Please request a new one.',
      notRegistered:
        "We couldn't find this email. Please use the email you registered with, or contact the organizers.",
      tooMany: 'Too many requests. Please try again later.',
      unexpected: 'Something went wrong. Please try again.',
    },
  },
} as const
const t = computed(() => text[locale])

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const errorMessage = ref('')
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

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

async function handleMagicLink() {
  if (loading.value || cooldown.value > 0 || !email.value.trim()) return
  loading.value = true
  errorMessage.value = ''
  sent.value = false
  try {
    const { error } = await authClient.signIn.magicLink({
      email: email.value.trim(),
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
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="handleMagicLink">
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
        type="email"
        name="email"
        autocomplete="email"
        :placeholder="t.emailPlaceholder"
        required
        class="input w-full"
        :disabled="loading"
      />
    </fieldset>

    <button
      type="submit"
      class="btn w-full border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
      :disabled="loading || cooldown > 0 || !email.trim()"
    >
      <span v-if="loading" class="loading loading-spinner loading-sm" />
      {{ loading ? t.submitting : cooldown > 0 ? t.resendIn(cooldown) : t.submit }}
    </button>
  </form>
</template>
