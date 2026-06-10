import { ref, watch } from 'vue'

export function useCheckout() {
  const { track } = useAnalytics()

  const billingCycle = ref<'monthly' | 'yearly'>('monthly')
  const hostingTier  = ref<'standard' | 'premium'>('standard')

  watch(billingCycle, (to) => track('billing_toggle', { to }))

  return { billingCycle, hostingTier }
}
