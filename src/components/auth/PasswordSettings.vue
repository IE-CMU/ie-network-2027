<script setup lang="ts">
import { authClient } from '@/lib/auth-client'
import { actions } from 'astro:actions'
import { computed, ref } from 'vue'

interface Props {
  locale: 'th' | 'en'
  /** Whether the user already has a password (credential account). */
  hasPassword: boolean
}
const props = defineProps<Props>()

// Must match better-auth's minPasswordLength (default 8).
const MIN_LENGTH = 8

const text = {
  th: {
    title: 'รหัสผ่าน',
    setIntro:
      'ตอนนี้คุณเข้าสู่ระบบด้วยลิงก์ทางอีเมล คุณสามารถตั้งรหัสผ่านเพื่อใช้เข้าสู่ระบบได้ (ไม่บังคับ) และยังคงใช้ลิงก์ทางอีเมลได้ตามเดิม',
    changeIntro: 'เปลี่ยนรหัสผ่านที่ใช้เข้าสู่ระบบ',
    current: 'รหัสผ่านปัจจุบัน',
    new: 'รหัสผ่านใหม่',
    confirm: 'ยืนยันรหัสผ่านใหม่',
    hint: `อย่างน้อย ${MIN_LENGTH} ตัวอักษร`,
    setSubmit: 'ตั้งรหัสผ่าน',
    changeSubmit: 'เปลี่ยนรหัสผ่าน',
    saving: 'กำลังบันทึก...',
    setDone: 'ตั้งรหัสผ่านเรียบร้อยแล้ว',
    changeDone: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว อุปกรณ์อื่นที่เข้าสู่ระบบไว้จะถูกออกจากระบบ',
    errors: {
      mismatch: 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน',
      tooShort: `รหัสผ่านต้องมีอย่างน้อย ${MIN_LENGTH} ตัวอักษร`,
      tooLong: 'รหัสผ่านยาวเกินไป',
      wrongCurrent: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
      alreadySet: 'บัญชีนี้มีรหัสผ่านอยู่แล้ว กรุณารีเฟรชหน้าเว็บ',
      noPassword: 'บัญชีนี้ยังไม่มีรหัสผ่าน กรุณารีเฟรชหน้าเว็บ',
      session: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
      unexpected: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
    },
  },
  en: {
    title: 'Password',
    setIntro:
      "You're signing in with email links. You can optionally set a password to sign in with, and still use email links whenever you like.",
    changeIntro: 'Change the password you use to sign in.',
    current: 'Current password',
    new: 'New password',
    confirm: 'Confirm new password',
    hint: `At least ${MIN_LENGTH} characters`,
    setSubmit: 'Set password',
    changeSubmit: 'Change password',
    saving: 'Saving...',
    setDone: 'Your password has been set.',
    changeDone: 'Your password has been changed. Other signed-in devices have been signed out.',
    errors: {
      mismatch: "The new passwords don't match.",
      tooShort: `Password must be at least ${MIN_LENGTH} characters.`,
      tooLong: 'Password is too long.',
      wrongCurrent: 'Your current password is incorrect.',
      alreadySet: 'This account already has a password. Please refresh the page.',
      noPassword: "This account doesn't have a password yet. Please refresh the page.",
      session: 'Your session has expired. Please sign in again.',
      unexpected: 'Something went wrong. Please try again.',
    },
  },
} as const
const t = computed(() => text[props.locale])

// Local copy so the form switches to "change" mode right after setting one.
const hasPassword = ref(props.hasPassword)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const canSubmit = computed(
  () =>
    !loading.value &&
    newPassword.value.length > 0 &&
    confirmPassword.value.length > 0 &&
    (!hasPassword.value || currentPassword.value.length > 0),
)

function errorFor(code?: string): string {
  const e = t.value.errors
  switch (code) {
    case 'PASSWORD_TOO_SHORT':
      return e.tooShort
    case 'PASSWORD_TOO_LONG':
      return e.tooLong
    case 'INVALID_PASSWORD':
      return e.wrongCurrent
    case 'PASSWORD_ALREADY_SET':
      return e.alreadySet
    case 'CREDENTIAL_ACCOUNT_NOT_FOUND':
      return e.noPassword
    case 'UNAUTHORIZED':
      return e.session
    default:
      return e.unexpected
  }
}

function resetFields() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

async function handleSubmit() {
  if (!canSubmit.value) return
  errorMessage.value = ''
  successMessage.value = ''

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = t.value.errors.mismatch
    return
  }
  if (newPassword.value.length < MIN_LENGTH) {
    errorMessage.value = t.value.errors.tooShort
    return
  }

  loading.value = true
  try {
    if (hasPassword.value) {
      const { error } = await authClient.changePassword({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
        revokeOtherSessions: true,
      })
      if (error) {
        console.error('Change password error:', error)
        errorMessage.value = errorFor(error.status === 401 ? 'UNAUTHORIZED' : error.code)
        return
      }
      successMessage.value = t.value.changeDone
    } else {
      const { error } = await actions.user.setPassword({ newPassword: newPassword.value })
      if (error) {
        console.error('Set password error:', error)
        errorMessage.value = errorFor(error.code === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : error.message)
        return
      }
      hasPassword.value = true
      successMessage.value = t.value.setDone
    }
    resetFields()
  } catch (error) {
    console.error('Password error:', error)
    errorMessage.value = t.value.errors.unexpected
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
    <div>
      <h3 class="text-lg font-bold">{{ t.title }}</h3>
      <p class="mt-1 text-sm text-base-content/70">
        {{ hasPassword ? t.changeIntro : t.setIntro }}
      </p>
    </div>

    <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft text-sm">
      <span>{{ errorMessage }}</span>
    </div>
    <div v-if="successMessage" role="status" class="alert alert-success alert-soft text-sm">
      <span>{{ successMessage }}</span>
    </div>

    <fieldset v-if="hasPassword" class="fieldset gap-1 p-0">
      <label for="pw-current" class="fieldset-legend pb-1 text-sm">{{ t.current }}</label>
      <input
        id="pw-current"
        v-model="currentPassword"
        type="password"
        autocomplete="current-password"
        class="input w-full"
        :disabled="loading"
      />
    </fieldset>

    <fieldset class="fieldset gap-1 p-0">
      <label for="pw-new" class="fieldset-legend pb-1 text-sm">{{ t.new }}</label>
      <input
        id="pw-new"
        v-model="newPassword"
        type="password"
        autocomplete="new-password"
        :minlength="MIN_LENGTH"
        class="input w-full"
        :disabled="loading"
      />
      <p class="label text-xs">{{ t.hint }}</p>
    </fieldset>

    <fieldset class="fieldset gap-1 p-0">
      <label for="pw-confirm" class="fieldset-legend pb-1 text-sm">{{ t.confirm }}</label>
      <input
        id="pw-confirm"
        v-model="confirmPassword"
        type="password"
        autocomplete="new-password"
        class="input w-full"
        :disabled="loading"
      />
    </fieldset>

    <div>
      <button
        type="submit"
        class="btn border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
        :disabled="!canSubmit"
      >
        <span v-if="loading" class="loading loading-spinner loading-sm" />
        {{ loading ? t.saving : hasPassword ? t.changeSubmit : t.setSubmit }}
      </button>
    </div>
  </form>
</template>
