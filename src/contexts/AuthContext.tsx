import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../services/firebase/config';
import { User, Profile, UserRole } from '../types';
import { COLLECTIONS, STORAGE_KEYS } from '../constants';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: Partial<Profile>, role: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: Partial<Profile>) => Promise<void>;
  isAuthenticated: boolean;
  userRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Generate referral code
  const generateReferralCode = (firstName: string, lastName: string): string => {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const nameStr = (firstName.substring(0, 2) + lastName.substring(0, 2)).toUpperCase();
    return `R9J${nameStr}${randomStr}`;
  };

  // Create user profile in Firestore
  const createUserProfile = async (
    firebaseUser: FirebaseUser, 
    userData: Partial<Profile>,
    role: UserRole
  ): Promise<Profile> => {
    const profileData: Profile = {
      id: firebaseUser.uid,
      userId: firebaseUser.uid,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
      phoneNumber: userData.phoneNumber || '',
      address: userData.address || '',
      avatar: userData.avatar || '',
      businessName: userData.businessName || '',
      businessDescription: userData.businessDescription || '',
      businessCategory: userData.businessCategory || '',
      isVerified: false,
      rating: 0,
      totalReviews: 0,
      totalTransactions: 0,
      referralCode: generateReferralCode(userData.firstName || 'User', userData.lastName || 'Name'),
      referredBy: userData.referredBy || undefined,
      bonus: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save profile to Firestore
    const profileRef = doc(db, COLLECTIONS.PROFILES, firebaseUser.uid);
    await setDoc(profileRef, {
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Save user role to separate collection for easier queries
    const userRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
    await setDoc(userRef, {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      role: role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return profileData;
  };

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid: string): Promise<{ profile: Profile | null; role: UserRole | null }> => {
    try {
      const [profileDoc, userDoc] = await Promise.all([
        getDoc(doc(db, COLLECTIONS.PROFILES, uid)),
        getDoc(doc(db, COLLECTIONS.USERS, uid))
      ]);

      if (profileDoc.exists() && userDoc.exists()) {
        const profileData = profileDoc.data() as Profile;
        const userData = userDoc.data() as User;
        
        // Convert Firestore timestamps to Date objects
        profileData.createdAt = profileData.createdAt || new Date();
        profileData.updatedAt = profileData.updatedAt || new Date();
        
        return { 
          profile: profileData, 
          role: userData.role 
        };
      }
      return { profile: null, role: null };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { profile: null, role: null };
    }
  };

  // Sign up new user
  const signUp = async (
    email: string, 
    password: string, 
    userData: Partial<Profile>,
    role: UserRole
  ): Promise<void> => {
    try {
      setLoading(true);
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase Auth profile
      await updateProfile(firebaseUser, {
        displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`
      });

      // Create user profile in Firestore
      const newProfile = await createUserProfile(firebaseUser, userData, role);
      
      setProfile(newProfile);
      setUserRole(role);
      
      // Store role in AsyncStorage for quick access
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in existing user
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      // Profile will be loaded in the auth state change listener
    } catch (error) {
      console.error('Signin error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out user
  const logout = async (): Promise<void> => {
    try {
      // Clear stored data first
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE),
        AsyncStorage.removeItem(STORAGE_KEYS.CART_ITEMS),
        AsyncStorage.removeItem(STORAGE_KEYS.RECENTLY_VIEWED)
      ]);

      // Sign out from Firebase, which will trigger the onAuthStateChanged listener
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<Profile>): Promise<void> => {
    try {
      if (!user || !profile) {
        throw new Error('No authenticated user');
      }

      const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await setDoc(profileRef, updateData, { merge: true });

      // Update local profile state
      setProfile(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);

      // Update Firebase Auth display name if changed
      if (updates.displayName && updates.displayName !== user.displayName) {
        await updateProfile(user, { displayName: updates.displayName });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        
        if (firebaseUser) {
          setUser(firebaseUser);
          
          // Fetch user profile and role
          const { profile: userProfile, role } = await fetchUserProfile(firebaseUser.uid);
          
          if (userProfile && role) {
            setProfile(userProfile);
            setUserRole(role);
            await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
          } else {
            // Profile doesn't exist, might need to create it
            console.warn('User profile not found for authenticated user');
          }
        } else {
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setLoading(false);
      }
    });

    // Load stored user role on app start
    const loadStoredRole = async () => {
      try {
        const storedRole = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
        if (storedRole) {
          setUserRole(storedRole as UserRole);
        }
      } catch (error) {
        console.error('Error loading stored role:', error);
      }
    };

    loadStoredRole();

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    logout,
    resetPassword,
    updateUserProfile,
    isAuthenticated: !!user,
    userRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
