/**
 * useContactForm — manages the contact inquiry form and submission flow.
 *
 * Keeps form state and the POST to /api/contact out of the page component,
 * making the form logic independently testable and the template leaner.
 */
import { reactive, ref } from 'vue'

interface ContactForm {
  name:               string
  businessName:       string
  email:              string
  phone:              string
  service:            string
  billingPreference:  string
  message:            string
  /** Cloudflare Turnstile challenge token — populated by <NuxtTurnstile> widget. */
  cfTurnstileToken:   string
  /** Honeypot — must stay empty; any value signals an automated submission. */
  honeypot:           string
}

export function useContactForm() {
  const toast = useToast()
  const { track } = useAnalytics()

  const form = reactive<ContactForm>({
    name:              '',
    businessName:      '',
    email:             '',
    phone:             '',
    service:           '',
    billingPreference: 'monthly',
    message:           '',
    // In dev the Turnstile widget is skipped entirely; pre-fill with a recognisable
    // sentinel so the schema min(1) check still passes and the submit button stays
    // enabled. The server ignores the token value when import.meta.dev is true.
    cfTurnstileToken:  import.meta.dev ? 'dev-bypass' : '',
    honeypot:          '',
  })

  const submitting = ref(false)
  const submitted  = ref(false)

  async function handleSubmit(): Promise<void> {
    submitting.value = true
    try {
      await $fetch('/api/contact', {
        method: 'POST',
        body: {
          name:              form.name,
          businessName:      form.businessName,
          email:             form.email,
          phone:             form.phone     || undefined,
          service:           form.service   || 'Not specified',
          billingPreference: form.billingPreference,
          message:           form.message,
          cfTurnstileToken:  form.cfTurnstileToken,
          honeypot:          form.honeypot,
        },
      })
      submitted.value = true
      toast.add({
        title:       'Message received!',
        description: "I'll be in touch within 24 hours.",
        icon:        'i-heroicons-check-circle',
        color:       'success',
      })
      track('contact_submit', {
        service:           form.service || 'Not specified',
        billingPreference: form.billingPreference,
      })
    } catch {
      toast.add({
        title:       'Could not send message',
        description: 'Please try again or reach out directly.',
        icon:        'i-heroicons-exclamation-circle',
        color:       'error',
      })
      track('contact_error')
    } finally {
      submitting.value = false
    }
  }

  return { form, submitting, submitted, handleSubmit }
}
