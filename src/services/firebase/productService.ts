import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { Product, ProductFormData } from '../../types';

export class ProductService {
  private static COLLECTION = 'products';
  private static STORAGE_PATH = 'products';

  // Create a new product
  static async createProduct(productData: ProductFormData, sellerId: string): Promise<string> {
    try {
      const productRef = await addDoc(collection(db, this.COLLECTION), {
        ...productData,
        sellerId,
        images: [], // Will be updated after image upload
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
        views: 0,
        orders: 0,
        rating: 0,
        reviewCount: 0
      });

      return productRef.id;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error('Failed to create product');
    }
  }

  // Upload product images
  static async uploadProductImages(productId: string, imageUris: string[]): Promise<string[]> {
    try {
      const uploadPromises = imageUris.map(async (uri, index) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        const imageName = `${productId}_${index}_${Date.now()}.jpg`;
        const imageRef = ref(storage, `${this.STORAGE_PATH}/${productId}/${imageName}`);
        
        await uploadBytes(imageRef, blob);
        return await getDownloadURL(imageRef);
      });

      const imageUrls = await Promise.all(uploadPromises);
      
      // Update product with image URLs
      await updateDoc(doc(db, this.COLLECTION, productId), {
        images: imageUrls,
        updatedAt: serverTimestamp()
      });

      return imageUrls;
    } catch (error) {
      console.error('Error uploading product images:', error);
      throw new Error('Failed to upload product images');
    }
  }

  // Get product by ID
  static async getProduct(productId: string): Promise<Product | null> {
    try {
      const productDoc = await getDoc(doc(db, this.COLLECTION, productId));
      
      if (!productDoc.exists()) {
        return null;
      }

      return {
        id: productDoc.id,
        ...productDoc.data()
      } as Product;
    } catch (error) {
      console.error('Error getting product:', error);
      throw new Error('Failed to get product');
    }
  }

  // Get products with pagination and filtering
  static async getProducts(options: {
    category?: string;
    sellerId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: 'createdAt' | 'price' | 'rating' | 'views';
    sortOrder?: 'asc' | 'desc';
    limitCount?: number;
    lastDoc?: QueryDocumentSnapshot<DocumentData>;
  } = {}): Promise<{
    products: Product[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    try {
      let q = query(collection(db, this.COLLECTION));

      // Apply filters
      if (options.category) {
        q = query(q, where('category', '==', options.category));
      }

      if (options.sellerId) {
        q = query(q, where('sellerId', '==', options.sellerId));
      }

      if (options.inStock !== undefined) {
        if (options.inStock) {
          q = query(q, where('stock', '>', 0));
        } else {
          q = query(q, where('stock', '==', 0));
        }
      }

      if (options.minPrice !== undefined) {
        q = query(q, where('price', '>=', options.minPrice));
      }

      if (options.maxPrice !== undefined) {
        q = query(q, where('price', '<=', options.maxPrice));
      }

      // Add sorting
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';
      q = query(q, orderBy(sortBy, sortOrder));

      // Add pagination
      if (options.lastDoc) {
        q = query(q, startAfter(options.lastDoc));
      }

      const limitCount = options.limitCount || 20;
      q = query(q, limit(limitCount + 1)); // Get one extra to check if there are more

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;
      
      const hasMore = docs.length > limitCount;
      const products = docs.slice(0, limitCount).map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      // Filter by search term if provided (client-side filtering for now)
      let filteredProducts = products;
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        filteredProducts = products.filter(product => 
          product.title.toLowerCase().includes(searchTerm) ||
          product.description.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm)
        );
      }

      return {
        products: filteredProducts,
        lastDoc: hasMore ? docs[docs.length - 2] : null,
        hasMore: hasMore && filteredProducts.length === limitCount
      };
    } catch (error) {
      console.error('Error getting products:', error);
      throw new Error('Failed to get products');
    }
  }

  // Update product
  static async updateProduct(productId: string, updates: Partial<ProductFormData>): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION, productId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Failed to update product');
    }
  }

  // Delete product
  static async deleteProduct(productId: string): Promise<void> {
    try {
      const product = await this.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Delete product images from storage
      if (product.images && product.images.length > 0) {
        const deletePromises = product.images.map(async (imageUrl) => {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.warn('Error deleting image:', error);
          }
        });
        await Promise.all(deletePromises);
      }

      // Delete product document
      await deleteDoc(doc(db, this.COLLECTION, productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product');
    }
  }

  // Update product stock
  static async updateStock(productId: string, quantity: number, operation: 'add' | 'subtract'): Promise<void> {
    try {
      const increment_value = operation === 'add' ? quantity : -quantity;
      await updateDoc(doc(db, this.COLLECTION, productId), {
        stock: increment(increment_value),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      throw new Error('Failed to update stock');
    }
  }

  // Increment product views
  static async incrementViews(productId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION, productId), {
        views: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing views:', error);
      // Don't throw error for views increment failure
    }
  }

  // Update product rating
  static async updateProductRating(productId: string, newRating: number): Promise<void> {
    try {
      const product = await this.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const currentRating = product.rating || 0;
      const currentReviewCount = product.reviewCount || 0;
      
      const newReviewCount = currentReviewCount + 1;
      const updatedRating = ((currentRating * currentReviewCount) + newRating) / newReviewCount;

      await updateDoc(doc(db, this.COLLECTION, productId), {
        rating: Math.round(updatedRating * 10) / 10, // Round to 1 decimal place
        reviewCount: newReviewCount,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating product rating:', error);
      throw new Error('Failed to update product rating');
    }
  }

  // Get seller's products with analytics
  static async getSellerProductsWithAnalytics(sellerId: string): Promise<{
    products: Product[];
    analytics: {
      totalProducts: number;
      totalViews: number;
      totalOrders: number;
      averageRating: number;
      lowStockProducts: number;
      outOfStockProducts: number;
    };
  }> {
    try {
      const { products } = await this.getProducts({ 
        sellerId, 
        limitCount: 1000,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      const analytics = {
        totalProducts: products.length,
        totalViews: products.reduce((sum, product) => sum + (product.views || 0), 0),
        totalOrders: products.reduce((sum, product) => sum + (product.orders || 0), 0),
        averageRating: products.length > 0 
          ? Math.round((products.reduce((sum, product) => sum + (product.rating || 0), 0) / products.length) * 10) / 10
          : 0,
        lowStockProducts: products.filter(product => product.stock > 0 && product.stock <= 10).length,
        outOfStockProducts: products.filter(product => product.stock === 0).length,
      };

      return { products, analytics };
    } catch (error) {
      console.error('Error getting seller products with analytics:', error);
      throw new Error('Failed to get seller products with analytics');
    }
  }

  // Search products
  static async searchProducts(searchTerm: string, options: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    limitCount?: number;
  } = {}): Promise<Product[]> {
    try {
      const { products } = await this.getProducts({
        ...options,
        search: searchTerm
      });

      return products;
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error('Failed to search products');
    }
  }

  // Get featured products (high rating, high views)
  static async getFeaturedProducts(limitCount: number = 10): Promise<Product[]> {
    try {
      const { products } = await this.getProducts({
        sortBy: 'rating',
        sortOrder: 'desc',
        limitCount,
        inStock: true
      });

      return products;
    } catch (error) {
      console.error('Error getting featured products:', error);
      throw new Error('Failed to get featured products');
    }
  }
}
