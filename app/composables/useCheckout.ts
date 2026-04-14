/**
 * useCheckout — manages pricing toggles and Stripe checkout initiation.
 *
 * Centralises billing cycle, hosting tier selection, and the checkout POST so
 * these concerns are not duplicated across pricing-adjacent components.
 * Each call creates independent reactive state, matching one SitePricing mount.
 */
import { ref, watch } from 'vue'
import { siteConfig } from '~/config/site.config'

type Package = (typeof siteConfig.packages)[number]

export function useCheckout() {
  const toast = useToast()
  const { track } = useAnalytics()

  const billingCycle    = ref<'monthly' | 'yearly'>('monthly')
  const hostingTier     = ref<'standard' | 'premium'>('standard')
  const checkoutLoading = ref<string | null>(null)

  watch(billingCycle, (to) => track('billing_toggle', { to }))

  async function startCheckout(pkg: Package): Promise<void> {
    checkoutLoading.value = pkg.name
    track('checkout_initiated', {
      packageName:  pkg.name,
      billingCycle: billingCycle.value,
      hostingTier:  hostingTier.value,
    })

    try {
      const { url } = await $fetch<{ url: string }>('/api/stripe/create-checkout', {
        method: 'POST',
        body: {
          packageName:  pkg.name,
          serviceName:  'Website',
          billingCycle: billingCycle.value,
          hostingTier:  hostingTier.value,
        },
      })
      if (url) window.location.href = url
    } catch {
      toast.add({
        title:       'Checkout unavailable',
        description: 'Something went wrong — please try again or contact us directly.',
        icon:        'i-heroicons-exclamation-circle',
        color:       'error',
      })
      track('checkout_error', {
        packageName:  pkg.name,
        billingCycle: billingCycle.value,
        hostingTier:  hostingTier.value,
      })
    } finally {
      checkoutLoading.value = null
    }
  }

  return { billingCycle, hostingTier, checkoutLoading, startCheckout }
}
