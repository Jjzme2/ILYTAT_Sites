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

  social: {
    /** Add handles when accounts are ready. Example: 'https://facebook.com/ilytat' */
    facebook:  '',
    instagram: '',
    linkedin:  '',
  },
}
