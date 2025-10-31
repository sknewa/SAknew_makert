import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext.minimal';
import statusService from '../../services/statusService';
import { UserStatus } from '../../services/status.types';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';

const StatusTabScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [myStatuses, setMyStatuses] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchStatuses();
    }, [])
  );

  const fetchStatuses = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const data = await statusService.getUserStatuses();
      
      // Separate my statuses from others
      const myStatus = data.find((us: UserStatus) => us.user.id === user?.id);
      const otherStatuses = data.filter((us: UserStatus) => us.user.id !== user?.id);
      
      setMyStatuses(myStatus || null);
      setUserStatuses(otherStatuses);
    } catch (error) {
      safeError('Failed to fetch statuses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewStatus = (userStatus: UserStatus) => {
    navigation.navigate('StatusViewer' as any, { userStatus });
  };

  const handleCreateStatus = () => {
    navigation.navigate('CreateStatus' as any);
  };

  const handleViewMyStatus = () => {
    if (myStatuses) {
      navigation.navigate('StatusViewer' as any, { userStatus: myStatuses });
    } else {
      handleCreateStatus();
    }
  };

  const renderMyStatus = () => (
    <TouchableOpacity 
      style={styles.myStatusContainer}
      onPress={handleViewMyStatus}
      activeOpacity={0.7}
    >
      <View style={styles.statusRow}>
        <View style={styles.avatarContainer}>
          {user?.profile?.profile_picture ? (
            <Image 
              source={{ uri: user.profile.profile_picture }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
          )}
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleCreateStatus}
          >
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusInfo}>
          <Text style={styles.statusName}>My status</Text>
          <Text style={styles.statusTime}>
            {myStatuses 
              ? `${myStatuses.statuses.length} update${myStatuses.statuses.length > 1 ? 's' : ''}`
              : 'Tap to add status update'
            }
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStatusItem = ({ item }: { item: UserStatus }) => {
    const hasUnviewed = item.unviewed_count > 0;
    
    return (
      <TouchableOpacity 
        style={styles.statusItem}
        onPress={() => handleViewStatus(item)}
        activeOpacity={0.7}
      >
        <View style={styles.statusRow}>
          <View style={[
            styles.avatarBorder,
            hasUnviewed ? styles.unviewedBorder : styles.viewedBorder
          ]}>
            {item.user.profile?.profile_picture ? (
              <Image 
                source={{ uri: item.user.profile.profile_picture }} 
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.defaultAvatar]}>
                <Ionicons name="person" size={24} color="#fff" />
              </View>
            )}
          </View>
          
          <View style={styles.statusInfo}>
            <Text style={styles.statusName}>{item.user.username}</Text>
            <Text style={styles.statusTime}>
              {formatTime(item.latest_status.created_at)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return 'Yesterday';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Status</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="search" size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={22} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={userStatuses}
        renderItem={renderStatusItem}
        keyExtractor={(item) => item.user.id.toString()}
        ListHeaderComponent={
          <>
            {renderMyStatus()}
            {userStatuses.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent updates</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>No status updates</Text>
              <Text style={styles.emptyText}>
                Status updates from your contacts will appear here
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStatuses(true)}
            colors={['#25D366']}
            tintColor="#25D366"
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  myStatusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBorder: {
    padding: 2,
    borderRadius: 30,
    borderWidth: 2,
  },
  unviewedBorder: {
    borderColor: '#25D366',
  },
  viewedBorder: {
    borderColor: '#d0d0d0',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  defaultAvatar: {
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statusName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  statusTime: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textTransform: 'uppercase',
  },
  statusItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default StatusTabScreen;
