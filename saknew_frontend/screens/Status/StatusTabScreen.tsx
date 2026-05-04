import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import statusService from '../../services/statusService';
import { UserStatus } from '../../services/status.types';
import { safeError } from '../../utils/securityUtils';

const AVATAR_SIZE = 58;

const StatusTabScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [myStatuses, setMyStatuses] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => { fetchStatuses(); }, [])
  );

  const fetchStatuses = async (isRefreshing = false) => {
    isRefreshing ? setRefreshing(true) : setLoading(true);
    try {
      const data = await statusService.getUserStatuses();
      const myStatus = user ? data.find((us: UserStatus) => us.user.id === user.id) : null;
      const others = user ? data.filter((us: UserStatus) => us.user.id !== user.id) : data;
      setMyStatuses(myStatus || null);
      setUserStatuses(others);
    } catch (error) {
      safeError('Failed to fetch statuses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (dateString: string): string => {
    const diffMins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return 'Yesterday';
  };

  // Story bubble: avatar + username below, fits within avatar width
  const renderStoryBubble = (item: UserStatus, isMe = false) => {
    const hasUnviewed = item.unviewed_count > 0;
    const label = isMe ? 'My status' : item.user.username;
    return (
      <TouchableOpacity
        key={item.user.id}
        style={styles.storyItem}
        onPress={() => navigation.navigate('StatusViewer' as any, { userStatus: item })}
        activeOpacity={0.75}
      >
        <View style={[styles.avatarRing, hasUnviewed ? styles.ringUnviewed : styles.ringViewed]}>
          {item.user.profile?.profile_picture ? (
            <Image source={{ uri: item.user.profile.profile_picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Ionicons name="person" size={22} color="#fff" />
            </View>
          )}
          {isMe && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('CreateStatus' as any)}
            >
              <Ionicons name="add" size={13} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.storyName} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
      </TouchableOpacity>
    );
  };

  const storiesRow = (
    <View style={styles.storiesWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
        {user && (
          myStatuses
            ? renderStoryBubble(myStatuses, true)
            : (
              <TouchableOpacity style={styles.storyItem} onPress={() => navigation.navigate('CreateStatus' as any)} activeOpacity={0.75}>
                <View style={[styles.avatarRing, styles.ringViewed]}>
                  {user.profile?.profile_picture
                    ? <Image source={{ uri: user.profile.profile_picture }} style={styles.avatar} />
                    : <View style={[styles.avatar, styles.defaultAvatar]}><Ionicons name="person" size={22} color="#fff" /></View>
                  }
                  <View style={styles.addBtn}><Ionicons name="add" size={13} color="#fff" /></View>
                </View>
                <Text style={styles.storyName} numberOfLines={1} ellipsizeMode="tail">My status</Text>
              </TouchableOpacity>
            )
        )}
        {userStatuses.map(item => renderStoryBubble(item))}
      </ScrollView>
    </View>
  );

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
        keyExtractor={(item) => item.user.id.toString()}
        ListHeaderComponent={
          <>
            {storiesRow}
            {userStatuses.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent updates</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => {
          const hasUnviewed = item.unviewed_count > 0;
          return (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => navigation.navigate('StatusViewer' as any, { userStatus: item })}
              activeOpacity={0.7}
            >
              <View style={[styles.avatarRing, hasUnviewed ? styles.ringUnviewed : styles.ringViewed]}>
                {item.user.profile?.profile_picture ? (
                  <Image source={{ uri: item.user.profile.profile_picture }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.defaultAvatar]}>
                    <Ionicons name="person" size={22} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{item.user.username}</Text>
                <Text style={styles.listTime}>{formatTime(item.latest_status.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={70} color="#ccc" />
              <Text style={styles.emptyTitle}>No status updates</Text>
              <Text style={styles.emptyText}>Status updates will appear here</Text>
            </View>
          ) : null
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#000' },
  headerActions: { flexDirection: 'row', gap: 16 },
  headerButton: { padding: 4 },

  // Stories row
  storiesWrapper: {
    borderBottomWidth: 8, borderBottomColor: '#f5f5f5',
    paddingVertical: 12,
  },
  storiesScroll: { paddingHorizontal: 12, gap: 4 },
  storyItem: {
    width: AVATAR_SIZE + 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  avatarRing: {
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ringUnviewed: { borderColor: '#25D366' },
  ringViewed: { borderColor: '#d0d0d0' },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  defaultAvatar: {
    backgroundColor: '#888',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    position: 'absolute', bottom: -1, right: -1,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#25D366',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  storyName: {
    marginTop: 4,
    fontSize: 10,
    color: '#333',
    textAlign: 'center',
    width: AVATAR_SIZE + 8,
    overflow: 'hidden',
  },

  // List items below stories
  sectionHeader: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: '#666', textTransform: 'uppercase',
  },
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  listInfo: { flex: 1, marginLeft: 12 },
  listName: { fontSize: 15, fontWeight: '500', color: '#000', marginBottom: 2 },
  listTime: { fontSize: 13, color: '#666' },
  listContent: { paddingBottom: 20 },

  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#666', marginTop: 14, marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center' },
});

export default StatusTabScreen;
