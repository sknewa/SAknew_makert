import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';


// Keys for offline storage
const OFFLINE_QUEUE_KEY = '@offline_queue';
const OFFLINE_DATA_KEY = '@offline_data';

// Action types
export enum ActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

// Interface for offline actions
export interface OfflineAction {
  id: string;
  type: ActionType;
  endpoint: string;
  data: any;
  timestamp: number;
}

// Save data for offline use
export const saveOfflineData = async (key: string, data: any): Promise<void> => {
  try {
    const storageKey = `${OFFLINE_DATA_KEY}:${key}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    safeError('Error saving offline data:', error);
  }
};

// Get offline data
export const getOfflineData = async <T>(key: string): Promise<T | null> => {
  try {
    const storageKey = `${OFFLINE_DATA_KEY}:${key}`;
    const data = await AsyncStorage.getItem(storageKey);
    if (data) {
      return JSON.parse(data).data;
    }
    return null;
  } catch (error) {
    safeError('Error getting offline data:', error);
    return null;
  }
};

// Queue an action for when online
export const queueOfflineAction = async (action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<void> => {
  try {
    // For now, always queue actions (network check removed)

    // Get existing queue
    const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: OfflineAction[] = queueData ? JSON.parse(queueData) : [];
    
    // Add new action
    const newAction: OfflineAction = {
      ...action,
      id: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
    };
    
    queue.push(newAction);
    
    // Save updated queue
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    safeLog('Action queued for offline use');
  } catch (error) {
    safeError('Error queuing offline action:', error);
  }
};

// Process offline queue when back online
export const processOfflineQueue = async (
  processAction: (action: OfflineAction) => Promise<boolean>
): Promise<void> => {
  try {
    // Get queue
    const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueData) return;
    
    const queue: OfflineAction[] = JSON.parse(queueData);
    if (queue.length === 0) return;
    
    safeLog(`Processing ${queue.length} offline actions`);
    
    // Process each action
    const remainingActions: OfflineAction[] = [];
    
    for (const action of queue) {
      try {
        const success = await processAction(action);
        if (!success) {
          remainingActions.push(action);
        }
      } catch (error) {
        safeError('Error processing offline action:', error);
        remainingActions.push(action);
      }
    }
    
    // Save remaining actions
    if (remainingActions.length > 0) {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingActions));
      safeLog(`${remainingActions.length} actions remain in queue`);
    } else {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      safeLog('Offline queue processed successfully');
    }
  } catch (error) {
    safeError('Error processing offline queue:', error);
  }
};