import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { ChatService } from '../../services/firebase/chatService';
import { COLORS, FONTS } from '../../constants';
import { Conversation } from '../../types';

interface MessagesScreenProps {
  navigation: any;
}

const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to conversations
    const unsubscribe = ChatService.subscribeToUserConversations(user.uid, (conversationsData) => {
      setConversations(conversationsData);
      setLoading(false);
    });

    // Load unread count
    loadUnreadCount();

    return unsubscribe;
  }, [user?.uid]);

  const loadUnreadCount = async () => {
    if (!user?.uid) return;
    
    try {
      const count = await ChatService.getUnreadMessageCount(user.uid);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate('ChatRoom', { 
      conversationId: conversation.id,
      productInfo: conversation.productInfo,
      otherUserId: conversation.buyerId === user?.uid ? conversation.sellerId : conversation.buyerId,
    });
  };

  const getFilteredConversations = () => {
    if (!searchQuery.trim()) {
      return conversations;
    }

    const searchTerm = searchQuery.toLowerCase();
    return conversations.filter(conversation =>
      conversation.productInfo.name.toLowerCase().includes(searchTerm) ||
      conversation.lastMessage.toLowerCase().includes(searchTerm)
    );
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString();
  };

  const getUserRole = (conversation: Conversation) => {
    return conversation.buyerId === user?.uid ? 'buyer' : 'seller';
  };

  const renderConversationItem = ({ item: conversation }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationPress(conversation)}
    >
      <Image
        source={{
          uri: conversation.productInfo.image || 'https://via.placeholder.com/60x60?text=Product'
        }}
        style={styles.productImage}
      />
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.productName} numberOfLines={1}>
            {conversation.productInfo.name}
          </Text>
          <Text style={styles.messageTime}>
            {formatMessageTime(conversation.lastMessageTime)}
          </Text>
        </View>
        
        <View style={styles.conversationDetails}>
          <Text style={styles.roleLabel}>
            {getUserRole(conversation) === 'buyer' ? 'Selling' : 'Buying'}
          </Text>
          <Text style={styles.productPrice}>
            ₦{conversation.productInfo.price.toLocaleString()}
          </Text>
        </View>
        
        <Text style={styles.lastMessage} numberOfLines={2}>
          {conversation.lastMessage || 'No messages yet'}
        </Text>
      </View>
      
      <View style={styles.conversationActions}>
        {!conversation.isActive && (
          <View style={styles.inactiveIndicator}>
            <Ionicons name="ban" size={16} color={COLORS.error} />
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations..."
            placeholderTextColor={COLORS.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={getFilteredConversations()}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={80} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Conversations</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'No conversations match your search'
                : 'Start shopping to chat with sellers about products'
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('Marketplace')}
              >
                <Text style={styles.browseButtonText}>Browse Products</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
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
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  unreadBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  conversationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  productPrice: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.success,
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  conversationActions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  inactiveIndicator: {
    marginBottom: 8,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  browseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
});

export default MessagesScreen;
