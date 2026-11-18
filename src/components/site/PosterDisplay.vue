<script setup lang="ts">
import type { Locale } from '@utils/locale'
import { nextTick, onBeforeUnmount, ref } from 'vue'

const props = defineProps<{
  src: string
  alt: string
  width: number
  height: number
  locale: Locale
  downloadName?: string
}>()

const text =
  props.locale === 'th'
    ? {
        open: 'ดูโปสเตอร์แบบเต็มจอ',
        close: 'ปิด',
        download: 'ดาวน์โหลด',
        zoomHint: 'คลิกที่ภาพเพื่อขยาย',
      }
    : {
        open: 'View poster full screen',
        close: 'Close',
        download: 'Download',
        zoomHint: 'Click the image to zoom',
      }

const dialog = ref<HTMLDialogElement | null>(null)
const scroller = ref<HTMLElement | null>(null)
const zoomed = ref(false)

function open(e: MouseEvent) {
  // Ctrl/Cmd/Shift-click etc. keep their normal link behaviour (new tab...).
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return
  }
  e.preventDefault()
  zoomed.value = false
  dialog.value?.showModal()
  // <dialog> does not stop the page behind it from scrolling.
  document.documentElement.style.overflow = 'hidden'
}

function close() {
  dialog.value?.close()
}

// Runs for every way of closing: Esc, the close button, backdrop click.
function onClosed() {
  document.documentElement.style.overflow = ''
  zoomed.value = false
}

// Clicking the dark area around the image closes the lightbox.
function onBackdropClick(e: MouseEvent) {
  if (e.target === scroller.value || e.target === dialog.value) close()
}

// Toggle between "fit to screen" and actual size, keeping the clicked point
// under the cursor when zooming in.
async function toggleZoom(e: MouseEvent) {
  const img = e.currentTarget as HTMLImageElement
  const rect = img.getBoundingClientRect()
  const ratioX = (e.clientX - rect.left) / rect.width
  const ratioY = (e.clientY - rect.top) / rect.height

  zoomed.value = !zoomed.value
  if (!zoomed.value) return

  await nextTick()
  const el = scroller.value
  if (!el) return
  el.scrollLeft = img.offsetLeft + ratioX * img.offsetWidth - e.clientX
  el.scrollTop = img.offsetTop + ratioY * img.offsetHeight - e.clientY
}

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <!-- Plain link to the image, so it still opens without JavaScript -->
  <a
    :href="src"
    :aria-label="text.open"
    aria-haspopup="dialog"
    class="block cursor-zoom-in"
    @click="open"
  >
    <img
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      loading="lazy"
      class="w-full h-auto rounded-lg shadow-lg"
    />
  </a>

  <dialog
    ref="dialog"
    class="poster-lightbox fixed inset-0 m-0 p-0 w-screen h-dvh max-w-none max-h-none bg-transparent backdrop:bg-black/85"
    :aria-label="alt"
    @close="onClosed"
    @click="onBackdropClick"
  >
    <div
      ref="scroller"
      class="relative w-full h-full overflow-auto"
      :class="zoomed ? 'block' : 'flex items-center justify-center p-4 sm:p-12'"
    >
      <img
        :src="src"
        :alt="alt"
        :width="width"
        :height="height"
        class="poster-image"
        :class="
          zoomed
            ? 'block max-w-none w-auto h-auto mx-auto cursor-zoom-out'
            : 'max-w-full max-h-full w-auto h-auto object-contain cursor-zoom-in rounded-lg'
        "
        @click="toggleZoom"
      />
    </div>

    <!-- Toolbar -->
    <div class="fixed top-3 right-3 flex gap-2">
      <a
        :href="src"
        :download="downloadName ?? ''"
        class="btn btn-sm gap-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-4 h-4"
          aria-hidden="true"
        >
          <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
        </svg>
        {{ text.download }}
      </a>
      <button
        type="button"
        class="btn btn-sm btn-circle"
        :aria-label="text.close"
        autofocus
        @click="close"
      >
        ✕
      </button>
    </div>

    <p
      v-if="!zoomed"
      class="hidden sm:block fixed bottom-3 left-1/2 -translate-x-1/2 text-sm text-white/70 pointer-events-none"
    >
      {{ text.zoomHint }}
    </p>
  </dialog>
</template>

<style scoped>
.poster-lightbox[open] {
  animation: poster-fade 200ms ease-out;
}
.poster-lightbox[open] .poster-image {
  animation: poster-scale 200ms ease-out;
}
@keyframes poster-fade {
  from {
    opacity: 0;
  }
}
@keyframes poster-scale {
  from {
    transform: scale(0.96);
  }
}
@media (prefers-reduced-motion: reduce) {
  .poster-lightbox[open],
  .poster-lightbox[open] .poster-image {
    animation: none;
  }
}
</style>
