import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './config';
import { Product, ProductCategory, SearchParams, ApiResponse } from '../../types';
import { COLLECTIONS, STORAGE_PATHS } from '../../constants';

export class ProductService {
  private static readonly PRODUCTS_COLLECTION = COLLECTIONS.PRODUCTS;
  private static readonly PRODUCTS_STORAGE_PATH = STORAGE_PATHS.PRODUCTS;

  // Create a new product
  static async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, images: string[]): Promise<ApiResponse<Product>> {
    try {
      const productRef = collection(db, this.PRODUCTS_COLLECTION);
      
      // Upload images first
      const imageUrls = await this.uploadProductImages(images, productData.sellerId);
      
      const newProduct = {
        ...productData,
        images: imageUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(productRef, newProduct);
      
      const createdProduct = {
        ...productData,
        id: docRef.id,
        images: imageUrls,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return {
        success: true,
        data: createdProduct,
        message: 'Product created successfully'
      };
    } catch (error) {
      console.error('Error creating product:', error);
      return {
        success: false,
        error: 'Failed to create product'
      };
    }
  }

  // Get product by ID
  static async getProduct(productId: string): Promise<ApiResponse<Product>> {
    try {
      const productRef = doc(db, this.PRODUCTS_COLLECTION, productId);
      const productDoc = await getDoc(productRef);

      if (!productDoc.exists()) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      const product: Product = {
        id: productDoc.id,
        ...productDoc.data()
      } as Product;

      return {
        success: true,
        data: product
      };
    } catch (error) {
      console.error('Error getting product:', error);
      return {
        success: false,
        error: 'Failed to fetch product'
      };
    }
  }

  // Update product
  static async updateProduct(productId: string, updates: Partial<Product>, newImages?: string[]): Promise<ApiResponse<Product>> {
    try {
      const productRef = doc(db, this.PRODUCTS_COLLECTION, productId);
      
      // Check if product exists
      const productDoc = await getDoc(productRef);
      if (!productDoc.exists()) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      let imageUrls = updates.images || [];

      // Upload new images if provided
      if (newImages && newImages.length > 0) {
        const currentProduct = productDoc.data() as Product;
        // Delete old images if needed
        if (currentProduct.images && currentProduct.images.length > 0) {
          await this.deleteProductImages(currentProduct.images);
        }
        imageUrls = await this.uploadProductImages(newImages, currentProduct.sellerId);
      }

      const updateData = {
        ...updates,
        ...(imageUrls.length > 0 && { images: imageUrls }),
        updatedAt: serverTimestamp()
      };

      await updateDoc(productRef, updateData);

      const updatedProduct: Product = {
        ...productDoc.data(),
        ...updates,
        id: productId,
        images: imageUrls.length > 0 ? imageUrls : productDoc.data()?.images || [],
        updatedAt: new Date()
      } as Product;

      return {
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully'
      };
    } catch (error) {
      console.error('Error updating product:', error);
      return {
        success: false,
        error: 'Failed to update product'
      };
    }
  }

  // Delete product
  static async deleteProduct(productId: string): Promise<ApiResponse<void>> {
    try {
      const productRef = doc(db, this.PRODUCTS_COLLECTION, productId);
      
      // Get product data first to delete images
      const productDoc = await getDoc(productRef);
      if (productDoc.exists()) {
        const product = productDoc.data() as Product;
        if (product.images && product.images.length > 0) {
          await this.deleteProductImages(product.images);
        }
      }

      await deleteDoc(productRef);

      return {
        success: true,
        message: 'Product deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting product:', error);
      return {
        success: false,
        error: 'Failed to delete product'
      };
    }
  }

  // Get products by seller
  static async getProductsBySeller(sellerId: string, lastDoc?: QueryDocumentSnapshot<DocumentData>): Promise<ApiResponse<{ products: Product[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }>> {
    try {
      let q = query(
        collection(db, this.PRODUCTS_COLLECTION),
        where('sellerId', '==', sellerId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (lastDoc) {
        q = query(
          collection(db, this.PRODUCTS_COLLECTION),
          where('sellerId', '==', sellerId),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const querySnapshot = await getDocs(q);
      const products: Product[] = [];
      let newLastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

      querySnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data()
        } as Product);
        newLastDoc = doc;
      });

      return {
        success: true,
        data: { products, lastDoc: newLastDoc }
      };
    } catch (error) {
      console.error('Error getting seller products:', error);
      return {
        success: false,
        error: 'Failed to fetch seller products'
      };
    }
  }

  // Search products
  static async searchProducts(searchParams: SearchParams): Promise<ApiResponse<{ products: Product[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }>> {
    try {
      let q = query(collection(db, this.PRODUCTS_COLLECTION));

      // Add filters
      if (searchParams.filters?.category) {
        q = query(q, where('category', '==', searchParams.filters.category));
      }

      if (searchParams.filters?.inStock) {
        q = query(q, where('isAvailable', '==', true), where('stock', '>', 0));
      }

      // Add sorting
      switch (searchParams.sortBy) {
        case 'price_asc':
          q = query(q, orderBy('price', 'asc'));
          break;
        case 'price_desc':
          q = query(q, orderBy('price', 'desc'));
          break;
        case 'rating':
          q = query(q, orderBy('rating', 'desc'));
          break;
        case 'popular':
          q = query(q, orderBy('totalSold', 'desc'));
          break;
        case 'newest':
        default:
          q = query(q, orderBy('createdAt', 'desc'));
          break;
      }

      q = query(q, limit(searchParams.limit || 20));

      const querySnapshot = await getDocs(q);
      const products: Product[] = [];
      let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

      querySnapshot.forEach((doc) => {
        const product = {
          id: doc.id,
          ...doc.data()
        } as Product;

        // Client-side filtering for text search and price range
        let include = true;

        if (searchParams.query) {
          const searchText = searchParams.query.toLowerCase();
          const productName = product.name.toLowerCase();
          const productDescription = product.description.toLowerCase();
          const productTags = product.tags.join(' ').toLowerCase();
          
          include = productName.includes(searchText) || 
                   productDescription.includes(searchText) || 
                   productTags.includes(searchText);
        }

        if (searchParams.filters?.minPrice && product.price < searchParams.filters.minPrice) {
          include = false;
        }

        if (searchParams.filters?.maxPrice && product.price > searchParams.filters.maxPrice) {
          include = false;
        }

        if (include) {
          products.push(product);
          lastDoc = doc;
        }
      });

      return {
        success: true,
        data: { products, lastDoc }
      };
    } catch (error) {
      console.error('Error searching products:', error);
      return {
        success: false,
        error: 'Failed to search products'
      };
    }
  }

  // Get products by category
  static async getProductsByCategory(category: ProductCategory, lastDoc?: QueryDocumentSnapshot<DocumentData>): Promise<ApiResponse<{ products: Product[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }>> {
    try {
      let q = query(
        collection(db, this.PRODUCTS_COLLECTION),
        where('category', '==', category),
        where('isAvailable', '==', true),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (lastDoc) {
        q = query(
          collection(db, this.PRODUCTS_COLLECTION),
          where('category', '==', category),
          where('isAvailable', '==', true),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const querySnapshot = await getDocs(q);
      const products: Product[] = [];
      let newLastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

      querySnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data()
        } as Product);
        newLastDoc = doc;
      });

      return {
        success: true,
        data: { products, lastDoc: newLastDoc }
      };
    } catch (error) {
      console.error('Error getting products by category:', error);
      return {
        success: false,
        error: 'Failed to fetch products by category'
      };
    }
  }

  // Get featured/recommended products
  static async getFeaturedProducts(limit: number = 10): Promise<ApiResponse<Product[]>> {
    try {
      const q = query(
        collection(db, this.PRODUCTS_COLLECTION),
        where('isAvailable', '==', true),
        orderBy('rating', 'desc'),
        orderBy('totalSold', 'desc'),
        limit(limit)
      );

      const querySnapshot = await getDocs(q);
      const products: Product[] = [];

      querySnapshot.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data()
        } as Product);
      });

      return {
        success: true,
        data: products
      };
    } catch (error) {
      console.error('Error getting featured products:', error);
      return {
        success: false,
        error: 'Failed to fetch featured products'
      };
    }
  }

  // Update product stock
  static async updateProductStock(productId: string, newStock: number): Promise<ApiResponse<void>> {
    try {
      const productRef = doc(db, this.PRODUCTS_COLLECTION, productId);
      
      await updateDoc(productRef, {
        stock: newStock,
        isAvailable: newStock > 0,
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Stock updated successfully'
      };
    } catch (error) {
      console.error('Error updating product stock:', error);
      return {
        success: false,
        error: 'Failed to update stock'
      };
    }
  }

  // Batch update multiple products
  static async batchUpdateProducts(updates: Array<{ id: string, data: Partial<Product> }>): Promise<ApiResponse<void>> {
    try {
      const batch = writeBatch(db);

      updates.forEach(({ id, data }) => {
        const productRef = doc(db, this.PRODUCTS_COLLECTION, id);
        batch.update(productRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();

      return {
        success: true,
        message: 'Products updated successfully'
      };
    } catch (error) {
      console.error('Error batch updating products:', error);
      return {
        success: false,
        error: 'Failed to update products'
      };
    }
  }

  // Private helper methods
  private static async uploadProductImages(imageUris: string[], sellerId: string): Promise<string[]> {
    const uploadPromises = imageUris.map(async (uri, index) => {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filename = `${sellerId}/${Date.now()}_${index}.jpg`;
      const imageRef = ref(storage, `${this.PRODUCTS_STORAGE_PATH}/${filename}`);
      
      await uploadBytes(imageRef, blob);
      return getDownloadURL(imageRef);
    });

    return Promise.all(uploadPromises);
  }

  private static async deleteProductImages(imageUrls: string[]): Promise<void> {
    const deletePromises = imageUrls.map(async (url) => {
      try {
        const imageRef = ref(storage, url);
        await deleteObject(imageRef);
      } catch (error) {
        console.warn('Error deleting image:', error);
        // Continue with other deletions even if one fails
      }
    });

    await Promise.allSettled(deletePromises);
  }
}
