import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';
import { ProductService } from '../../services/firebase/productService';
import { COLORS, FONTS } from '../../constants';
import { ProductCategory, Currency, ProductFormData } from '../../types';

const { width } = Dimensions.get('window');

interface AddProductScreenProps {
  navigation: any;
}

const CATEGORIES: { label: string; value: ProductCategory }[] = [
  { label: 'Food & Agriculture', value: 'food-agriculture' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Fashion', value: 'fashion' },
  { label: 'Beauty & Health', value: 'beauty-health' },
  { label: 'Home & Garden', value: 'home-garden' },
  { label: 'Sports', value: 'sports' },
  { label: 'Automotive', value: 'automotive' },
  { label: 'Books & Media', value: 'books-media' },
  { label: 'Services', value: 'services' },
  { label: 'Others', value: 'others' },
];

const AddProductScreen: React.FC<AddProductScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    category: 'others',
    price: 0,
    currency: 'NGN',
    stock: 0,
    tags: [],
    specifications: {},
    isCustomizable: false,
  });

  const [errors, setErrors] = useState<Partial<ProductFormData>>({});
  const [tagInput, setTagInput] = useState('');
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Partial<ProductFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Product title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Product description is required';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }

    if (images.length === 0) {
      Alert.alert('Missing Images', 'Please add at least one product image');
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can add up to 5 images per product');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter((_, i) => i !== index) || [],
    }));
  };

  const addSpecification = () => {
    if (specKey.trim() && specValue.trim()) {
      setFormData(prev => ({
        ...prev,
        specifications: {
          ...prev.specifications,
          [specKey.trim()]: specValue.trim(),
        },
      }));
      setSpecKey('');
      setSpecValue('');
    }
  };

  const removeSpecification = (key: string) => {
    const newSpecs = { ...formData.specifications };
    delete newSpecs[key];
    setFormData(prev => ({ ...prev, specifications: newSpecs }));
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user?.uid) return;

    setLoading(true);
    try {
      // Create product
      const productId = await ProductService.createProduct(formData, user.uid);
      
      // Upload images
      if (images.length > 0) {
        await ProductService.uploadProductImages(productId, images);
      }

      Alert.alert(
        'Success!',
        'Product added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Product</Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Images Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.imagesContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.productImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Ionicons name="camera" size={32} color={COLORS.primary} />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Product Title *</Text>
            <TextInput
              style={[styles.textInput, errors.title && styles.inputError]}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter product title"
              placeholderTextColor={COLORS.textSecondary}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.textAreaInput, errors.description && styles.inputError]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Describe your product..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Category *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                style={styles.picker}
              >
                {CATEGORIES.map((category) => (
                  <Picker.Item
                    key={category.value}
                    label={category.label}
                    value={category.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Price *</Text>
              <TextInput
                style={[styles.textInput, errors.price && styles.inputError]}
                value={formData.price.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, price: parseFloat(text) || 0 }))}
                placeholder="0"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
              />
              {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>

            <View style={[styles.inputContainer, { flex: 0.5, marginLeft: 16 }]}>
              <Text style={styles.inputLabel}>Currency</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label="NGN" value="NGN" />
                  <Picker.Item label="USD" value="USD" />
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Stock Quantity *</Text>
            <TextInput
              style={[styles.textInput, errors.stock && styles.inputError]}
              value={formData.stock.toString()}
              onChangeText={(text) => setFormData(prev => ({ ...prev, stock: parseInt(text) || 0 }))}
              placeholder="0"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
            />
            {errors.stock && <Text style={styles.errorText}>{errors.stock}</Text>}
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setFormData(prev => ({ ...prev, isCustomizable: !prev.isCustomizable }))}
          >
            <Ionicons
              name={formData.isCustomizable ? 'checkbox' : 'checkbox-outline'}
              size={24}
              color={COLORS.primary}
            />
            <Text style={styles.checkboxLabel}>This product is customizable</Text>
          </TouchableOpacity>
        </View>

        {/* Tags Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags (Optional)</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add tag"
              placeholderTextColor={COLORS.textSecondary}
              onSubmitEditing={addTag}
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
              <Text style={styles.addTagButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagsContainer}>
            {formData.tags?.map((tag, index) => (
              <TouchableOpacity
                key={index}
                style={styles.tagChip}
                onPress={() => removeTag(index)}
              >
                <Text style={styles.tagChipText}>{tag}</Text>
                <Ionicons name="close" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Specifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifications (Optional)</Text>
          <View style={styles.specInputContainer}>
            <TextInput
              style={[styles.specInput, { flex: 1 }]}
              value={specKey}
              onChangeText={setSpecKey}
              placeholder="Key (e.g., Color)"
              placeholderTextColor={COLORS.textSecondary}
            />
            <TextInput
              style={[styles.specInput, { flex: 1, marginLeft: 8 }]}
              value={specValue}
              onChangeText={setSpecValue}
              placeholder="Value (e.g., Red)"
              placeholderTextColor={COLORS.textSecondary}
              onSubmitEditing={addSpecification}
            />
            <TouchableOpacity style={styles.addSpecButton} onPress={addSpecification}>
              <Text style={styles.addSpecButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {Object.entries(formData.specifications || {}).map(([key, value]) => (
            <View key={key} style={styles.specItem}>
              <Text style={styles.specText}>{key}: {value}</Text>
              <TouchableOpacity onPress={() => removeSpecification(key)}>
                <Ionicons name="close" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.medium,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 16,
  },
  imagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    minHeight: 100,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    fontFamily: FONTS.regular,
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginLeft: 8,
  },
  tagInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  addTagButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
  },
  addTagButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.medium,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  tagChipText: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    marginRight: 4,
  },
  specInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  specInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  addSpecButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
  },
  addSpecButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.medium,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    marginBottom: 8,
  },
  specText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    flex: 1,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default AddProductScreen;
