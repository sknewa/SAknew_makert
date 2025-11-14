import apiClient from './apiClient';

export interface Message {
  id: number;
  conversation: number;
  sender: number;
  sender_name: string;
  message_type: 'text' | 'system' | 'product_pin' | 'status_pin' | 'order_update' | 'order_pin' | 'image';
  text: string;
  image?: string;
  product?: any;
  status?: any;
  order?: any;
  is_read: boolean;
  is_deleted: boolean;
  timestamp: string;
}

export interface Conversation {
  id: number;
  order: number;
  order_id: number;
  buyer: number;
  buyer_name: string;
  seller: number;
  seller_name: string;
  messages: Message[];
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export const messagingService = {
  getConversations: async (): Promise<Conversation[]> => {
    const response = await apiClient.get('/api/messaging/conversations/');
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  getConversation: async (id: number): Promise<Conversation> => {
    const response = await apiClient.get(`/api/messaging/conversations/${id}/`);
    return response.data;
  },

  sendMessage: async (conversationId: number, text: string, messageType: string = 'text', productId?: number, image?: File, orderId?: string): Promise<Message> => {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('message_type', messageType);
    if (productId) formData.append('product', productId.toString());
    if (orderId) formData.append('order', orderId.toString());
    if (image) formData.append('image', image);
    
    const response = await apiClient.post(`/api/messaging/conversations/${conversationId}/send_message/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  markAsRead: async (conversationId: number): Promise<void> => {
    await apiClient.post(`/api/messaging/conversations/${conversationId}/mark_read/`);
  },

  createConversation: async (shopId: number): Promise<Conversation> => {
    const response = await apiClient.post('/api/messaging/conversations/create_conversation/', {
      shop_id: shopId,
    });
    return response.data;
  },

  deleteMessage: async (messageId: number): Promise<void> => {
    await apiClient.delete(`/api/messaging/messages/${messageId}/delete_message/`);
  },

  blockUser: async (conversationId: number): Promise<void> => {
    await apiClient.post(`/api/messaging/conversations/${conversationId}/block_user/`);
  },

  unblockUser: async (conversationId: number): Promise<void> => {
    await apiClient.post(`/api/messaging/conversations/${conversationId}/unblock_user/`);
  },
};
