import { useState, useEffect } from 'react';
import { db } from '@/src/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<{id: string, text: string, order: number}[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as {text: string, order?: number} }));
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setNotifications(data.map(d => ({id: d.id, text: d.text, order: d.order || 0})));
    });
    return () => unsubscribe();
  }, []);

  return notifications;
};
