import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  and,
  or,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Conversation, Message, UserRole } from '../../types';
import { ProductService } from './productService';

export class ChatService {
  private static CONVERSATIONS_COLLECTION = 'conversations';
  private static MESSAGES_COLLECTION = 'messages';

  // Create or get existing conversation between buyer and seller for a product
  static async createOrGetConversation(
    productId: string,
    buyerId: string,
    sellerId: string
  ): Promise<string> {
    try {
      // Check if conversation already exists
      const q = query(
        collection(db, this.CONVERSATIONS_COLLECTION),
        where('productId', '==', productId),
        where('buyerId', '==', buyerId),
        where('sellerId', '==', sellerId)
      );

      const existingConversations = await getDocs(q);

      if (!existingConversations.empty) {
        return existingConversations.docs[0].id;
      }

      // Get product info for conversation
      const product = await ProductService.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Create new conversation
      const conversationRef = await addDoc(collection(db, this.CONVERSATIONS_COLLECTION), {
        productId,
        buyerId,
        sellerId,
        productInfo: {
          name: product.title,
          image: product.images[0] || '',
          price: product.price,
        },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        isActive: true,
        createdAt: serverTimestamp(),
      });

      return conversationRef.id;
    } catch (error) {
      console.error('Error creating/getting conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  // Send a message in a conversation
  static async sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: UserRole,
    text: string,
    type: 'text' | 'image' | 'file' = 'text',
    fileUrl?: string
  ): Promise<string> {
    try {
      // Add message to messages collection
      const messageRef = await addDoc(collection(db, this.MESSAGES_COLLECTION), {
        conversationId,
        senderId,
        senderRole,
        text,
        type,
        fileUrl,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      // Update conversation with last message info
      await updateDoc(doc(db, this.CONVERSATIONS_COLLECTION, conversationId), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
      });

      return messageRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Get user's conversations (both as buyer and seller)
  static async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const q = query(
        collection(db, this.CONVERSATIONS_COLLECTION),
        or(
          where('buyerId', '==', userId),
          where('sellerId', '==', userId)
        ),
        orderBy('lastMessageTime', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastMessageTime: doc.data().lastMessageTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Conversation[];
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw new Error('Failed to get conversations');
    }
  }

  // Get messages for a conversation
  static async getConversationMessages(
    conversationId: string,
    limitCount: number = 50
  ): Promise<Message[]> {
    try {
      const q = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        }))
        .reverse() as Message[]; // Reverse to show oldest first
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      throw new Error('Failed to get messages');
    }
  }

  // Subscribe to real-time messages for a conversation
  static subscribeToConversationMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    const q = query(
      collection(db, this.MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Message[];

      callback(messages);
    });
  }

  // Subscribe to user's conversations
  static subscribeToUserConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ): () => void {
    const q = query(
      collection(db, this.CONVERSATIONS_COLLECTION),
      or(
        where('buyerId', '==', userId),
        where('sellerId', '==', userId)
      ),
      orderBy('lastMessageTime', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const conversations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastMessageTime: doc.data().lastMessageTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Conversation[];

      callback(conversations);
    });
  }

  // Mark messages as read
  static async markMessagesAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      const q = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('conversationId', '==', conversationId),
        where('senderId', '!=', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs.map(doc =>
        updateDoc(doc.ref, { isRead: true })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw new Error('Failed to mark messages as read');
    }
  }

  // Get unread message count for user
  static async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      // Get user's conversations
      const conversations = await this.getUserConversations(userId);
      
      let totalUnread = 0;
      
      // For each conversation, count unread messages not sent by this user
      for (const conversation of conversations) {
        const q = query(
          collection(db, this.MESSAGES_COLLECTION),
          where('conversationId', '==', conversation.id),
          where('senderId', '!=', userId),
          where('isRead', '==', false)
        );
        
        const querySnapshot = await getDocs(q);
        totalUnread += querySnapshot.docs.length;
      }
      
      return totalUnread;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // Get conversation by ID
  static async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const conversationDoc = await getDoc(doc(db, this.CONVERSATIONS_COLLECTION, conversationId));
      
      if (!conversationDoc.exists()) {
        return null;
      }

      return {
        id: conversationDoc.id,
        ...conversationDoc.data(),
        lastMessageTime: conversationDoc.data().lastMessageTime?.toDate(),
        createdAt: conversationDoc.data().createdAt?.toDate(),
      } as Conversation;
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw new Error('Failed to get conversation');
    }
  }

  // Search conversations by product name or user
  static async searchConversations(
    userId: string,
    searchTerm: string
  ): Promise<Conversation[]> {
    try {
      const conversations = await this.getUserConversations(userId);
      
      if (!searchTerm.trim()) {
        return conversations;
      }

      const searchTermLower = searchTerm.toLowerCase();
      
      return conversations.filter(conversation => 
        conversation.productInfo.name.toLowerCase().includes(searchTermLower)
      );
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw new Error('Failed to search conversations');
    }
  }

  // Delete conversation (for admin or in case of disputes)
  static async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Delete all messages in the conversation
      const messagesQuery = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('conversationId', '==', conversationId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const deleteMessagePromises = messagesSnapshot.docs.map(doc => 
        doc.ref.delete()
      );
      
      await Promise.all(deleteMessagePromises);
      
      // Delete the conversation
      await doc(db, this.CONVERSATIONS_COLLECTION, conversationId).delete();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  // Block/unblock a user in a conversation (sets conversation as inactive)
  static async toggleConversationStatus(
    conversationId: string,
    isActive: boolean
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.CONVERSATIONS_COLLECTION, conversationId), {
        isActive,
      });
    } catch (error) {
      console.error('Error toggling conversation status:', error);
      throw new Error('Failed to update conversation status');
    }
  }

  // Get conversation statistics for admin
  static async getConversationStatistics(): Promise<{
    totalConversations: number;
    activeConversations: number;
    messagesLastWeek: number;
    averageMessagesPerConversation: number;
  }> {
    try {
      // Get all conversations
      const conversationsSnapshot = await getDocs(collection(db, this.CONVERSATIONS_COLLECTION));
      const totalConversations = conversationsSnapshot.docs.length;
      const activeConversations = conversationsSnapshot.docs.filter(
        doc => doc.data().isActive
      ).length;

      // Get messages from last week
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const recentMessagesQuery = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('createdAt', '>=', lastWeek)
      );
      
      const recentMessagesSnapshot = await getDocs(recentMessagesQuery);
      const messagesLastWeek = recentMessagesSnapshot.docs.length;

      // Get total messages
      const allMessagesSnapshot = await getDocs(collection(db, this.MESSAGES_COLLECTION));
      const totalMessages = allMessagesSnapshot.docs.length;
      
      const averageMessagesPerConversation = totalConversations > 0 
        ? Math.round(totalMessages / totalConversations) 
        : 0;

      return {
        totalConversations,
        activeConversations,
        messagesLastWeek,
        averageMessagesPerConversation,
      };
    } catch (error) {
      console.error('Error getting conversation statistics:', error);
      throw new Error('Failed to get conversation statistics');
    }
  }
}
