<script setup lang="ts">
import { authClient } from '@lib/auth/client'
import { toTypedSchema } from '@lib/forms/standardSchema'
import { USER_AFFILIATION_MAX, USER_NAME_MAX } from '@utils/userProfile'
import { z } from 'astro/zod'
import { actions } from 'astro:actions'
import { useForm } from 'vee-validate'
import { computed, onMounted, ref, watch } from 'vue'

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
    intro: 'กรอกอีเมลของคุณ เราจะส่งลิงก์สำหรับเข้าสู่ระบบให้ทางอีเมล ไม่ต้องใช้รหัสผ่าน หากยังไม่มีบัญชี ระบบจะสร้างบัญชีให้เมื่อคุณคลิกลิงก์',
    email: 'อีเมล',
    emailPlaceholder: 'you@example.com',
    submit: 'ส่งลิงก์เข้าสู่ระบบ',
    submitting: 'กำลังส่ง...',
    resendIn: (s: number) => `ส่งอีกครั้งได้ใน ${s} วินาที`,
    sent: (email: string) =>
      `เราได้ส่งลิงก์เข้าสู่ระบบไปที่ ${email} แล้ว กรุณาตรวจสอบกล่องจดหมาย (และโฟลเดอร์สแปม)`,
    notAuthor: {
      title: 'อีเมลนี้ไม่ได้เชื่อมโยงกับบทความใด',
      body: 'หากคุณเป็นผู้แต่งบทความ กรุณาใช้อีเมลเดียวกับที่ใช้ในระบบ Microsoft CMT เพื่อลงทะเบียนในฐานะผู้แต่งบทความ หากดำเนินการต่อ บัญชีนี้จะลงทะเบียนในฐานะผู้เข้าร่วมงานเท่านั้น',
      proceed: 'สร้างบัญชีผู้เข้าร่วมงาน',
      change: 'ใช้อีเมลอื่น',
    },
    profile: {
      intro: 'กรุณากรอกชื่อและหน่วยงานของคุณ ข้อมูลนี้ใช้ระบุตัวตนของคุณและไม่สามารถแก้ไขได้ภายหลัง',
      name: 'ชื่อ-นามสกุล',
      affiliation: 'หน่วยงาน / สถาบัน',
      nameRequired: 'กรุณากรอกชื่อ-นามสกุล',
      affiliationRequired: 'กรุณากรอกหน่วยงาน',
      tooLong: (n: number) => `ต้องไม่เกิน ${n} ตัวอักษร`,
    },
    errors: {
      required: 'กรุณากรอกอีเมล',
      invalidEmail: 'รูปแบบอีเมลไม่ถูกต้อง',
      invalidLink: 'ลิงก์เข้าสู่ระบบไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่',
      tooMany: 'มีการขอลิงก์หลายครั้งเกินไป กรุณาลองใหม่ภายหลัง',
      unexpected: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
    },
  },
  en: {
    intro:
      "Enter your email and we'll send you a sign-in link. No password needed. If you don't have an account yet, one is created when you click the link.",
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    submit: 'Email me a sign-in link',
    submitting: 'Sending...',
    resendIn: (s: number) => `You can resend in ${s}s`,
    sent: (email: string) =>
      `We've sent a sign-in link to ${email}. Please check your inbox (and spam folder).`,
    notAuthor: {
      title: 'This email is not associated with any paper',
      body: 'If you are an author of a paper, please use the email from the Microsoft CMT system so that you can register as an author. If you continue, this account will be registered as a participant only.',
      proceed: 'Create participant account',
      change: 'Use a different email',
    },
    profile: {
      intro:
        'Please enter your name and affiliation. They identify you to the organisers and cannot be changed later.',
      name: 'Full name',
      affiliation: 'Affiliation / institution',
      nameRequired: 'Please enter your full name.',
      affiliationRequired: 'Please enter your affiliation.',
      tooLong: (n: number) => `Must be at most ${n} characters.`,
    },
    errors: {
      required: 'Please enter your email.',
      invalidEmail: 'Please enter a valid email address.',
      invalidLink: 'This sign-in link is invalid or has expired. Please request a new one.',
      tooMany: 'Too many requests. Please try again later.',
      unexpected: 'Something went wrong. Please try again.',
    },
  },
} as const
const t = computed(() => text[locale])

// Email the last link was sent to (shown in the success banner).
const sentTo = ref('')
// Email with no account, waiting for the user to confirm the participant sign-up.
const unknownEmail = ref('')
// Banner for server/link errors. Field errors live in vee-validate.
const errorMessage = ref('')
const cooldown = ref(0)
const sending = ref(false)
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

const busy = computed(() => isSubmitting.value || sending.value)

// The warning is about one specific email; editing it starts over.
watch(email, (v) => {
  if (unknownEmail.value && v?.trim() !== unknownEmail.value) unknownEmail.value = ''
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
    code === 'INVALID_TOKEN' || code === 'EXPIRED_TOKEN' ? e.invalidLink : e.unexpected
  // Drop the error from the URL so a refresh doesn't show it again.
  params.delete('error')
  params.delete('error_description')
  const query = params.toString()
  window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''))
})

/** Send the link. For an email without an account, the account
 *  (participant) is created when the link is clicked. */
async function sendLink(address: string, name?: string) {
  sending.value = true
  try {
    const { error } = await authClient.signIn.magicLink({
      email: address,
      // Only used if the link creates the account.
      name,
      callbackURL: redirectUrl,
      errorCallbackURL: errorUrl,
    })
    if (error) {
      console.error('Magic link error:', error)
      errorMessage.value = error.status === 429 ? t.value.errors.tooMany : t.value.errors.unexpected
      return
    }
    unknownEmail.value = ''
    sentTo.value = address
    startCooldown()
  } catch (error) {
    console.error('Magic link error:', error)
    errorMessage.value = t.value.errors.unexpected
  } finally {
    sending.value = false
  }
}

// Step 1: known email (e.g. an imported author) → send the link straight away.
// Unknown email → show the warning; step 2 is confirmParticipant().
const handleMagicLink = handleSubmit(
  async (values) => {
    if (cooldown.value > 0) return
    errorMessage.value = ''
    sentTo.value = ''
    unknownEmail.value = ''
    try {
      const { data, error } = await actions.user.checkEmail({ email: values.email })
      if (error) {
        console.error('Check email error:', error)
        errorMessage.value =
          error.code === 'TOO_MANY_REQUESTS' ? t.value.errors.tooMany : t.value.errors.unexpected
        return
      }
      if (data.exists) await sendLink(values.email)
      else unknownEmail.value = values.email
    } catch (error) {
      console.error('Check email failed:', error)
      errorMessage.value = t.value.errors.unexpected
    }
  },
  () => {
    // Clear stale banners when the user retries with invalid input.
    errorMessage.value = ''
    sentTo.value = ''
    unknownEmail.value = ''
  }
)

// ---- Step 2 for a new email: name + affiliation, set once at sign-up ----
const fullName = ref('')
const affiliation = ref('')
const nameError = ref('')
const affiliationError = ref('')

function validateProfile(): boolean {
  const p = t.value.profile
  const check = (v: string, max: number, required: string) =>
    !v.trim() ? required : v.trim().length > max ? p.tooLong(max) : ''
  nameError.value = check(fullName.value, USER_NAME_MAX, p.nameRequired)
  affiliationError.value = check(affiliation.value, USER_AFFILIATION_MAX, p.affiliationRequired)
  return !nameError.value && !affiliationError.value
}

async function confirmParticipant() {
  if (!unknownEmail.value || cooldown.value > 0 || busy.value) return
  errorMessage.value = ''
  if (!validateProfile()) return
  const address = unknownEmail.value
  sending.value = true
  try {
    // Affiliation waits on the server; the name travels in the link.
    const { data, error } = await actions.user.startSignup({
      email: address,
      affiliation: affiliation.value.trim(),
    })
    if (error) {
      console.error('Start sign-up error:', error)
      errorMessage.value =
        error.code === 'TOO_MANY_REQUESTS' ? t.value.errors.tooMany : t.value.errors.unexpected
      sending.value = false
      return
    }
    // Account created meanwhile (e.g. imported): a plain sign-in link.
    await sendLink(address, data.exists ? undefined : fullName.value.trim())
  } catch (e) {
    console.error('Start sign-up failed:', e)
    errorMessage.value = t.value.errors.unexpected
    sending.value = false
  }
}

function useDifferentEmail() {
  unknownEmail.value = ''
  email.value = ''
  document.getElementById('magic-email')?.focus()
}
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit="handleMagicLink">
    <p class="text-sm text-base-content/70">{{ t.intro }}</p>

    <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft text-sm">
      <span>{{ errorMessage }}</span>
    </div>
    <div v-if="sentTo" role="status" class="alert alert-success alert-soft text-sm">
      <span>{{ t.sent(sentTo) }}</span>
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
        :disabled="busy"
      />
      <p v-if="errors.email" id="magic-email-error" class="label text-xs text-error">
        {{ errors.email }}
      </p>
    </fieldset>

    <div
      v-if="unknownEmail"
      role="alert"
      class="alert alert-warning alert-soft flex flex-col items-stretch gap-3 text-sm"
    >
      <div>
        <p class="font-semibold">{{ t.notAuthor.title }}</p>
        <p class="mt-1">{{ t.notAuthor.body }}</p>
      </div>
      <div class="flex flex-col gap-3 rounded-box bg-base-100 p-3 text-base-content">
        <p class="text-xs text-base-content/70">{{ t.profile.intro }}</p>
        <fieldset class="fieldset gap-1 p-0">
          <label for="signup-name" class="fieldset-legend pb-1 text-sm">{{ t.profile.name }}</label>
          <input
            id="signup-name"
            v-model="fullName"
            type="text"
            autocomplete="name"
            :maxlength="USER_NAME_MAX"
            class="input input-sm w-full"
            :class="{ 'input-error': nameError }"
            :aria-invalid="!!nameError"
            :aria-describedby="nameError ? 'signup-name-error' : undefined"
            :disabled="busy"
            @input="nameError = ''"
          />
          <p v-if="nameError" id="signup-name-error" class="label text-xs text-error">{{ nameError }}</p>
        </fieldset>
        <fieldset class="fieldset gap-1 p-0">
          <label for="signup-affiliation" class="fieldset-legend pb-1 text-sm">
            {{ t.profile.affiliation }}
          </label>
          <input
            id="signup-affiliation"
            v-model="affiliation"
            type="text"
            autocomplete="organization"
            :maxlength="USER_AFFILIATION_MAX"
            class="input input-sm w-full"
            :class="{ 'input-error': affiliationError }"
            :aria-invalid="!!affiliationError"
            :aria-describedby="affiliationError ? 'signup-affiliation-error' : undefined"
            :disabled="busy"
            @input="affiliationError = ''"
          />
          <p v-if="affiliationError" id="signup-affiliation-error" class="label text-xs text-error">
            {{ affiliationError }}
          </p>
        </fieldset>
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          class="btn btn-sm border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
          :disabled="busy || cooldown > 0"
          @click="confirmParticipant"
        >
          <span v-if="sending" class="loading loading-spinner loading-sm" />
          {{ sending ? t.submitting : cooldown > 0 ? t.resendIn(cooldown) : t.notAuthor.proceed }}
        </button>
        <button type="button" class="btn btn-sm btn-ghost" :disabled="busy" @click="useDifferentEmail">
          {{ t.notAuthor.change }}
        </button>
      </div>
    </div>

    <button
      v-else
      type="submit"
      class="btn w-full border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
      :disabled="busy || cooldown > 0"
    >
      <span v-if="busy" class="loading loading-spinner loading-sm" />
      {{ busy ? t.submitting : cooldown > 0 ? t.resendIn(cooldown) : t.submit }}
    </button>
  </form>
</template>
