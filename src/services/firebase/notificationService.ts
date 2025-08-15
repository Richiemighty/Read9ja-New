import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Notification, NotificationType } from '../../types';

export class NotificationService {
  private static COLLECTION = 'notifications';

  // Send notification to user
  static async sendNotification(
    userId: string,
    notificationData: {
      title: string;
      message: string;
      type: NotificationType;
      data?: Record<string, any>;
    }
  ): Promise<string> {
    try {
      const notificationRef = await addDoc(collection(db, this.COLLECTION), {
        userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        data: notificationData.data || {},
        isRead: false,
        createdAt: serverTimestamp(),
      });

      // Here you would also send a push notification using Firebase Cloud Messaging
      // await this.sendPushNotification(userId, notificationData);

      return notificationRef.id;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw new Error('Failed to send notification');
    }
  }

  // Get user notifications
  static async getUserNotifications(
    userId: string,
    limitCount: number = 50
  ): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Notification[];
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw new Error('Failed to get notifications');
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION, notificationId), {
        isRead: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  // Mark all notifications as read for user
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs.map(doc =>
        updateDoc(doc.ref, { isRead: true })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Subscribe to user notifications
  static subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): () => void {
    const q = query(
      collection(db, this.COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Notification[];

      callback(notifications);
    });
  }

  // Send push notification (placeholder for FCM integration)
  private static async sendPushNotification(
    userId: string,
    notificationData: {
      title: string;
      message: string;
      type: NotificationType;
      data?: Record<string, any>;
    }
  ): Promise<void> {
    // This would integrate with Firebase Cloud Messaging
    // For now, it's just a placeholder
    console.log('Push notification would be sent:', { userId, notificationData });
  }
}
