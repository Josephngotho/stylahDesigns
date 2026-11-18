import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  recheckConnection: () => Promise<boolean>;
  markFirestoreOnline: () => void;
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
  const syncInFlightRef = useRef<Map<string, Promise<void>>>(new Map());

  const recheckConnection = async (): Promise<boolean> => {
    const res = await testFirestoreConnection();
    const isOffline = Boolean(res.offline);
    setFirestoreOffline(isOffline);
    if (!isOffline && auth.currentUser) {
      await syncUserDocuments(auth.currentUser);
    }
    return !isOffline;
  };

  const markFirestoreOnline = () => {
    setFirestoreOffline((prev) => (prev ? false : prev));
  };

  const syncUserDocuments = (firebaseUser: User, preferredName?: string): Promise<void> => {
    const existingPromise = syncInFlightRef.current.get(firebaseUser.uid);
    if (existingPromise) {
      return existingPromise;
    }

    const run = (async () => {
      // Resolve bootstrap admin role immediately so verified admins are never locked out by transient sync delays
      const normalizedEmail = (firebaseUser.email || '').trim().toLowerCase();
      const isBootstrapAdmin =
        Boolean(firebaseUser.emailVerified) && BOOTSTRAP_ADMIN_EMAILS.includes(normalizedEmail);
      if (isBootstrapAdmin) {
        setRole('admin');
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const rawName =
            preferredName?.trim() ||
            firebaseUser.displayName?.trim() ||
            firebaseUser.email?.split('@')[0]?.trim() ||
            'Stylah Customer';
          const newAccount: UserAccount = {
            uid: firebaseUser.uid,
            fullName: rawName.slice(0, 120),
            profileImage: (firebaseUser.photoURL || '').slice(0, 500),
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
          const safeEmail = (firebaseUser.email || `${firebaseUser.uid}@stylah.local`).trim().slice(0, 160);
          const initPrivate: UserPrivateInfo = {
            uid: firebaseUser.uid,
            email: safeEmail.length >= 3 ? safeEmail : `${firebaseUser.uid}@stylah.local`,
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

        setFirestoreOffline(false);

        // Resolve trusted role from verified bootstrap emails or admins/staff docs
        let resolvedRole: UserRole = isBootstrapAdmin ? 'admin' : 'customer';
        if (firebaseUser.emailVerified && !isBootstrapAdmin) {
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
        setRole(resolvedRole);
      } catch (err) {
        console.warn('User profile sync warning:', err);
      }
    })().finally(() => {
      syncInFlightRef.current.delete(firebaseUser.uid);
    });

    syncInFlightRef.current.set(firebaseUser.uid, run);
    return run;
  };

  useEffect(() => {
    let active = true;
    testFirestoreConnection().then((res) => {
      if (active) setFirestoreOffline(Boolean(res.offline));
    });

    const handleOnline = () => {
      testFirestoreConnection().then((res) => {
        if (active) setFirestoreOffline(Boolean(res.offline));
      });
    };
    window.addEventListener('online', handleOnline);

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

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      unsub();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const registerWithEmail = async (fullName: string, email: string, password: string) => {
    const cleanName = fullName.trim().slice(0, 120);
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (cleanName) {
      await updateProfile(cred.user, { displayName: cleanName }).catch(() => undefined);
    }
    await syncUserDocuments(cred.user, cleanName);
    try {
      await sendEmailVerification(cred.user);
    } catch (verifyErr) {
      console.warn('Verification email send warning:', verifyErr);
    }
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
        recheckConnection,
        markFirestoreOnline,
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
