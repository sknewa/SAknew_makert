import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext.minimal';
import statusService from '../services/statusService';
import { UserStatus } from '../services/status.types';
import StatusItem from './StatusItem';

interface StatusSectionProps {
  onStatusPress: (userStatus: UserStatus) => void;
  onCreateStatus: () => void;
}

const StatusSection: React.FC<StatusSectionProps> = ({ onStatusPress, onCreateStatus }) => {
  const { user } = useAuth();
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [myStatus, setMyStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatuses();
    // Re-fetch statuses if the user logs in or out.
    // The check for `user?.id` inside fetchStatuses handles the null case.
  }, [user]);

  const fetchStatuses = async () => {
    try {
      console.log('DEBUG: Starting to fetch statuses...');
      const statuses = await statusService.getUserStatuses();
      console.log('DEBUG: Received statuses:', statuses);
      
      // Ensure statuses is an array before using array methods
      if (!Array.isArray(statuses)) {
        console.warn('DEBUG: Expected array but got:', typeof statuses, statuses);
        setMyStatus(null);
        setUserStatuses([]);
        return;
      }
      
      const myStatusData = statuses.find(s => s.user.id === user?.id);
      const otherStatuses = statuses.filter(s => s.user.id !== user?.id);
      console.log('DEBUG: User ID:', user?.id);
      console.log('DEBUG: Status user IDs:', statuses.map(s => s.user.id));
      console.log('DEBUG: My status found:', !!myStatusData);
      console.log('DEBUG: My status data:', myStatusData);
      console.log('DEBUG: Other statuses:', otherStatuses.length);
      
      setMyStatus(myStatusData || null);
      setUserStatuses(otherStatuses);
    } catch (error: any) {
      console.log('DEBUG: Status fetch error:', error);
      setMyStatus(null);
      setUserStatuses([]);
      // Don't show alert for now, just log the error
      console.warn('Failed to load statuses:', error?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {/* My Status */}
        <StatusItem
          userStatus={myStatus || {
            user: { 
              id: user?.id || 0, 
              username: user?.username || '', 
              profile: { profile_picture: user?.profile?.profile_picture } 
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
    marginBottom: 15,
    borderRadius: 10,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  scrollView: {
    paddingLeft: 8,
  },
});

export default StatusSection;