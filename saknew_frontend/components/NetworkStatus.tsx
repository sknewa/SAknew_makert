// saknew_frontend/components/NetworkStatus.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import useNetworkStatus from '../hooks/useNetworkStatus';
import { API_BASE_URL } from '../config';

const NetworkStatus: React.FC = () => {
  const { isConnected, isServerReachable, checkConnection } = useNetworkStatus();
  const [isChecking, setIsChecking] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const heightAnim = useState(new Animated.Value(0))[0];

  const handleRefresh = async () => {
    setIsChecking(true);
    await checkConnection();
    setIsChecking(false);
  };
  
  // Show banner when network status changes
  useEffect(() => {
    if (isConnected === false || isServerReachable === false) {
      setShowBanner(true);
      setIsCollapsed(false);
    } else if (isConnected === true && isServerReachable === true) {
      // Auto-collapse after 3 seconds when connection is restored
      if (showBanner) {
        const timer = setTimeout(() => {
          setIsCollapsed(true);
        }, 3000);
        
        // Clean up timer to prevent memory leaks
        return () => clearTimeout(timer);
      }
    }
  }, [isConnected, isServerReachable, showBanner]);
  
  // Animate height changes
  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isCollapsed ? 0 : 1,
      duration: 300,
      useNativeDriver: false
    }).start();
  }, [isCollapsed]);
  
  if (isConnected === null) {
    return null; // Still loading
  }

  // Only show indicator when collapsed
  if (isCollapsed) {
    return (
      <TouchableOpacity 
        style={styles.collapsedContainer}
        onPress={() => setIsCollapsed(false)}
      >
        <View style={[
          styles.indicator, 
          isConnected ? 
            (isServerReachable ? styles.connected : styles.warning) : 
            styles.disconnected
        ]} />
      </TouchableOpacity>
    );
  }
  
  // Show full banner when expanded
  return (
    <Animated.View 
      style={[styles.container, {
        maxHeight: heightAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 100]
        })
      }]}
    >
      <View style={[
        styles.indicator, 
        isConnected ? 
          (isServerReachable ? styles.connected : styles.warning) : 
          styles.disconnected
      ]} />
      
      <View style={styles.textContainer}>
        <Text style={styles.statusText}>
          Network: {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
        <Text style={styles.serverText}>
          Server: {isChecking ? 'Checking...' : 
            (isServerReachable ? 'Reachable' : 'Unreachable')}
        </Text>
        <Text style={styles.apiText}>
          API: {API_BASE_URL}
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isChecking}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.collapseButton}
          onPress={() => setIsCollapsed(true)}
        >
          <Text style={styles.collapseText}>Hide</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  collapsedContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
    zIndex: 999,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  connected: {
    backgroundColor: '#28a745',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  warning: {
    backgroundColor: '#ffc107',
    shadowColor: '#ffc107',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  disconnected: {
    backgroundColor: '#dc3545',
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  serverText: {
    fontSize: 10,
    color: '#6c757d',
  },
  apiText: {
    fontSize: 9,
    color: '#6c757d',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#007bff',
    borderRadius: 4,
    marginRight: 4,
  },
  collapseButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#6c757d',
    borderRadius: 4,
  },
  refreshText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  collapseText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default NetworkStatus;