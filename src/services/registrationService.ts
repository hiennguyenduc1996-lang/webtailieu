import { db } from '@/src/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { RegistrationRequest } from '@/src/types';

export const registrationService = {
  findRequest: async (username: string): Promise<RegistrationRequest | null> => {
    const q = query(collection(db, 'registrationRequests'), where('username', '==', username));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as RegistrationRequest;
  }
};
