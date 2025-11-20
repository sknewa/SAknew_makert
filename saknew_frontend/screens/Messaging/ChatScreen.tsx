import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert, Modal, Dimensions, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../../styles/globalStyles';
import { messagingService, Message } from '../../services/messagingService';
import { useAuth } from '../../context/AuthContext.minimal';
import { getFullImageUrl } from '../../utils/imageHelper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ChatScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { conversationId, orderId, shopId, pinnedProduct } = route.params as { conversationId: number; orderId?: number | string; shopId?: number; pinnedProduct?: any };
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState(pinnedProduct ? `I'm interested in ${pinnedProduct.name}` : '');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachedProduct, setAttachedProduct] = useState(pinnedProduct || null);
  const [attachedImage, setAttachedImage] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [fullImageUri, setFullImageUri] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [attachedOrder, setAttachedOrder] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    console.log('=== CHAT SCREEN MOUNT ===');
    console.log('Route params:', route.params);
    console.log('Order ID:', orderId);
    if (orderId) {
      console.log('Setting attached order:', orderId);
      setAttachedOrder({ id: orderId });
      setNewMessage(`I have a question about Order #${String(orderId).slice(-8)}`);
    }
  }, [orderId]);

  const loadMessages = async () => {
    try {
      const conversation = await messagingService.getConversation(conversationId);
      setMessages(conversation.messages);
      await messagingService.markAsRead(conversationId);
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachedImage) || sending) return;
    
    setSending(true);
    try {
      let messageType = 'text';
      if (attachedImage) messageType = 'image';
      else if (attachedProduct) messageType = 'product_pin';
      else if (attachedOrder) messageType = 'order_pin';

      await messagingService.sendMessage(
        conversationId, 
        newMessage.trim() || 'Image',
        messageType,
        attachedProduct?.id,
        attachedImage,
        attachedOrder?.id
      );
      setNewMessage('');
      setAttachedProduct(null);
      setAttachedImage(null);
      setAttachedOrder(null);
      await loadMessages();
      flatListRef.current?.scrollToEnd();
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      
      // For web, fetch the blob
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        const filename = `image_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        setAttachedImage(file);
      } else {
        const filename = uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        setAttachedImage({ uri, name: filename, type });
      }
    }
  };

  const handleDeleteMessage = (messageId: number) => {
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await messagingService.deleteMessage(messageId);
            await loadMessages();
          } catch (error) {
            console.error('Delete error:', error);
          }
        },
      },
    ]);
  };

  const handleBlockUser = () => {
    Alert.alert('Block User', 'Are you sure you want to block this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await messagingService.blockUser(conversationId);
            Alert.alert('Success', 'User blocked');
            navigation.goBack();
          } catch (error) {
            console.error('Block error:', error);
          }
        },
      },
    ]);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender === user?.id;
    const isSystem = item.message_type === 'system' || item.message_type === 'order_update';

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }

    if (item.is_deleted) {
      return (
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage, { opacity: 0.5 }]}>
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText, { fontStyle: 'italic' }]}>
            {item.text}
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.theirMessage]}
        onLongPress={() => isMyMessage && handleDeleteMessage(item.id)}
      >
        {item.message_type === 'image' && (
          <TouchableOpacity onPress={() => item.image && setFullImageUri(getFullImageUrl(item.image) as string)}>
            {item.image ? (
              <Image 
                source={{ uri: getFullImageUrl(item.image) as string }} 
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.messageText}>No image data</Text>
            )}
          </TouchableOpacity>
        )}
        {item.message_type === 'product_pin' && (
          <TouchableOpacity onPress={() => item.product && setSelectedProduct(item.product)}>
            {item.product ? (
              <View style={styles.pinnedProductInMessage}>
                <Image 
                  source={{ uri: getFullImageUrl(item.product.images?.[0]?.image || item.product.image) as string }} 
                  style={styles.pinnedProductImage}
                />
                <View style={styles.pinnedProductInfo}>
                  <Text style={[styles.pinnedProductName, isMyMessage && { color: 'white' }]} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <Text style={[styles.pinnedProductPrice, isMyMessage && { color: 'rgba(255,255,255,0.9)' }]}>
                    R{item.product.price}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={isMyMessage ? 'rgba(255,255,255,0.7)' : colors.textSecondary} />
              </View>
            ) : (
              <Text style={styles.messageText}>Product not available</Text>
            )}
          </TouchableOpacity>
        )}
        {item.message_type === 'order_pin' && (
          <TouchableOpacity onPress={() => item.order && setSelectedOrder(item.order)}>
            {item.order ? (
              <View style={styles.pinnedOrderInMessage}>
                <View style={styles.orderHeader}>
                  <Ionicons name="receipt" size={20} color={isMyMessage ? 'white' : colors.primary} />
                  <Text style={[styles.orderTitle, isMyMessage && { color: 'white' }]}>
                    Order #{String(item.order.id).slice(-8)}
                  </Text>
                </View>
                {item.order.items?.filter((orderItem: any) => !shopId || orderItem.product.shop === shopId).map((orderItem: any, idx: number) => (
                  <View key={idx} style={styles.orderItemRow}>
                    <Image 
                      source={{ uri: getFullImageUrl(orderItem.product.main_image_url) as string }} 
                      style={styles.orderItemImage}
                    />
                    <View style={styles.orderItemInfo}>
                      <Text style={[styles.orderItemName, isMyMessage && { color: 'white' }]} numberOfLines={1}>
                        {orderItem.product.name}
                      </Text>
                      <Text style={[styles.orderItemQty, isMyMessage && { color: 'rgba(255,255,255,0.8)' }]}>
                        Qty: {orderItem.quantity} × R{orderItem.price}
                      </Text>
                    </View>
                  </View>
                ))}

                <Ionicons name="chevron-forward" size={16} color={isMyMessage ? 'rgba(255,255,255,0.7)' : colors.textSecondary} style={{ alignSelf: 'flex-end' }} />
              </View>
            ) : (
              <Text style={styles.messageText}>Order not available</Text>
            )}
          </TouchableOpacity>
        )}
        {item.text && item.message_type !== 'image' && (
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>{item.text}</Text>
        )}
        <Text style={[styles.timestamp, isMyMessage && styles.myTimestamp]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity onPress={() => setShowOptions(true)}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        <View style={styles.inputContainer}>
          {attachedImage && (
            <View style={styles.attachedProduct}>
              <Image source={{ uri: Platform.OS === 'web' ? URL.createObjectURL(attachedImage as any) : (attachedImage as any).uri }} style={styles.productImage} />
              <Text style={styles.productName}>Image attached</Text>
              <TouchableOpacity onPress={() => setAttachedImage(null)} style={styles.removeButton}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          {attachedProduct && (
            <View style={styles.attachedProduct}>
              <Image 
                source={{ uri: getFullImageUrl(attachedProduct.image) as string }} 
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{attachedProduct.name}</Text>
                <Text style={styles.productPrice}>R{attachedProduct.price}</Text>
              </View>
              <TouchableOpacity onPress={() => setAttachedProduct(null)} style={styles.removeButton}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          {attachedOrder && (
            <View style={styles.attachedProduct}>
              <View style={[styles.productImage, { backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="receipt-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>Order #{String(attachedOrder.id).slice(-8)}</Text>
                <Text style={styles.productPrice}>Order Reference</Text>
              </View>
              <TouchableOpacity onPress={() => setAttachedOrder(null)} style={styles.removeButton}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
              <Ionicons name="image" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#B0B0B0"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, ((!newMessage.trim() && !attachedImage) || sending) && styles.sendButtonDisabled]} 
              onPress={handleSend}
              disabled={(!newMessage.trim() && !attachedImage) || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showOptions} transparent animationType="fade" onRequestClose={() => setShowOptions(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptions(false)}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalOption} onPress={handleBlockUser}>
              <Ionicons name="ban" size={24} color={colors.error} />
              <Text style={[styles.modalOptionText, { color: colors.error }]}>Block User</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!fullImageUri} transparent animationType="fade" onRequestClose={() => setFullImageUri(null)}>
        <View style={styles.fullImageModal}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setFullImageUri(null)}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
          {fullImageUri && (
            <Image 
              source={{ uri: fullImageUri }} 
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      <Modal visible={!!selectedOrder} transparent animationType="fade" onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.productModalOverlay}>
          <View style={styles.productModal}>
            <View style={styles.productModalHeader}>
              <Text style={styles.productModalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {selectedOrder && (
              <ScrollView style={styles.productModalContent}>
                <View style={styles.orderModalHeader}>
                  <Text style={styles.orderModalId}>Order #{String(selectedOrder.id).slice(-8)}</Text>
                  <Text style={styles.orderModalStatus}>{selectedOrder.order_status}</Text>
                </View>
                <Text style={styles.orderModalDate}>
                  {new Date(selectedOrder.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                
                <View style={styles.orderItemsSection}>
                  {selectedOrder.items?.filter((orderItem: any) => !shopId || orderItem.product.shop === shopId).map((orderItem: any, idx: number) => (
                    <View key={idx} style={styles.orderModalItem}>
                      <Image 
                        source={{ uri: getFullImageUrl(orderItem.product.main_image_url) as string }} 
                        style={styles.orderModalItemImage}
                      />
                      <View style={styles.orderModalItemInfo}>
                        <Text style={styles.orderModalItemName}>{orderItem.product.name}</Text>
                        <Text style={styles.orderModalItemQty}>Qty: {orderItem.quantity}</Text>
                        <Text style={styles.orderModalItemPrice}>R{orderItem.price} each</Text>
                      </View>
                      <Text style={styles.orderModalItemTotal}>R{(orderItem.quantity * parseFloat(orderItem.price)).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.orderModalTotal}>
                  <Text style={styles.orderModalTotalLabel}>Total:</Text>
                  <Text style={styles.orderModalTotalAmount}>R{selectedOrder.total_price}</Text>
                </View>

                {selectedOrder.shipping_address && (
                  <View style={styles.orderModalAddress}>
                    <Text style={styles.orderModalAddressTitle}>Shipping Address</Text>
                    <Text style={styles.orderModalAddressText}>{selectedOrder.shipping_address.address_line1}</Text>
                    {selectedOrder.shipping_address.address_line2 && (
                      <Text style={styles.orderModalAddressText}>{selectedOrder.shipping_address.address_line2}</Text>
                    )}
                    <Text style={styles.orderModalAddressText}>
                      {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.postal_code}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedProduct} transparent animationType="fade" onRequestClose={() => setSelectedProduct(null)}>
        <View style={styles.productModalOverlay}>
          <View style={styles.productModal}>
            <View style={styles.productModalHeader}>
              <Text style={styles.productModalTitle}>Product Details</Text>
              <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {selectedProduct && (
              <ScrollView style={styles.productModalContent}>
                <Image 
                  source={{ uri: getFullImageUrl(selectedProduct.images?.[0]?.image || selectedProduct.image) as string }} 
                  style={styles.productModalImage}
                  resizeMode="cover"
                />
                <View style={styles.productModalInfo}>
                  <Text style={styles.productModalName}>{selectedProduct.name}</Text>
                  <Text style={styles.productModalPrice}>R{selectedProduct.price}</Text>
                  {selectedProduct.description && (
                    <Text style={styles.productModalDescription}>{selectedProduct.description}</Text>
                  )}
                  
                  {selectedProduct.reviews && selectedProduct.reviews.length > 0 && (
                    <View style={styles.reviewsSection}>
                      <Text style={styles.reviewsTitle}>Reviews ({selectedProduct.reviews.length})</Text>
                      {selectedProduct.reviews.slice(0, 3).map((review: any) => (
                        <View key={review.id} style={styles.reviewItem}>
                          <View style={styles.reviewHeader}>
                            <Text style={styles.reviewUser}>{review.user_name}</Text>
                            <View style={styles.ratingContainer}>
                              {[...Array(5)].map((_, i) => (
                                <Ionicons 
                                  key={i} 
                                  name={i < review.rating ? "star" : "star-outline"} 
                                  size={12} 
                                  color="#FFB800" 
                                />
                              ))}
                            </View>
                          </View>
                          <Text style={styles.reviewComment}>{review.comment}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
  },
  messageText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  myMessageText: {
    color: 'white',
  },
  timestamp: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  myTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 12,
    marginVertical: spacing.xs,
  },
  systemMessageText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachedProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xs,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  productPrice: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  removeButton: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    maxHeight: 100,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  pinnedProductInMessage: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: spacing.xs,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  pinnedProductImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  pinnedProductInfo: {
    flex: 1,
    marginLeft: spacing.xs,
    justifyContent: 'center',
  },
  pinnedProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pinnedProductPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
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
  fullImageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  productModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: '8%',
    paddingVertical: spacing.md,
  },
  productModal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  productModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  productModalContent: {
    flexGrow: 0,
  },
  productModalImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F0F0F0',
  },
  productModalInfo: {
    padding: spacing.md,
  },
  productModalName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  productModalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  productModalDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  reviewsSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  reviewItem: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewUser: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  pinnedOrderInMessage: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: spacing.xs,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderItemImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
  },
  orderItemInfo: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  orderItemName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  orderItemQty: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  orderTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 6,
    textAlign: 'right',
  },
  orderModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderModalId: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  orderModalStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  orderModalDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  orderItemsSection: {
    marginBottom: spacing.md,
  },
  orderModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderModalItemImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
  },
  orderModalItemInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  orderModalItemName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  orderModalItemQty: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  orderModalItemPrice: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  orderModalItemTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  orderModalTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  orderModalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  orderModalTotalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  orderModalAddress: {
    backgroundColor: '#F8F8F8',
    padding: spacing.xs,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  orderModalAddressTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  orderModalAddressText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default ChatScreen;
