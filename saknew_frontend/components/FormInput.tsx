import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  touched?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: object;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  touched,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (rest.onBlur) {
      rest.onBlur(e);
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  // Determine if we should show an error
  const showError = error && touched;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputFocused,
        showError && styles.inputError
      ]}>
        {leftIcon && (
          <Ionicons 
            name={leftIcon as any} 
            size={20} 
            color={showError ? '#DC3545' : isFocused ? '#28A745' : '#6C757D'} 
            style={styles.leftIcon} 
          />
        )}
        
        <TextInput
          style={styles.input}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor="#ADB5BD"
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...rest}
        />
        
        {secureTextEntry && (
          <TouchableOpacity onPress={togglePasswordVisibility} style={styles.rightIcon}>
            <Ionicons 
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} 
              size={20} 
              color="#6C757D" 
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity 
            onPress={onRightIconPress} 
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            <Ionicons 
              name={rightIcon as any} 
              size={20} 
              color={showError ? '#DC3545' : isFocused ? '#28A745' : '#6C757D'} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {showError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#212529',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#28A745',
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  inputError: {
    borderColor: '#DC3545',
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    color: '#212529',
    fontSize: 14,
  },
  leftIcon: {
    marginLeft: 12,
  },
  rightIcon: {
    padding: 8,
    marginRight: 4,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default FormInput;