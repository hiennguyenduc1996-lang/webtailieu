import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot,
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { Comment } from '../types';

const COLLECTION = 'comments';

export const commentService = {
  async addComment(data: Omit<Comment, 'id'>) {
    const docRef = await addDoc(collection(db, COLLECTION), data);
    return docRef.id;
  },

  subscribeToComments(documentId: string, callback: (comments: Comment[]) => void) {
    const q = query(
      collection(db, COLLECTION),
      where('documentId', '==', documentId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      callback(comments);
    });
  }
};
