import {
  useFirestore,
  Collections,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from '~/utils/firebase'
import type { Order } from '~/types'

export const useOrders = () => {
  const db = useFirestore()
  const ordersCollection = collection(db, Collections.ORDERS)

  const getUserOrders = async (userId: string): Promise<Order[]> => {
    const q = query(ordersCollection, where('userId', '==', userId), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate(),
      updatedAt: d.data().updatedAt?.toDate(),
    })) as Order[]
  }

  const getAllOrders = async (): Promise<Order[]> => {
    const q = query(ordersCollection, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate(),
      updatedAt: d.data().updatedAt?.toDate(),
    })) as Order[]
  }

  const getOrder = async (orderId: string): Promise<Order | null> => {
    const snap = await getDoc(doc(ordersCollection, orderId))
    if (!snap.exists()) return null
    return {
      id: snap.id,
      ...snap.data(),
      createdAt: snap.data().createdAt?.toDate(),
      updatedAt: snap.data().updatedAt?.toDate(),
    } as Order
  }

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    await updateDoc(doc(ordersCollection, orderId), {
      status,
      updatedAt: serverTimestamp(),
    })
  }

  return {
    getUserOrders,
    getAllOrders,
    getOrder,
    updateOrderStatus,
  }
}
