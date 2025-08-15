import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileService } from '../../services/firebase/profiles';
import { COLORS, DEFAULT_IMAGES } from '../../constants';
import { Profile } from '../../types';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, profile: authProfile, userRole, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(authProfile);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
    }
  }, [authProfile]);

  const handleRefresh = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      const result = await ProfileService.getProfile(user.uid);
      if (result.success && result.data) {
        setProfile(result.data);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => pickImage(ImagePicker.MediaTypeOptions.Images, true) },
        { text: 'Photo Library', onPress: () => pickImage(ImagePicker.MediaTypeOptions.Images, false) },
        { text: 'Remove Photo', onPress: handleRemoveAvatar, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const pickImage = async (mediaTypes: ImagePicker.MediaTypeOptions, useCamera: boolean) => {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant permission to access camera/photos');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0] && user) {
        setUploading(true);
        const uploadResult = await ProfileService.uploadAvatar(user.uid, result.assets[0].uri);
        
        if (uploadResult.success && uploadResult.data) {
          setProfile(prev => prev ? { ...prev, avatar: uploadResult.data } : null);
          Alert.alert('Success', 'Profile picture updated successfully!');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to update profile picture');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar) return;

    try {
      setUploading(true);
      const result = await ProfileService.deleteAvatar(user.uid, profile.avatar);
      
      if (result.success) {
        setProfile(prev => prev ? { ...prev, avatar: '' } : null);
        Alert.alert('Success', 'Profile picture removed successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to remove profile picture');
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
      Alert.alert('Error', 'Failed to remove profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { profile });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const renderProfileHeader = () => (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={handleImagePicker}
          disabled={uploading}
        >
          <Image
            source={{ 
              uri: profile?.avatar || DEFAULT_IMAGES.AVATAR 
            }}
            style={styles.avatar}
          />
          <View style={[styles.cameraIcon, uploading && styles.cameraIconDisabled]}>
            <Ionicons 
              name="camera" 
              size={16} 
              color={COLORS.white} 
            />
          </View>
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <Ionicons name="refresh" size={24} color={COLORS.white} />
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{profile?.displayName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          {profile?.businessName && (
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{profile.businessName}</Text>
              {profile.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              )}
            </View>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profile?.rating || 0}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profile?.totalReviews || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{profile?.totalTransactions || 0}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const renderMenuItem = (icon: string, title: string, subtitle?: string, onPress?: () => void, showChevron: boolean = true) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIcon}>
          <Ionicons name={icon as any} size={20} color={COLORS.primary} />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      )}
    </TouchableOpacity>
  );

  if (!profile || !user) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="person-circle" size={64} color={COLORS.textSecondary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {renderProfileHeader()}
      
      <View style={styles.menuContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {renderMenuItem('person-outline', 'Edit Profile', 'Update your information', handleEditProfile)}
          {renderMenuItem('key-outline', 'Change Password', 'Update your password')}
          {renderMenuItem('location-outline', 'Delivery Addresses', 'Manage your addresses')}
          {userRole === 'seller' && renderMenuItem('card-outline', 'Payment Settings', 'Banking information')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          {renderMenuItem('notifications-outline', 'Notifications', 'Manage notifications')}
          {renderMenuItem('language-outline', 'Language', 'English (Nigeria)')}
          {renderMenuItem('moon-outline', 'Dark Mode', 'Coming soon')}
        </View>

        {userRole === 'seller' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller Tools</Text>
            {renderMenuItem('bar-chart-outline', 'Analytics', 'View your performance')}
            {renderMenuItem('cube-outline', 'Manage Products', 'Add or edit products')}
            {renderMenuItem('people-outline', 'Customer Reviews', 'See what customers say')}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          {renderMenuItem('gift-outline', 'Referral Program', 'Invite friends & earn')}
          {renderMenuItem('help-circle-outline', 'Help & Support', 'Get assistance')}
          {renderMenuItem('document-text-outline', 'Terms & Privacy', 'Legal information')}
          {renderMenuItem('star-outline', 'Rate App', 'Share your feedback')}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ready9ja Marketplace v1.0.0</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ in Nigeria</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cameraIconDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 2,
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.error,
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
});

export default ProfileScreen;
