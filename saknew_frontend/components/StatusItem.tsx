import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserStatus } from '../services/status.types';
import StatusRing from './StatusRing';
import shopService from '../services/shopService';
import { IMAGE_BASE_URL } from '../config';

interface StatusItemProps {
  userStatus: UserStatus;
  isMyStatus?: boolean;
  onPress: () => void;
  onAddPress?: () => void;
}

const StatusItem: React.FC<StatusItemProps> = ({ userStatus, isMyStatus = false, onPress, onAddPress }) => {
  const { user, unviewed_count, latest_status } = userStatus;
  const [shopName, setShopName] = useState<string>('');
  
  // Debug logging
  console.log('DEBUG StatusItem:', {
    isMyStatus,
    hasLatestStatus: !!latest_status,
    mediaType: latest_status?.media_type,
    mediaUrl: latest_status?.media_url,
    content: latest_status?.content,
    unviewedCount: unviewed_count
  });
  
  // Fetch shop name if user has a shop
  useEffect(() => {
    const fetchShopName = async () => {
      if (user.profile?.shop_slug) {
        try {
          const shop = await shopService.getShopBySlug(user.profile.shop_slug);
          setShopName(shop.name);
        } catch (error) {
          console.log('Failed to fetch shop name:', error);
          setShopName(user.username); // Fallback to username
        }
      } else {
        setShopName(user.username); // Fallback to username if no shop
      }
    };
    
    fetchShopName();
  }, [user.profile?.shop_slug, user.username]);
  
  if (isMyStatus) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          <View style={styles.statusCard}>
            {latest_status ? (
              <View style={[styles.statusPreview, { backgroundColor: latest_status.media_type === 'text' ? latest_status.background_color || '#25D366' : '#000' }]}>
                {latest_status.media_type === 'image' && latest_status.media_url ? (
                  (() => {
                    const imageUrl = latest_status.media_url.startsWith('http') ? latest_status.media_url : `${IMAGE_BASE_URL}${latest_status.media_url}`;
                    console.log('DEBUG StatusItem - My Status Image URL:', imageUrl);
                    return <Image source={{ uri: imageUrl }} style={styles.mediaPreview} />;
                  })()
                ) : (
                  <Text style={styles.statusContent} numberOfLines={3}>
                    {latest_status.content}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.myStatusContent}>
                <Ionicons name="add" size={24} color="#25D366" />
                <Text style={styles.myStatusText}>My Status</Text>
              </View>
            )}
            <TouchableOpacity style={styles.addButton} onPress={onAddPress || onPress}>
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        <Text style={styles.nameText}>{shopName || user.username}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.statusCard}>
          <View style={[styles.statusPreview, { backgroundColor: latest_status?.media_type === 'text' ? latest_status?.background_color || '#25D366' : '#000' }]}>
            {latest_status?.media_type === 'image' && latest_status?.media_url ? (
              (() => {
                const imageUrl = latest_status.media_url.startsWith('http') ? latest_status.media_url : `${IMAGE_BASE_URL}${latest_status.media_url}`;
                console.log('DEBUG StatusItem - Other Status Image URL:', imageUrl);
                return <Image source={{ uri: imageUrl }} style={styles.mediaPreview} />;
              })()
            ) : (
              <Text style={styles.statusContent} numberOfLines={3}>
                {latest_status?.content || userStatus.statuses[0]?.content}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
      <Text style={styles.nameText}>{shopName || user.username}</Text>
    </View>
  );
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
  },
  myStatusContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  addButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myStatusText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#25D366',
  },
  addStatusLink: {
    marginTop: 4,
    fontSize: 10,
    color: '#667781',
    textAlign: 'center',
  },
  statusCard: {
    width: 80,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusPreview: {
    flex: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContent: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameText: {
    fontSize: 12,
    color: '#667781',
    textAlign: 'center',
    marginTop: 4,
    width: 80,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: 'cover',
  },
});

export default StatusItem;