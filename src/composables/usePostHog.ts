import posthog from 'posthog-js'

let isInitialized = false

export function initPostHog() {
  if (isInitialized) {
    return
  }

  const apiKey = import.meta.env.VITE_POSTHOG_KEY
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (!apiKey) {
    console.warn('PostHog API key not found. Analytics will not be initialized.')
    return
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    person_profiles: 'identified_only',
    capture_pageview: false, // We'll manually capture pageviews in the router
  })

  isInitialized = true
}

export function usePostHog() {
  return {
    posthog: isInitialized ? posthog : null
  }
}