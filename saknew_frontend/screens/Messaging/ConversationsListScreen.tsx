import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl, TextInput, Modal, Alert, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../styles/globalStyles';
import { messagingService, Conversation } from '../../services/messagingService';
import { MainNavigationProp } from '../../navigation/types';
import shopService from '../../services/shopService';
import * as Location from 'expo-location';
import { getFullImageUrl } from '../../utils/imageHelper';

const ConversationsListScreen = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyShops, setNearbyShops] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const loadConversations = async () => {
    try {
      const data = await messagingService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadNearbyShops = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      const response = await shopService.getShops(1, 50);
      const shops = response.results || [];

      const shopsWithDistance = shops.map((shop: any) => {
        if (shop.latitude && shop.longitude) {
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            shop.latitude,
            shop.longitude
          );
          return { ...shop, distance };
        }
        return { ...shop, distance: Infinity };
      });

      const nearby = shopsWithDistance
        .filter((shop: any) => shop.distance <= 100)
        .sort((a: any, b: any) => a.distance - b.distance);

      setNearbyShops(nearby);
    } catch (error) {
      console.error('Load nearby shops error:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  useFocusEffect(
    React.useCallback(() => {
      loadConversations();
      loadNearbyShops();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
    loadNearbyShops();
  };

  const filteredShops = nearbyShops.filter((shop) =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    setShowModal(false);
    if (!selectedShop) return;

    try {
      const convos = await messagingService.getConversations();
      const existingConvo = convos.find((c) => c.seller === selectedShop.user);

      if (existingConvo) {
        navigation.navigate('Chat' as any, { conversationId: existingConvo.id });
      } else {
        const newConvo = await messagingService.createConversation(selectedShop.id);
        navigation.navigate('Chat' as any, { conversationId: newConvo.id });
      }
    } catch (error) {
      console.error('handleSendMessage error:', error);
      Alert.alert('Error', 'Failed to start conversation.');
    }
  };

  const handleViewShop = () => {
    setShowModal(false);
    if (selectedShop) {
      navigation.navigate('PublicShop' as any, { shopSlug: selectedShop.slug });
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const lastMessage = item.messages[item.messages.length - 1];
    const otherParty = (item as any).other_party_name || item.seller_name;
    const hasProduct = lastMessage?.message_type === 'product_pin' && lastMessage?.product;
    const hasImage = lastMessage?.message_type === 'image' && lastMessage?.image;
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => navigation.navigate('Chat' as any, { conversationId: item.id })}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="storefront" size={24} color={colors.primary} />
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.shopName}>{otherParty}</Text>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
          {lastMessage && (
            <View>
              {hasImage && (
                <View style={styles.productPreview}>
                  <Image 
                    source={{ uri: getFullImageUrl(lastMessage.image) as string }} 
                    style={styles.productThumb}
                  />
                  <Text style={styles.productName} numberOfLines={1}>📷 Photo</Text>
                </View>
              )}
              {hasProduct && (
                <View style={styles.productPreview}>
                  <Image 
                    source={{ uri: getFullImageUrl(lastMessage.product.images?.[0]?.image || lastMessage.product.image) as string }} 
                    style={styles.productThumb}
                  />
                  <Text style={styles.productName} numberOfLines={1}>{lastMessage.product.name}</Text>
                </View>
              )}
              {!lastMessage.is_deleted && lastMessage.text && (
                <Text style={styles.lastMessage} numberOfLines={2}>
                  {lastMessage.text}
                </Text>
              )}
              {lastMessage.is_deleted && (
                <Text style={[styles.lastMessage, { fontStyle: 'italic' }]} numberOfLines={1}>
                  Message deleted
                </Text>
              )}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shops or users..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {showSuggestions && filteredShops.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Nearby Shops (within 100km)</Text>
          <FlatList
            data={filteredShops}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.suggestionItem}>
                <Ionicons name="storefront" size={20} color={colors.primary} />
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionName}>{item.name}</Text>
                  <Text style={styles.suggestionDistance}>{item.distance.toFixed(1)} km away</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedShop(item);
                    setShowModal(true);
                  }}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalOption} onPress={handleSendMessage}>
              <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
              <Text style={styles.modalOptionText}>Send Message</Text>
            </TouchableOpacity>
            <View style={styles.modalDivider} />
            <TouchableOpacity style={styles.modalOption} onPress={handleViewShop}>
              <Ionicons name="storefront-outline" size={24} color={colors.primary} />
              <Text style={styles.modalOptionText}>View Shop</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Messages will appear here when you place orders</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 32,
    fontSize: 14,
    color: colors.textPrimary,
  },
  suggestionsContainer: {
    backgroundColor: colors.card,
    maxHeight: 250,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestionContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  suggestionDistance: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: spacing.sm,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productThumb: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    marginRight: 6,
  },
  productName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    width: '80%',
    overflow: 'hidden',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginLeft: spacing.md,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});

export default ConversationsListScreen;
