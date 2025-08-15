import {
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './config';
import { Profile, ApiResponse } from '../../types';
import { COLLECTIONS, STORAGE_PATHS } from '../../constants';

export class ProfileService {
  private static readonly PROFILES_COLLECTION = COLLECTIONS.PROFILES;
  private static readonly AVATARS_STORAGE_PATH = STORAGE_PATHS.AVATARS;

  // Get user profile by ID
  static async getProfile(userId: string): Promise<ApiResponse<Profile>> {
    try {
      const profileRef = doc(db, this.PROFILES_COLLECTION, userId);
      const profileDoc = await getDoc(profileRef);

      if (!profileDoc.exists()) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      const profile = {
        id: profileDoc.id,
        ...profileDoc.data()
      } as Profile;

      return {
        success: true,
        data: profile
      };
    } catch (error) {
      console.error('Error getting profile:', error);
      return {
        success: false,
        error: 'Failed to fetch profile'
      };
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<ApiResponse<Profile>> {
    try {
      const profileRef = doc(db, this.PROFILES_COLLECTION, userId);

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(profileRef, updateData);

      // Get updated profile
      const updatedProfile = await this.getProfile(userId);
      
      if (updatedProfile.success) {
        return {
          success: true,
          data: updatedProfile.data,
          message: 'Profile updated successfully'
        };
      } else {
        throw new Error('Failed to fetch updated profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: 'Failed to update profile'
      };
    }
  }

  // Upload user avatar
  static async uploadAvatar(userId: string, imageUri: string): Promise<ApiResponse<string>> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const filename = `${userId}/avatar_${Date.now()}.jpg`;
      const imageRef = ref(storage, `${this.AVATARS_STORAGE_PATH}/${filename}`);
      
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);

      // Update profile with new avatar URL
      const profileRef = doc(db, this.PROFILES_COLLECTION, userId);
      await updateDoc(profileRef, {
        avatar: downloadURL,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        data: downloadURL,
        message: 'Avatar uploaded successfully'
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return {
        success: false,
        error: 'Failed to upload avatar'
      };
    }
  }

  // Delete user avatar
  static async deleteAvatar(userId: string, avatarUrl: string): Promise<ApiResponse<void>> {
    try {
      // Delete from storage
      const imageRef = ref(storage, avatarUrl);
      await deleteObject(imageRef);

      // Update profile to remove avatar URL
      const profileRef = doc(db, this.PROFILES_COLLECTION, userId);
      await updateDoc(profileRef, {
        avatar: '',
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Avatar deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting avatar:', error);
      return {
        success: false,
        error: 'Failed to delete avatar'
      };
    }
  }

  // Search profiles by name or business name
  static async searchProfiles(searchTerm: string, limit: number = 20): Promise<ApiResponse<Profile[]>> {
    try {
      const profilesRef = collection(db, this.PROFILES_COLLECTION);
      const querySnapshot = await getDocs(profilesRef);
      
      const profiles: Profile[] = [];
      const searchLower = searchTerm.toLowerCase();

      querySnapshot.forEach((doc) => {
        const profile = {
          id: doc.id,
          ...doc.data()
        } as Profile;

        const displayName = profile.displayName?.toLowerCase() || '';
        const businessName = profile.businessName?.toLowerCase() || '';
        const firstName = profile.firstName?.toLowerCase() || '';
        const lastName = profile.lastName?.toLowerCase() || '';

        if (
          displayName.includes(searchLower) ||
          businessName.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower)
        ) {
          profiles.push(profile);
        }
      });

      return {
        success: true,
        data: profiles.slice(0, limit)
      };
    } catch (error) {
      console.error('Error searching profiles:', error);
      return {
        success: false,
        error: 'Failed to search profiles'
      };
    }
  }

  // Get sellers for directory
  static async getSellers(limit: number = 50): Promise<ApiResponse<Profile[]>> {
    try {
      const profilesRef = collection(db, this.PROFILES_COLLECTION);
      const sellersQuery = query(
        profilesRef,
        where('businessName', '!=', ''),
        where('isVerified', '==', true)
      );

      const querySnapshot = await getDocs(sellersQuery);
      const sellers: Profile[] = [];

      querySnapshot.forEach((doc) => {
        sellers.push({
          id: doc.id,
          ...doc.data()
        } as Profile);
      });

      // Sort by rating and total reviews
      sellers.sort((a, b) => {
        if (a.rating !== b.rating) {
          return b.rating - a.rating;
        }
        return b.totalReviews - a.totalReviews;
      });

      return {
        success: true,
        data: sellers.slice(0, limit)
      };
    } catch (error) {
      console.error('Error getting sellers:', error);
      return {
        success: false,
        error: 'Failed to fetch sellers'
      };
    }
  }

  // Update user rating (called when new review is added)
  static async updateUserRating(userId: string, newRating: number): Promise<ApiResponse<void>> {
    try {
      const profileRef = doc(db, this.PROFILES_COLLECTION, userId);
      const profileDoc = await getDoc(profileRef);

      if (!profileDoc.exists()) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      const profile = profileDoc.data() as Profile;
      const currentRating = profile.rating || 0;
      const totalReviews = profile.totalReviews || 0;

      // Calculate new average rating
      const newTotalReviews = totalReviews + 1;
      const newAverageRating = ((currentRating * totalReviews) + newRating) / newTotalReviews;

      await updateDoc(profileRef, {
        rating: Math.round(newAverageRating * 10) / 10, // Round to 1 decimal place
        totalReviews: newTotalReviews,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Rating updated successfully'
      };
    } catch (error) {
      console.error('Error updating user rating:', error);
      return {
        success: false,
        error: 'Failed to update rating'
      };
    }
  }

  // Update transaction count
  static async updateTransactionCount(userId: string): Promise<ApiResponse<void>> {
    try {
      const profileRef = doc(db, this.PROFILES_COLLECTION, userId);
      const profileDoc = await getDoc(profileRef);

      if (!profileDoc.exists()) {
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      const profile = profileDoc.data() as Profile;
      const currentCount = profile.totalTransactions || 0;

      await updateDoc(profileRef, {
        totalTransactions: currentCount + 1,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Transaction count updated'
      };
    } catch (error) {
      console.error('Error updating transaction count:', error);
      return {
        success: false,
        error: 'Failed to update transaction count'
      };
    }
  }

  // Verify seller profile (admin only)
  static async verifyProfile(userId: string, isVerified: boolean): Promise<ApiResponse<void>> {
    try {
      const profileRef = doc(db, this.PROFILES_COLLECTION, userId);
      
      await updateDoc(profileRef, {
        isVerified: isVerified,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: `Profile ${isVerified ? 'verified' : 'unverified'} successfully`
      };
    } catch (error) {
      console.error('Error verifying profile:', error);
      return {
        success: false,
        error: 'Failed to verify profile'
      };
    }
  }
}
