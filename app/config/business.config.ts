/**
 * Business configuration — single source of truth for contact details,
 * address, and other business-specific constants.
 *
 * Edit this file to update phone numbers, emails, and address info
 * across the entire site without touching any component code.
 */

export const businessConfig = {
  name:      'ILYTAT LLC',
  shortName: 'ILYTAT',

  contact: {
    /** Display-formatted phone number shown in UI. */
    phone:     '(708) 627-1854',
    phoneHref: 'tel:+17086271854',

    /** Primary support email. */
    email:     'support@ilytat.com',
    emailHref: 'mailto:support@ilytat.com',
  },

  address: {
    city:    'Manteno',
    state:   'IL',
    country: 'US',
    region:  'Kankakee County',
  },

  /**
   * Profiles that represent this same business elsewhere.
   *
   * Emitted as `sameAs` on the LocalBusiness entity, which is how Google is
   * told "the site at this URL and that listing are one business". Without it
   * the site and the Google Business Profile are two unconnected things, and
   * the reviews and prominence attached to the listing do nothing for the
   * site's own results.
   *
   * This lives here rather than in site.config because business identity
   * belongs with the rest of the NAP details — an earlier pass added a second
   * copy in site.config, which is precisely the two-definitions-of-one-fact
   * problem that has caused every silent drift in this project.
   *
   * ⚠️ A Google *search* URL is not a profile URL. It points at a query, not an
   * entity, and carries the searcher's own session parameters. Use one of:
   *
   *   https://maps.app.goo.gl/XXXXXXXX      (Maps → your business → Share)
   *   https://www.google.com/maps/place/... (the address bar on Maps)
   *
   * Blank entries are dropped, so adding one is: paste, commit, deploy.
   * Nothing here is secret — every value is a public profile link.
   */
  profiles: {
    // The `?g_st=ic` the iOS share sheet appends is dropped — it records which
    // app the link was copied from, not which business it is.
    googleBusiness: 'https://maps.app.goo.gl/b9vdykozVqrsRqzr8',
    facebook:  '',
    instagram: '',
    linkedin:  '',
  } as Record<string, string>,
}
