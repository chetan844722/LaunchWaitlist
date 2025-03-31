import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  GAMES: 'games',
  MATCHES: 'matches',
  TRANSACTIONS: 'transactions',
  CHATS: 'chats',
  MESSAGES: 'messages',
  REFERRALS: 'referrals',
  NOTIFICATIONS: 'notifications'
};

/**
 * Create a user document in Firestore
 * 
 * @param userId User ID from your backend
 * @param userData User data to store
 */
export const createUserDocument = async (userId: number, userData: any) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId.toString());
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error creating user document:', error);
    return false;
  }
};

/**
 * Update a user document in Firestore
 * 
 * @param userId User ID 
 * @param userData Data to update
 */
export const updateUserDocument = async (userId: number, userData: any) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId.toString());
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating user document:', error);
    return false;
  }
};

/**
 * Get a user document from Firestore
 * 
 * @param userId User ID
 */
export const getUserDocument = async (userId: number) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId.toString());
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user document:', error);
    return null;
  }
};

/**
 * Create a chat room between users
 * 
 * @param userIds Array of user IDs in the chat
 * @param chatName Optional chat name
 */
export const createChatRoom = async (userIds: number[], chatName?: string) => {
  try {
    const chatRef = collection(db, COLLECTIONS.CHATS);
    const newChat = await addDoc(chatRef, {
      participants: userIds,
      name: chatName || '',
      createdAt: serverTimestamp(),
      lastMessage: null,
      lastMessageTime: null
    });
    
    return { id: newChat.id };
  } catch (error) {
    console.error('Error creating chat room:', error);
    return null;
  }
};

/**
 * Send a message in a chat room
 * 
 * @param chatId Chat room ID
 * @param senderId Sender's user ID
 * @param message Message content
 * @param messageType Type of message (text, image, etc)
 */
export const sendMessage = async (
  chatId: string, 
  senderId: number, 
  message: string,
  messageType: 'text' | 'image' | 'system' = 'text'
) => {
  try {
    const messageRef = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
    
    const newMessage = await addDoc(messageRef, {
      senderId,
      content: message,
      type: messageType,
      timestamp: serverTimestamp(),
      read: false
    });
    
    // Update chat with last message
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    await updateDoc(chatRef, {
      lastMessage: message,
      lastMessageTime: serverTimestamp()
    });
    
    return { id: newMessage.id };
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};

/**
 * Get messages from a chat room with real-time updates
 * 
 * @param chatId Chat room ID
 * @param callback Function to call with updated messages
 */
export const subscribeToMessages = (chatId: string, callback: (messages: any[]) => void) => {
  try {
    const messagesRef = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(messages);
    });
  } catch (error) {
    console.error('Error subscribing to messages:', error);
    return () => {};
  }
};

/**
 * Create a notification for a user
 * 
 * @param userId User to notify
 * @param title Notification title
 * @param body Notification body
 * @param type Notification type
 * @param data Additional data
 */
export const createNotification = async (
  userId: number,
  title: string,
  body: string,
  type: 'game' | 'system' | 'chat' | 'transaction',
  data?: any
) => {
  try {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    
    await addDoc(notificationsRef, {
      userId,
      title,
      body,
      type,
      data,
      read: false,
      createdAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

/**
 * Subscribe to user's notifications with real-time updates
 * 
 * @param userId User ID
 * @param callback Function to call with updated notifications
 */
export const subscribeToNotifications = (userId: number, callback: (notifications: any[]) => void) => {
  try {
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const notificationsQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    return onSnapshot(notificationsQuery, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(notifications);
    });
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return () => {};
  }
};

/**
 * Mark a notification as read
 * 
 * @param notificationId Notification ID
 */
export const markNotificationRead = async (notificationId: string) => {
  try {
    const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await updateDoc(notificationRef, { read: true });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Track a user referral in Firestore
 * 
 * @param referrerId User who referred
 * @param referredId User who was referred
 * @param status Referral status
 */
export const trackReferralInFirestore = async (
  referrerId: number,
  referredId: number,
  status: 'pending' | 'completed' = 'pending'
) => {
  try {
    const referralsRef = collection(db, COLLECTIONS.REFERRALS);
    
    await addDoc(referralsRef, {
      referrerId,
      referredId,
      status,
      createdAt: serverTimestamp(),
      completedAt: status === 'completed' ? serverTimestamp() : null,
      reward: status === 'completed' ? 50 : 0 // Example reward amount
    });
    
    return true;
  } catch (error) {
    console.error('Error tracking referral:', error);
    return false;
  }
};