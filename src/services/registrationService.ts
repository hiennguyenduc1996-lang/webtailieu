import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { RegistrationRequest } from '../types';

const COLLECTION = 'registration_requests';

export const registrationService = {
  async createRequest(data: Omit<RegistrationRequest, 'id' | 'status' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      status: 'pending',
      createdAt: Date.now()
    });
    return docRef.id;
  },

  async getRequests() {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistrationRequest));
  },

  async updateRequestStatus(id: string, status: 'approved' | 'rejected') {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, { status });
  },

  async deleteRequest(id: string) {
    await deleteDoc(doc(db, COLLECTION, id));
  }
};
