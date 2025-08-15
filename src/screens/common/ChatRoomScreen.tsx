import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { ChatService } from '../../services/firebase/chatService';
import { COLORS, FONTS } from '../../constants';
import { Message } from '../../types';

interface ChatRoomScreenProps {
  navigation: any;
  route: {
    params: {
      conversationId: string;
      productInfo: {
        name: string;
        image: string;
        price: number;
      };
      otherUserId: string;
    };
  };
}

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ navigation, route }) => {
  const { conversationId, productInfo, otherUserId } = route.params;
  const { user, userRole } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to real-time messages
    const unsubscribe = ChatService.subscribeToConversationMessages(
      conversationId,
      (messagesData) => {
        setMessages(messagesData);
        setLoading(false);
        
        // Mark messages as read
        if (user?.uid) {
          ChatService.markMessagesAsRead(conversationId, user.uid);
        }
        
        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return unsubscribe;
  }, [conversationId, user?.uid]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user?.uid || !userRole || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      await ChatService.sendMessage(
        conversationId,
        user.uid,
        userRole,
        text
      );
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setMessageText(text); // Restore message text on error
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const isMyMessage = (message: Message) => {
    return message.senderId === user?.uid;
  };

  const renderMessage = ({ item: message, index }: { item: Message; index: number }) => {
    const isMine = isMyMessage(message);
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showTimestamp = !previousMessage || 
      (new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime()) > 60000; // 1 minute

    return (
      <View style={[
        styles.messageContainer,
        isMine ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isMine ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMine ? styles.myMessageText : styles.otherMessageText
          ]}>
            {message.text}
          </Text>
          
          {showTimestamp && (
            <Text style={[
              styles.messageTime,
              isMine ? styles.myMessageTime : styles.otherMessageTime
            ]}>
              {formatMessageTime(message.createdAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderProductHeader = () => (
    <View style={styles.productHeader}>
      <Image
        source={{
          uri: productInfo.image || 'https://via.placeholder.com/50x50?text=Product'
        }}
        style={styles.productHeaderImage}
      />
      <View style={styles.productHeaderInfo}>
        <Text style={styles.productHeaderName} numberOfLines={1}>
          {productInfo.name}
        </Text>
        <Text style={styles.productHeaderPrice}>
          ₦{productInfo.price.toLocaleString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.productViewButton}
        onPress={() => navigation.navigate('ProductDetails', { productId: 'product-id' })}
      >
        <Text style={styles.productViewButtonText}>View</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {productInfo.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            {userRole === 'buyer' ? 'Seller' : 'Buyer'}
          </Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {renderProductHeader()}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyMessagesContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyMessagesText}>
              Start the conversation about this product
            </Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    marginBottom: 8,
  },
  productHeaderImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  productHeaderInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  productHeaderName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  productHeaderPrice: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  productViewButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  productViewButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  messagesContainer: {
    flexGrow: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 8,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    lineHeight: 22,
  },
  myMessageText: {
    color: COLORS.white,
  },
  otherMessageText: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: COLORS.textSecondary,
  },
  emptyMessagesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyMessagesText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
});

export default ChatRoomScreen;
