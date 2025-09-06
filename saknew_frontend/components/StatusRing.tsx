import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface StatusRingProps {
  size: number;
  hasUnviewed: boolean;
  isMyStatus?: boolean;
  style?: ViewStyle;
}

const StatusRing: React.FC<StatusRingProps> = ({ size, hasUnviewed, isMyStatus = false, style }) => {
  const ringStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: hasUnviewed ? 3 : 2,
    borderColor: hasUnviewed ? '#25D366' : isMyStatus ? '#128C7E' : '#E5E5E5',
  };

  return <View style={[ringStyle, style]} />;
};

export default StatusRing;