<script setup lang="ts">
import type { FacebookPostCard } from '@lib/facebook/posts'
import type { Locale } from '@utils/locale'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  posts: FacebookPostCard[]
  locale: Locale
  pageUrl: string
}>()

const text =
  props.locale === 'th'
    ? {
        heading: 'ข่าวสารล่าสุด',
        follow: 'ติดตามเราบน Facebook',
        viewPost: 'ดูโพสต์บน Facebook',
        previous: 'เลื่อนไปทางซ้าย',
        next: 'เลื่อนไปทางขวา',
      }
    : {
        heading: 'Latest News',
        follow: 'Follow us on Facebook',
        viewPost: 'View post on Facebook',
        previous: 'Scroll left',
        next: 'Scroll right',
      }

const track = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function updateArrows() {
  const el = track.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function scrollByPage(direction: 1 | -1) {
  const el = track.value
  if (!el) return
  el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
}

// ---------------- Mouse drag ----------------
// Touch devices already swipe natively, so this only handles the mouse.
const DRAG_THRESHOLD_PX = 5
const isDragging = ref(false)
let activePointerId: number | null = null
let startX = 0
let startScrollLeft = 0
let didDrag = false

function onPointerDown(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0 || !track.value) return
  activePointerId = e.pointerId
  startX = e.clientX
  startScrollLeft = track.value.scrollLeft
  didDrag = false
}

function onPointerMove(e: PointerEvent) {
  const el = track.value
  if (e.pointerId !== activePointerId || !el) return
  const dx = e.clientX - startX
  // Small movements are still treated as a click on the card.
  if (!didDrag && Math.abs(dx) < DRAG_THRESHOLD_PX) return
  if (!didDrag) {
    didDrag = true
    isDragging.value = true // turns off snapping while dragging
    el.setPointerCapture(e.pointerId)
  }
  el.scrollLeft = startScrollLeft - dx
}

function onPointerUp(e: PointerEvent) {
  if (e.pointerId !== activePointerId) return
  activePointerId = null
  if (isDragging.value) {
    isDragging.value = false
    snapToNearestCard()
  }
}

// After a drag, the click would open the post: cancel it.
function onClickCapture(e: MouseEvent) {
  if (didDrag) {
    e.preventDefault()
    e.stopPropagation()
    didDrag = false
  }
}

// Glide to the closest card once snapping is back on, so the row always comes
// to rest aligned with the page content.
function snapToNearestCard() {
  const el = track.value
  if (!el) return
  const padding = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0
  const maxScroll = el.scrollWidth - el.clientWidth
  let target = el.scrollLeft
  let bestDistance = Infinity
  for (const card of Array.from(el.children) as HTMLElement[]) {
    const position = Math.min(card.offsetLeft - padding, maxScroll)
    const distance = Math.abs(position - el.scrollLeft)
    if (distance < bestDistance) {
      bestDistance = distance
      target = position
    }
  }
  el.scrollTo({ left: target, behavior: 'smooth' })
}

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  updateArrows()
  if (track.value) {
    resizeObserver = new ResizeObserver(updateArrows)
    resizeObserver.observe(track.value)
  }
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <section class="py-12 bg-white">
    <!-- Heading stays inside the page container -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <h2 class="text-3xl font-bold">{{ text.heading }}</h2>
          <a
            :href="pageUrl"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="text.follow"
            :title="text.follow"
            class="text-[#1877F2] hover:opacity-80 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="w-7 h-7"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.931-1.956 2.079v2.5h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"
              />
            </svg>
          </a>
        </div>
        <div class="hidden md:flex gap-2">
          <button
            type="button"
            class="btn btn-circle btn-xs"
            :disabled="!canScrollLeft"
            :aria-label="text.previous"
            @click="scrollByPage(-1)"
          >
            ‹
          </button>
          <button
            type="button"
            class="btn btn-circle btn-xs"
            :disabled="!canScrollRight"
            :aria-label="text.next"
            @click="scrollByPage(1)"
          >
            ›
          </button>
        </div>
      </div>
    </div>

    <!-- Cards span the full width; the first one lines up with the heading -->
    <ul
      ref="track"
      class="post-track relative flex gap-4 overflow-x-auto py-4"
      :class="{ dragging: isDragging }"
      @scroll.passive="updateArrows"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click.capture="onClickCapture"
      @dragstart.prevent
    >
      <li
        v-for="post in posts"
        :key="post.id"
        class="post-card shrink-0 w-[280px]"
      >
        <a
          :href="post.permalinkUrl"
          target="_blank"
          rel="noopener noreferrer"
          :title="text.viewPost"
          draggable="false"
          class="flex flex-col h-full rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm"
        >
          <!-- Fixed 4:5 frame. The image is absolutely positioned so a taller
               picture can't stretch the frame; it is cropped to fill it. -->
          <div class="relative shrink-0 aspect-[4/5] bg-gray-100">
            <img
              v-if="post.imageUrl"
              :src="post.imageUrl"
              alt=""
              loading="lazy"
              draggable="false"
              class="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div class="p-4 flex flex-col gap-2 grow">
            <time :datetime="post.dateTime" class="text-sm text-gray-500">
              {{ post.dateLabel }}
            </time>
            <p v-if="post.message" class="text-gray-800 line-clamp-3">
              {{ post.message }}
            </p>
          </div>
        </a>
      </li>
    </ul>
  </section>
</template>

<style scoped>
/*
 * Room between the window edges and the first/last card. Snapping uses the
 * same value so cards come to rest at this offset, not against the edge.
 * Same steps as the page gutters (px-4 sm:px-6 lg:px-8).
 */
.post-track {
  --edge: 1rem;
  padding-inline: var(--edge);
  scroll-padding-inline: var(--edge);
  scroll-snap-type: x mandatory;
  cursor: grab;
  /* Hide the scrollbar; arrows, drag, swipe and trackpad still scroll. */
  scrollbar-width: none;
}
.post-track::-webkit-scrollbar {
  display: none;
}
@media (min-width: 40rem) {
  .post-track {
    --edge: 1.5rem;
  }
}
@media (min-width: 64rem) {
  .post-track {
    --edge: 2rem;
  }
}

.post-track.dragging {
  scroll-snap-type: none;
  cursor: grabbing;
  user-select: none;
}

.post-card {
  scroll-snap-align: start;
}

/* Hover lift */
.post-card > a {
  transition:
    transform 300ms ease-out,
    box-shadow 300ms ease-out;
}
.post-track:not(.dragging) .post-card > a:hover {
  transform: scale(1.03);
  box-shadow: 0 12px 24px -8px rgb(0 0 0 / 0.25);
}
@media (prefers-reduced-motion: reduce) {
  .post-card > a {
    transition: none;
  }
  .post-track:not(.dragging) .post-card > a:hover {
    transform: none;
  }
}
</style>
