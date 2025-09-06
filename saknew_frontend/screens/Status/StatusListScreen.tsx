import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext.minimal';
import statusService from '../../services/statusService';
import { Status } from '../../services/status.types';

const StatusListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { shopSlug } = route.params as { shopSlug?: string };
  
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const data = await statusService.getMyStatuses();
      setStatuses(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async (statusId: number) => {
    Alert.alert('Delete Status', 'Are you sure you want to delete this status?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await statusService.deleteStatus(statusId);
            setStatuses(prev => prev.filter(s => s.id !== statusId));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete status');
          }
        }
      }
    ]);
  };

  const renderStatus = ({ item }: { item: Status }) => (
    <View style={styles.statusItem}>
      <View style={[styles.statusPreview, { backgroundColor: item.background_color }]}>
        <Text style={styles.statusText} numberOfLines={3}>{item.content}</Text>
      </View>
      <View style={styles.statusInfo}>
        <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
        <Text style={styles.viewCount}>{item.view_count} views</Text>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteStatus(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#DC3545" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Status Updates</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateStatus')}>
          <Ionicons name="add" size={24} color="#25D366" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={statuses}
        renderItem={renderStatus}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No status updates yet</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateStatus')}
            >
              <Text style={styles.createButtonText}>Create Your First Status</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  listContainer: {
    padding: 16,
  },
  statusItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusPreview: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  viewCount: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#25D366',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StatusListScreen;