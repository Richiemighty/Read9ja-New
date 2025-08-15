import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileService } from '../../services/firebase/profiles';
import { COLORS, VALIDATION, PRODUCT_CATEGORIES } from '../../constants';
import { Profile, ProductCategory } from '../../types';

interface EditProfileFormData {
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumber: string;
  address: string;
  businessName?: string;
  businessDescription?: string;
  businessCategory?: ProductCategory;
}

const editProfileSchema = yup.object({
  firstName: yup
    .string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  lastName: yup
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  displayName: yup
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .required('Display name is required'),
  phoneNumber: yup
    .string()
    .min(VALIDATION.PHONE_MIN_LENGTH, `Phone number must be at least ${VALIDATION.PHONE_MIN_LENGTH} digits`)
    .matches(/^[0-9+\-\s()]*$/, 'Invalid phone number format')
    .required('Phone number is required'),
  address: yup.string().optional(),
  businessName: yup.string().optional(),
  businessDescription: yup.string().optional(),
  businessCategory: yup.string().optional()
});

interface EditProfileScreenProps {
  navigation: any;
  route: {
    params: {
      profile: Profile;
    };
  };
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation, route }) => {
  const { profile: initialProfile } = route.params;
  const { user, userRole, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<EditProfileFormData>({
    resolver: yupResolver(editProfileSchema),
    defaultValues: {
      firstName: initialProfile.firstName || '',
      lastName: initialProfile.lastName || '',
      displayName: initialProfile.displayName || '',
      phoneNumber: initialProfile.phoneNumber || '',
      address: initialProfile.address || '',
      businessName: initialProfile.businessName || '',
      businessDescription: initialProfile.businessDescription || '',
      businessCategory: initialProfile.businessCategory || undefined
    }
  });

  const watchedBusinessCategory = watch('businessCategory');

  const onSubmit = async (data: EditProfileFormData) => {
    if (!user) return;

    try {
      setLoading(true);

      const updates: Partial<Profile> = {
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.displayName,
        phoneNumber: data.phoneNumber,
        address: data.address
      };

      if (userRole === 'seller') {
        updates.businessName = data.businessName;
        updates.businessDescription = data.businessDescription;
        updates.businessCategory = data.businessCategory;
      }

      const result = await ProfileService.updateProfile(user.uid, updates);

      if (result.success) {
        // Update auth context
        if (result.data) {
          await updateUserProfile(updates);
        }
        
        Alert.alert(
          'Success',
          'Profile updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryModal = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.categoryModal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Business Category</Text>
          <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.categoryList}>
          {Object.entries(PRODUCT_CATEGORIES).map(([key, category]) => (
            <TouchableOpacity
              key={key}
              style={styles.categoryItem}
              onPress={() => {
                setValue('businessCategory', key as ProductCategory);
                setShowCategoryModal(false);
              }}
            >
              <Ionicons name={category.icon as any} size={24} color={category.color} />
              <Text style={styles.categoryItemText}>{category.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              {/* Name Row */}
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <Controller
                    control={control}
                    name="firstName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.input, errors.firstName && styles.inputError]}
                        placeholder="First Name"
                        placeholderTextColor={COLORS.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                      />
                    )}
                  />
                  {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
                </View>

                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <Controller
                    control={control}
                    name="lastName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.input, errors.lastName && styles.inputError]}
                        placeholder="Last Name"
                        placeholderTextColor={COLORS.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                      />
                    )}
                  />
                  {errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}
                </View>
              </View>

              {/* Display Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <Controller
                  control={control}
                  name="displayName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.displayName && styles.inputError]}
                      placeholder="Display Name"
                      placeholderTextColor={COLORS.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                    />
                  )}
                />
                {errors.displayName && <Text style={styles.errorText}>{errors.displayName.message}</Text>}
              </View>

              {/* Phone Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <Controller
                  control={control}
                  name="phoneNumber"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.phoneNumber && styles.inputError]}
                      placeholder="Phone Number"
                      placeholderTextColor={COLORS.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="phone-pad"
                    />
                  )}
                />
                {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber.message}</Text>}
              </View>

              {/* Address */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Address (Optional)</Text>
                <Controller
                  control={control}
                  name="address"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.textArea}
                      placeholder="Your address..."
                      placeholderTextColor={COLORS.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  )}
                />
              </View>
            </View>

            {/* Business Information (for sellers) */}
            {userRole === 'seller' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Business Information</Text>
                
                {/* Business Name */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Business Name</Text>
                  <Controller
                    control={control}
                    name="businessName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={styles.input}
                        placeholder="Business Name"
                        placeholderTextColor={COLORS.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                      />
                    )}
                  />
                </View>

                {/* Business Category */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Business Category</Text>
                  <TouchableOpacity
                    style={styles.categorySelector}
                    onPress={() => setShowCategoryModal(true)}
                  >
                    <Text
                      style={[
                        styles.categorySelectorText,
                        !watchedBusinessCategory && styles.categorySelectorPlaceholder
                      ]}
                    >
                      {watchedBusinessCategory 
                        ? PRODUCT_CATEGORIES[watchedBusinessCategory].label 
                        : 'Select Business Category'
                      }
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Business Description */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Business Description</Text>
                  <Controller
                    control={control}
                    name="businessDescription"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={styles.textArea}
                        placeholder="Describe your business..."
                        placeholderTextColor={COLORS.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    )}
                  />
                </View>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? [COLORS.gray[400], COLORS.gray[500]] : [COLORS.secondary, COLORS.accent]}
                style={styles.saveButtonGradient}
              >
                {loading ? (
                  <Text style={styles.saveButtonText}>Saving...</Text>
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Modal */}
      {showCategoryModal && renderCategoryModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  textArea: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    height: 100,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: 4,
  },
  categorySelector: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  categorySelectorText: {
    fontSize: 16,
    color: COLORS.text,
  },
  categorySelectorPlaceholder: {
    color: COLORS.textSecondary,
  },
  saveButton: {
    borderRadius: 12,
    marginTop: 20,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  categoryModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  categoryItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: COLORS.text,
  },
});

export default EditProfileScreen;
