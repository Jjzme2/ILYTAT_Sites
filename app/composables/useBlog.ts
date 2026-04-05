import {
  useFirestore,
  Collections,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from '~/utils/firebase'
import type { BlogPost } from '~/types'

export const useBlog = () => {
  const db = useFirestore()
  const postsCollection = collection(db, Collections.BLOG_POSTS)

  const mapPost = (d: { id: string; data: () => Record<string, unknown> }): BlogPost => ({
    id: d.id,
    ...(d.data() as Omit<BlogPost, 'id'>),
    publishedAt: (d.data().publishedAt as { toDate?: () => Date } | null)?.toDate?.() ?? null,
    createdAt: (d.data().createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (d.data().updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
  })

  const getPublishedPosts = async (): Promise<BlogPost[]> => {
    const q = query(
      postsCollection,
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => mapPost({ id: d.id, data: () => d.data() as Record<string, unknown> }))
  }

  const getPostBySlug = async (slug: string): Promise<BlogPost | null> => {
    const q = query(postsCollection, where('slug', '==', slug), where('status', '==', 'published'))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const d = snapshot.docs[0]!
    return mapPost({ id: d.id, data: () => d.data() as Record<string, unknown> })
  }

  const getAllPosts = async (): Promise<BlogPost[]> => {
    const q = query(postsCollection, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => mapPost({ id: d.id, data: () => d.data() as Record<string, unknown> }))
  }

  const getPostById = async (id: string): Promise<BlogPost | null> => {
    const snap = await getDoc(doc(postsCollection, id))
    if (!snap.exists()) return null
    return mapPost({ id: snap.id, data: () => snap.data() as Record<string, unknown> })
  }

  const createPost = async (
    data: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>,
  ) => {
    const now = serverTimestamp()
    return await addDoc(postsCollection, {
      ...data,
      publishedAt: data.status === 'published' ? now : null,
      createdAt: now,
      updatedAt: now,
    })
  }

  const updatePost = async (
    id: string,
    data: Partial<Omit<BlogPost, 'id' | 'createdAt'>>,
    wasPublished: boolean,
  ) => {
    const updates: Record<string, unknown> = {
      ...data,
      updatedAt: serverTimestamp(),
    }
    if (data.status === 'published' && !wasPublished) {
      updates.publishedAt = serverTimestamp()
    }
    await updateDoc(doc(postsCollection, id), updates)
  }

  const deletePost = async (id: string) => {
    await deleteDoc(doc(postsCollection, id))
  }

  return {
    getPublishedPosts,
    getPostBySlug,
    getAllPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
  }
}
