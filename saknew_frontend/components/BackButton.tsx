import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface BackButtonProps {
  style?: ViewStyle;
  color?: string;
  size?: number;
  onPress?: () => void;
  title?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  style,
  color = '#0F172A',
  size = 22,
  onPress,
  title,
}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.header, style]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handlePress}
        accessibilityLabel="Go back"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={size} color={color} />
      </TouchableOpacity>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F6FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 12,
  },
});

export default BackButton;
