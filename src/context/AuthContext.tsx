import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, testFirestoreConnection } from '../lib/firebase';
import { UserAccount, UserPrivateInfo, UserRole } from '../types/stylah';

export const BOOTSTRAP_ADMIN_EMAILS = [
  'stylahindustries297@gmail.com',
  'josephngotho988@gmail.com',
];

interface AuthContextValue {
  user: User | null;
  profile: UserAccount | null;
  privateInfo: UserPrivateInfo | null;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  loading: boolean;
  firestoreOffline: boolean;
  signInWithGoogle: () => Promise<void>;
  registerWithEmail: (fullName: string, email: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUserSession: () => Promise<void>;
  logout: () => Promise<void>;
  savePrivateInfo: (updates: Partial<UserPrivateInfo> & { fullName?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserAccount | null>(null);
  const [privateInfo, setPrivateInfo] = useState<UserPrivateInfo | null>(null);
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(true);
  const [firestoreOffline, setFirestoreOffline] = useState(false);

  const syncUserDocuments = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const newAccount: UserAccount = {
          uid: firebaseUser.uid,
          fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Stylah Customer',
          profileImage: firebaseUser.photoURL || '',
          role: 'customer',
          accountStatus: 'active',
        };
        await setDoc(userRef, {
          ...newAccount,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setProfile(newAccount);
      } else {
        setProfile(userSnap.data() as UserAccount);
      }

      const privRef = doc(db, 'users', firebaseUser.uid, 'private', 'info');
      const privSnap = await getDoc(privRef);
      if (!privSnap.exists()) {
        const initPrivate: UserPrivateInfo = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          phoneNumber: '',
          deliveryTown: 'Nairobi',
          deliveryAddress: '',
        };
        await setDoc(privRef, {
          ...initPrivate,
          updatedAt: serverTimestamp(),
        });
        setPrivateInfo(initPrivate);
      } else {
        setPrivateInfo(privSnap.data() as UserPrivateInfo);
      }

      // Resolve trusted role from verified bootstrap emails or admins/staff docs
      let resolvedRole: UserRole = 'customer';
      const normalizedEmail = (firebaseUser.email || '').trim().toLowerCase();
      if (firebaseUser.emailVerified) {
        if (BOOTSTRAP_ADMIN_EMAILS.includes(normalizedEmail)) {
          resolvedRole = 'admin';
        } else {
          const [adminSnap, staffSnap] = await Promise.all([
            getDoc(doc(db, 'admins', firebaseUser.uid)).catch(() => null),
            getDoc(doc(db, 'staff', firebaseUser.uid)).catch(() => null),
          ]);
          if (adminSnap?.exists()) {
            resolvedRole = 'admin';
          } else if (staffSnap?.exists()) {
            resolvedRole = 'staff';
          }
        }
      }
      setRole(resolvedRole);
    } catch (err) {
      console.warn('User profile sync warning:', err);
    }
  };

  useEffect(() => {
    testFirestoreConnection().then((res) => {
      if (res.offline) setFirestoreOffline(true);
    });

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await syncUserDocuments(firebaseUser);
      } else {
        setProfile(null);
        setPrivateInfo(null);
        setRole('customer');
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const registerWithEmail = async (fullName: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (fullName.trim()) {
      await updateProfile(cred.user, { displayName: fullName.trim() });
    }
    await sendEmailVerification(cred.user);
    await syncUserDocuments(cred.user);
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const refreshUserSession = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser } as User);
      await syncUserDocuments(auth.currentUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const savePrivateInfo = async (updates: Partial<UserPrivateInfo> & { fullName?: string }) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      if (updates.fullName && auth.currentUser.emailVerified) {
        await setDoc(
          doc(db, 'users', uid),
          {
            uid,
            fullName: updates.fullName.trim().slice(0, 120),
            profileImage: profile?.profileImage || auth.currentUser.photoURL || '',
            role: profile?.role || 'customer',
            accountStatus: profile?.accountStatus || 'active',
            createdAt: profile?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      const privPayload = {
        uid,
        email: updates.email ?? privateInfo?.email ?? auth.currentUser.email ?? '',
        phoneNumber: updates.phoneNumber ?? privateInfo?.phoneNumber ?? '',
        deliveryTown: updates.deliveryTown ?? privateInfo?.deliveryTown ?? 'Nairobi',
        deliveryAddress: updates.deliveryAddress ?? privateInfo?.deliveryAddress ?? '',
        fcmToken: updates.fcmToken ?? privateInfo?.fcmToken ?? '',
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', uid, 'private', 'info'), privPayload, { merge: true });
      setPrivateInfo(privPayload as UserPrivateInfo);
      if (updates.fullName) {
        setProfile((prev) => (prev ? { ...prev, fullName: updates.fullName!.trim() } : prev));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}/private/info`);
    }
  };

  const isAdmin = role === 'admin';
  const isStaff = role === 'admin' || role === 'staff';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        privateInfo,
        role,
        isAdmin,
        isStaff,
        loading,
        firestoreOffline,
        signInWithGoogle,
        registerWithEmail,
        loginWithEmail,
        sendResetEmail,
        resendVerification,
        refreshUserSession,
        logout,
        savePrivateInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
