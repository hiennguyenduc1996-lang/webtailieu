import { db, auth } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot,
  query, 
  where, 
  orderBy,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { Comment } from '../types';

const COLLECTION = 'comments';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const commentService = {
  async addComment(data: Omit<Comment, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION);
    }
  },

  async deleteComment(commentId: string) {
    try {
      await deleteDoc(doc(db, COLLECTION, commentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION}/${commentId}`);
    }
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTION);
    });
  }
};
