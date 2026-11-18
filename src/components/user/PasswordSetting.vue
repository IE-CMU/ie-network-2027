<script setup lang="ts">
import { authClient } from '@lib/auth/client'
import { toTypedSchema } from '@lib/forms/standardSchema'
import { z } from 'astro/zod'
import { actions } from 'astro:actions'
import { useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'

interface Props {
  locale: 'th' | 'en'
  /** Whether the user already has a password (credential account). */
  hasPassword: boolean
}
const props = defineProps<Props>()

// Must match better-auth's minPasswordLength / maxPasswordLength (defaults 8 / 128).
const MIN_LENGTH = 8
const MAX_LENGTH = 128

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
      required: 'กรุณากรอกข้อมูลในช่องนี้',
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
    changeDone:
      'Your password has been changed. Other signed-in devices have been signed out.',
    errors: {
      required: 'This field is required.',
      mismatch: "The new passwords don't match.",
      tooShort: `Password must be at least ${MIN_LENGTH} characters.`,
      tooLong: 'Password is too long.',
      wrongCurrent: 'Your current password is incorrect.',
      alreadySet:
        'This account already has a password. Please refresh the page.',
      noPassword:
        "This account doesn't have a password yet. Please refresh the page.",
      session: 'Your session has expired. Please sign in again.',
      unexpected: 'Something went wrong. Please try again.',
    },
  },
} as const
const t = computed(() => text[props.locale])

// Local copy so the form switches to "change" mode right after setting one.
const hasPassword = ref(props.hasPassword)
// Banner messages: server/session errors and success. Field errors live in vee-validate.
const errorMessage = ref('')
const successMessage = ref('')

// Rebuilt when the locale (messages) or mode (current password required) changes.
const schema = computed(() => {
  const e = t.value.errors
  return toTypedSchema(
    z
      .object({
        currentPassword: hasPassword.value
          ? z.string().min(1, e.required)
          : z.string(),
        newPassword: z
          .string()
          .min(1, e.required)
          .min(MIN_LENGTH, e.tooShort)
          .max(MAX_LENGTH, e.tooLong),
        confirmPassword: z.string().min(1, e.required),
      })
      .refine((v) => v.newPassword === v.confirmPassword, {
        message: e.mismatch,
        path: ['confirmPassword'],
      })
  )
})

const {
  defineField,
  handleSubmit,
  errors,
  isSubmitting,
  submitCount,
  setFieldError,
  resetForm,
  validateField,
} = useForm({
  validationSchema: schema,
  initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
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
const [currentPassword, currentPasswordAttrs] = defineField(
  'currentPassword',
  fieldConfig
)
const [newPassword, newPasswordAttrs] = defineField('newPassword', fieldConfig)
const [confirmPassword, confirmPasswordAttrs] = defineField(
  'confirmPassword',
  fieldConfig
)

// The mismatch error sits on the confirm field, so re-check it when the new password changes.
watch(newPassword, () => {
  if (submitCount.value > 0 && confirmPassword.value)
    validateField('confirmPassword')
})

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

/** Show a server error on the relevant field when there is one, otherwise in the banner. */
function showServerError(code?: string) {
  if (code === 'INVALID_PASSWORD')
    setFieldError('currentPassword', errorFor(code))
  else errorMessage.value = errorFor(code)
}

const onSubmit = handleSubmit(
  async (values) => {
    errorMessage.value = ''
    successMessage.value = ''
    try {
      if (hasPassword.value) {
        const { error } = await authClient.changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          revokeOtherSessions: true,
        })
        if (error) {
          console.error('Change password error:', error)
          showServerError(error.status === 401 ? 'UNAUTHORIZED' : error.code)
          return
        }
        successMessage.value = t.value.changeDone
      } else {
        const { error } = await actions.user.setPassword({
          newPassword: values.newPassword,
        })
        if (error) {
          console.error('Set password error:', error)
          showServerError(
            error.code === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : error.message
          )
          return
        }
        hasPassword.value = true
        successMessage.value = t.value.setDone
      }
      resetForm()
    } catch (error) {
      console.error('Password error:', error)
      errorMessage.value = t.value.errors.unexpected
    }
  },
  () => {
    // Clear stale banners when the user retries with invalid input.
    errorMessage.value = ''
    successMessage.value = ''
  }
)
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit="onSubmit">
    <div>
      <h3 class="text-lg font-bold">{{ t.title }}</h3>
      <p class="mt-1 text-sm text-base-content/70">
        {{ hasPassword ? t.changeIntro : t.setIntro }}
      </p>
    </div>

    <div
      v-if="errorMessage"
      role="alert"
      class="alert alert-error alert-soft text-sm"
    >
      <span>{{ errorMessage }}</span>
    </div>
    <div
      v-if="successMessage"
      role="status"
      class="alert alert-success alert-soft text-sm"
    >
      <span>{{ successMessage }}</span>
    </div>

    <fieldset v-if="hasPassword" class="fieldset gap-1 p-0">
      <label for="pw-current" class="fieldset-legend pb-1 text-sm">
        {{ t.current }}
      </label>
      <input
        id="pw-current"
        v-model="currentPassword"
        v-bind="currentPasswordAttrs"
        type="password"
        autocomplete="current-password"
        class="input w-full"
        :class="{ 'input-error': errors.currentPassword }"
        :aria-invalid="!!errors.currentPassword"
        :aria-describedby="
          errors.currentPassword ? 'pw-current-error' : undefined
        "
        :disabled="isSubmitting"
      />
      <p
        v-if="errors.currentPassword"
        id="pw-current-error"
        class="label text-xs text-error"
      >
        {{ errors.currentPassword }}
      </p>
    </fieldset>

    <fieldset class="fieldset gap-1 p-0">
      <label for="pw-new" class="fieldset-legend pb-1 text-sm">
        {{ t.new }}
      </label>
      <input
        id="pw-new"
        v-model="newPassword"
        v-bind="newPasswordAttrs"
        type="password"
        autocomplete="new-password"
        class="input w-full"
        :class="{ 'input-error': errors.newPassword }"
        :aria-invalid="!!errors.newPassword"
        :aria-describedby="errors.newPassword ? 'pw-new-error' : 'pw-new-hint'"
        :disabled="isSubmitting"
      />
      <p
        v-if="errors.newPassword"
        id="pw-new-error"
        class="label text-xs text-error"
      >
        {{ errors.newPassword }}
      </p>
      <p v-else id="pw-new-hint" class="label text-xs">{{ t.hint }}</p>
    </fieldset>

    <fieldset class="fieldset gap-1 p-0">
      <label for="pw-confirm" class="fieldset-legend pb-1 text-sm">
        {{ t.confirm }}
      </label>
      <input
        id="pw-confirm"
        v-model="confirmPassword"
        v-bind="confirmPasswordAttrs"
        type="password"
        autocomplete="new-password"
        class="input w-full"
        :class="{ 'input-error': errors.confirmPassword }"
        :aria-invalid="!!errors.confirmPassword"
        :aria-describedby="
          errors.confirmPassword ? 'pw-confirm-error' : undefined
        "
        :disabled="isSubmitting"
      />
      <p
        v-if="errors.confirmPassword"
        id="pw-confirm-error"
        class="label text-xs text-error"
      >
        {{ errors.confirmPassword }}
      </p>
    </fieldset>

    <div>
      <button
        type="submit"
        class="btn border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
        :disabled="isSubmitting"
      >
        <span v-if="isSubmitting" class="loading loading-spinner loading-sm" />
        {{
          isSubmitting ? t.saving : hasPassword ? t.changeSubmit : t.setSubmit
        }}
      </button>
    </div>
  </form>
</template>
