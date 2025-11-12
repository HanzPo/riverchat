import posthog from 'posthog-js'

export function usePostHog() {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (!apiKey) {
    console.warn('PostHog API key not found. Analytics will not be initialized.')
    return { posthog: null }
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
  })

  return { posthog }
}