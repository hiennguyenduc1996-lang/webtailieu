import { useState, useEffect } from 'react';
import { db } from '@/src/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data().text);
      setNotifications(data);
    });
    return () => unsubscribe();
  }, []);

  return notifications;
};
