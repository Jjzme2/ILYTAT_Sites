export interface Service {
  id: string
  name: string
  slug: string
  tagline: string
  description: string
  icon: string
  features: string[]
  packages: Package[]
  category: 'web' | 'print' | 'digital' | 'bundle'
}

export interface Package {
  id: string
  name: string
  price: number
  priceId: string // Stripe price ID
  description: string
  features: string[]
  popular?: boolean
  turnaround: string
}

export interface Order {
  id: string
  userId: string
  serviceId: string
  packageId: string
  serviceName: string
  packageName: string
  status: OrderStatus
  amount: number
  stripeSessionId: string
  stripePaymentIntentId?: string
  customerEmail: string
  customerName: string
  businessName: string
  notes?: string
  deliverables?: Deliverable[]
  createdAt: Date
  updatedAt: Date
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'cancelled'

export interface Deliverable {
  id: string
  name: string
  url: string
  type: 'file' | 'link'
  uploadedAt: Date
}

export interface User {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  businessName?: string
  phone?: string
  createdAt: Date
}

export interface ContactInquiry {
  id?: string
  name: string
  email: string
  businessName: string
  phone?: string
  service: string
  message: string
  status: 'new' | 'contacted' | 'converted' | 'closed'
  createdAt: Date
}

export interface QRCodeConfig {
  url: string
  size: number
  foregroundColor: string
  backgroundColor: string
  style: 'square' | 'rounded' | 'dots'
  logo?: string
  errorCorrection: 'L' | 'M' | 'Q' | 'H'
}

export interface Testimonial {
  id: string
  name: string
  businessName: string
  avatar?: string
  rating: number
  text: string
  service: string
}

export interface BlogPostStyle {
  accentColor: string        // hex, e.g. '#6366f1'
  heroStyle: 'minimal' | 'gradient' | 'image'
  fontStyle: 'sans' | 'serif'
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string            // HTML from Tiptap
  coverImage: string
  tags: string[]
  status: 'draft' | 'published'
  style: BlogPostStyle
  authorName: string
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
