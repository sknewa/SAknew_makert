import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserStatus } from '../services/status.types';
import StatusRing from './StatusRing';

interface StatusItemProps {
  userStatus: UserStatus;
  isMyStatus?: boolean;
  onPress: () => void;
  onAddPress?: () => void;
}

const StatusItem: React.FC<StatusItemProps> = ({ userStatus, isMyStatus = false, onPress, onAddPress }) => {
  const { user, unviewed_count, latest_status } = userStatus;
  
  // Debug logging
  if (isMyStatus) {
    console.log('DEBUG StatusItem - My Status:', {
      hasLatestStatus: !!latest_status,
      latestStatus: latest_status,
      unviewedCount: unviewed_count,
      userStatus: userStatus
    });
  }
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        <StatusRing 
          size={56} 
          hasUnviewed={unviewed_count > 0 || (userStatus.statuses && userStatus.statuses.length > 0)} 
          isMyStatus={isMyStatus}
          style={styles.statusRing}
        />
        {user.profile?.profile_picture ? (
          <Image 
            source={{ uri: user.profile.profile_picture }} 
            style={styles.avatar}
          />
        ) : (
          <View style={styles.defaultAvatar}>
            <Ionicons name="person" size={24} color="#666" />
          </View>
        )}
        {isMyStatus && onAddPress && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.username}>
          {isMyStatus ? 'My Status' : user.username}
        </Text>
        <Text style={styles.timeText}>
          {latest_status ? formatTime(latest_status.created_at) : 
           (userStatus.statuses && userStatus.statuses.length > 0) ? 
           formatTime(userStatus.statuses[0].created_at) : 'Tap to add status update'}
        </Text>
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
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  statusRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    zIndex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  defaultAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f0f0f0',
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
  textContainer: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 13,
    color: '#666',
  },
});

export default StatusItem;