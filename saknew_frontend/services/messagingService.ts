import apiClient from './apiClient';

export interface Message {
  id: number;
  conversation: number;
  sender: number;
  sender_name: string;
  message_type: 'text' | 'system' | 'product_pin' | 'status_pin' | 'order_update';
  text: string;
  product?: any;
  status?: any;
  is_read: boolean;
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
    return response.data;
  },

  getConversation: async (id: number): Promise<Conversation> => {
    const response = await apiClient.get(`/api/messaging/conversations/${id}/`);
    return response.data;
  },

  sendMessage: async (conversationId: number, text: string, messageType: string = 'text', productId?: number): Promise<Message> => {
    const response = await apiClient.post(`/api/messaging/conversations/${conversationId}/send_message/`, {
      text,
      message_type: messageType,
      product: productId,
    });
    return response.data;
  },

  markAsRead: async (conversationId: number): Promise<void> => {
    await apiClient.post(`/api/messaging/conversations/${conversationId}/mark_read/`);
  },
};
