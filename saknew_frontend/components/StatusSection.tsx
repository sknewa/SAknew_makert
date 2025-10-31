import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext.minimal';
import statusService from '../services/statusService';
import { UserStatus } from '../services/status.types';
import StatusItem from './StatusItem';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

interface StatusSectionProps {
  onStatusPress: (userStatus: UserStatus) => void;
  onCreateStatus: () => void;
  refreshTrigger?: number; // Add this to trigger refresh from parent
}

const StatusSection: React.FC<StatusSectionProps> = ({ onStatusPress, onCreateStatus, refreshTrigger }) => {
  const { user } = useAuth();
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [myStatus, setMyStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatuses();
    // Re-fetch statuses if the user logs in or out.
    // The check for `user?.id` inside fetchStatuses handles the null case.
  }, [user]);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      fetchStatuses();
    }
  }, [refreshTrigger]);

  const fetchStatuses = async () => {
    try {
      console.log('DEBUG StatusSection: Starting to fetch statuses...');
      const statuses = await statusService.getUserStatuses();
      console.log('DEBUG StatusSection: Received statuses:', JSON.stringify(statuses, null, 2));
      
      // Ensure statuses is an array before using array methods
      if (!Array.isArray(statuses)) {
        safeWarn('DEBUG: Expected array but got:', typeof statuses, statuses);
        setMyStatus(null);
        setUserStatuses([]);
        return;
      }
      
      const myStatusData = statuses.find(s => s.user.id === user?.id);
      const otherStatuses = statuses.filter(s => s.user.id !== user?.id);
      console.log('DEBUG StatusSection: User ID:', user?.id);
      console.log('DEBUG StatusSection: Status user IDs:', statuses.map(s => s.user.id));
      console.log('DEBUG StatusSection: My status found:', !!myStatusData);
      if (myStatusData) {
        console.log('DEBUG StatusSection: My status latest_status:', myStatusData.latest_status);
      }
      console.log('DEBUG StatusSection: Other statuses:', otherStatuses.length);
      
      setMyStatus(myStatusData || null);
      setUserStatuses(otherStatuses);
    } catch (error: any) {
      safeLog('DEBUG: Status fetch error:', error);
      setMyStatus(null);
      setUserStatuses([]);
      // Don't show alert for now, just log the error
      safeWarn('Failed to load statuses:', error?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {/* My Status */}
        <StatusItem
          userStatus={myStatus || {
            user: { 
              id: user?.id || 0, 
              username: user?.username || '', 
              profile: { 
                profile_picture: user?.profile?.profile_picture,
                shop_slug: user?.profile?.shop_slug
              } 
            },
            statuses: [],
            latest_status: null,
            unviewed_count: 0
          }}
          isMyStatus={true}
          onPress={() => myStatus ? onStatusPress(myStatus) : onCreateStatus()}
          onAddPress={onCreateStatus}
        />
        
        {/* Other Users' Statuses */}
        {userStatuses.map((userStatus) => (
          <StatusItem
            key={userStatus.user.id}
            userStatus={userStatus}
            onPress={() => onStatusPress(userStatus)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 4,
  },
  scrollView: {
    paddingHorizontal: 4,
  },
});

export default StatusSection;