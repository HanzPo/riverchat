import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { usePostHog } from '@/composables/usePostHog'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    // Empty component as this is a single-page app
    component: { template: '<div></div>' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Track page views and route changes
router.afterEach((to) => {
  const { posthog } = usePostHog()
  if (posthog) {
    posthog.capture('$pageview', {
      $current_url: to.fullPath,
    })
  }
})

export default router

