import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '@/src/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for mock session first
    const mockSession = localStorage.getItem('hoclieuso_session');
    if (mockSession) {
      try {
        const sessionData = JSON.parse(mockSession);
        setProfile({
          uid: sessionData.id,
          email: `${sessionData.username}@hoclieuso.vn`,
          fullName: sessionData.fullName,
          role: 'user',
          status: 'approved'
        });
        // Create a mock user object to satisfy the 'user' check
        setUser({ uid: sessionData.id, email: `${sessionData.username}@hoclieuso.vn` } as User);
      } catch (e) {
        localStorage.removeItem('hoclieuso_session');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else if (firebaseUser.email === 'hiennguyenduc1996@gmail.com') {
            // Auto-profile for admin if missing
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'admin',
              status: 'approved'
            });
          }
        } else if (!mockSession) {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, profile, loading };
}
