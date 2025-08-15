import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, ERROR_MESSAGES, VALIDATION, PRODUCT_CATEGORIES } from '../../constants';
import { UserRole, ProductCategory } from '../../types';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  businessName?: string;
  businessDescription?: string;
  businessCategory?: ProductCategory;
  referralCode?: string;
}

const registerSchema = yup.object({
  firstName: yup
    .string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  lastName: yup
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  email: yup
    .string()
    .email('Invalid email address')
    .required('Email is required'),
  phoneNumber: yup
    .string()
    .min(VALIDATION.PHONE_MIN_LENGTH, `Phone number must be at least ${VALIDATION.PHONE_MIN_LENGTH} digits`)
    .matches(/^[0-9+\-\s()]*$/, 'Invalid phone number format')
    .required('Phone number is required'),
  password: yup
    .string()
    .min(VALIDATION.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
  businessName: yup.string().when('role', {
    is: 'seller',
    then: (schema) => schema.required('Business name is required for sellers'),
    otherwise: (schema) => schema.optional()
  }),
  businessDescription: yup.string().when('role', {
    is: 'seller',
    then: (schema) => schema.min(10, 'Business description must be at least 10 characters'),
    otherwise: (schema) => schema.optional()
  }),
  businessCategory: yup.string().when('role', {
    is: 'seller',
    then: (schema) => schema.required('Business category is required for sellers'),
    otherwise: (schema) => schema.optional()
  }),
  referralCode: yup.string().optional()
});

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const { signUp } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      businessName: '',
      businessDescription: '',
      businessCategory: undefined,
      referralCode: ''
    }
  });

  const watchedBusinessCategory = watch('businessCategory');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true);
      
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: `${data.firstName} ${data.lastName}`,
        phoneNumber: data.phoneNumber,
        businessName: selectedRole === 'seller' ? data.businessName : undefined,
        businessDescription: selectedRole === 'seller' ? data.businessDescription : undefined,
        businessCategory: selectedRole === 'seller' ? data.businessCategory : undefined,
        referredBy: data.referralCode || undefined
      };

      await signUp(data.email, data.password, userData, selectedRole);
      reset();
      
      Alert.alert(
        'Registration Successful',
        `Welcome to Ready9ja Marketplace! You've been registered as a ${selectedRole}.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = ERROR_MESSAGES.GENERIC;
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const renderRoleSelector = () => (
    <View style={styles.roleSelectorContainer}>
      <Text style={styles.roleSelectorLabel}>I want to:</Text>
      <View style={styles.roleButtons}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === 'buyer' && styles.roleButtonSelected
          ]}
          onPress={() => setSelectedRole('buyer')}
        >
          <Ionicons
            name="bag-outline"
            size={24}
            color={selectedRole === 'buyer' ? COLORS.white : COLORS.primary}
          />
          <Text
            style={[
              styles.roleButtonText,
              selectedRole === 'buyer' && styles.roleButtonTextSelected
            ]}
          >
            Buy Products
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === 'seller' && styles.roleButtonSelected
          ]}
          onPress={() => setSelectedRole('seller')}
        >
          <Ionicons
            name="storefront-outline"
            size={24}
            color={selectedRole === 'seller' ? COLORS.white : COLORS.primary}
          />
          <Text
            style={[
              styles.roleButtonText,
              selectedRole === 'seller' && styles.roleButtonTextSelected
            ]}
          >
            Sell Products
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent={true}
      animationType="slide"
    >
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
    </Modal>
  );

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleLogin} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Account</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Role Selector */}
            {renderRoleSelector()}

            {/* Personal Information */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              {/* Name Row */}
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
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
                </View>

                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
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
                </View>
              </View>
              {(errors.firstName || errors.lastName) && (
                <Text style={styles.errorText}>
                  {errors.firstName?.message || errors.lastName?.message}
                </Text>
              )}

              {/* Email */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.email && styles.inputError]}
                      placeholder="Email Address"
                      placeholderTextColor={COLORS.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  )}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

              {/* Phone */}
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
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
              </View>
              {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber.message}</Text>}
            </View>

            {/* Business Information (for sellers) */}
            {selectedRole === 'seller' && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Business Information</Text>
                
                {/* Business Name */}
                <View style={styles.inputContainer}>
                  <Ionicons name="business-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <Controller
                    control={control}
                    name="businessName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.input, errors.businessName && styles.inputError]}
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
                {errors.businessName && <Text style={styles.errorText}>{errors.businessName.message}</Text>}

                {/* Business Category */}
                <TouchableOpacity
                  style={[styles.inputContainer, errors.businessCategory && styles.inputError]}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <Ionicons name="grid-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <Text
                    style={[
                      styles.input,
                      { paddingTop: 15 },
                      !watchedBusinessCategory && { color: COLORS.textSecondary }
                    ]}
                  >
                    {watchedBusinessCategory 
                      ? PRODUCT_CATEGORIES[watchedBusinessCategory].label 
                      : 'Select Business Category'
                    }
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {errors.businessCategory && <Text style={styles.errorText}>{errors.businessCategory.message}</Text>}

                {/* Business Description */}
                <View style={styles.inputContainer}>
                  <Controller
                    control={control}
                    name="businessDescription"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.textArea, errors.businessDescription && styles.inputError]}
                        placeholder="Describe your business..."
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
                {errors.businessDescription && <Text style={styles.errorText}>{errors.businessDescription.message}</Text>}
              </View>
            )}

            {/* Security */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Security</Text>
              
              {/* Password */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.password && styles.inputError]}
                      placeholder="Password"
                      placeholderTextColor={COLORS.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  )}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.confirmPassword && styles.inputError]}
                      placeholder="Confirm Password"
                      placeholderTextColor={COLORS.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  )}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}

              {/* Referral Code */}
              <View style={styles.inputContainer}>
                <Ionicons name="gift-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <Controller
                  control={control}
                  name="referralCode"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Referral Code (Optional)"
                      placeholderTextColor={COLORS.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="characters"
                    />
                  )}
                />
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? [COLORS.gray[400], COLORS.gray[500]] : [COLORS.secondary, COLORS.accent]}
                style={styles.registerButtonGradient}
              >
                {loading ? (
                  <Text style={styles.registerButtonText}>Creating Account...</Text>
                ) : (
                  <Text style={styles.registerButtonText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={handleLogin}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderCategoryModal()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  formContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 30,
    flex: 1,
  },
  roleSelectorContainer: {
    marginBottom: 30,
  },
  roleSelectorLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  roleButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  roleButtonTextSelected: {
    color: COLORS.white,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    flex: 1,
    height: 100,
    fontSize: 16,
    color: COLORS.text,
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  registerButton: {
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
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

export default RegisterScreen;
