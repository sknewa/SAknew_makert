import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { globalStyles, colors } from '../../styles/globalStyles';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;
  const buttonStyle = [
    globalStyles.btn,
    variant === 'primary' && globalStyles.btnPrimary,
    variant === 'secondary' && globalStyles.btnOutline,
    variant === 'danger' && globalStyles.btnDanger,
    variant === 'ghost' && styles.ghostButton,
    isDisabled && globalStyles.btnDisabled,
    style,
  ];

  const buttonTextStyle = [
    globalStyles.btnText,
    variant === 'secondary' && globalStyles.btnOutlineText,
    variant === 'ghost' && styles.ghostText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.buttonText} />
      ) : (
        <Text style={buttonTextStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
});

export default PrimaryButton;
