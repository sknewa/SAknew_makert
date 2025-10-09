import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import statusService from '../../services/statusService';

const backgroundColors = [
  '#25D366', '#128C7E', '#075E54', '#34B7F1', '#9C27B0',
  '#E91E63', '#F44336', '#FF9800', '#4CAF50', '#2196F3'
];

const CreateStatusScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { onStatusCreated } = route.params as { onStatusCreated?: () => void } || {};
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(backgroundColors[0]);
  const [loading, setLoading] = useState(false);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video'>('text');

  const pickImage = async () => {
    console.log('DEBUG: Starting image picker');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    console.log('DEBUG: Image picker result:', result.canceled ? 'Canceled' : 'Selected');
    if (!result.canceled) {
      console.log('DEBUG: Selected image URI:', result.assets[0].uri);
      setMediaUri(result.assets[0].uri);
      setMediaType('image');
    }
  };

  const pickVideo = async () => {
    console.log('DEBUG: Starting video picker');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: 60,
      quality: 0.8,
    });

    console.log('DEBUG: Video picker result:', result.canceled ? 'Canceled' : 'Selected');
    if (!result.canceled) {
      console.log('DEBUG: Selected video URI:', result.assets[0].uri);
      setMediaUri(result.assets[0].uri);
      setMediaType('video');
    }
  };

  const removeMedia = () => {
    console.log('DEBUG: Removing media, switching to text mode');
    setMediaUri(null);
    setMediaType('text');
  };

  const handleCreateStatus = async () => {
    console.log('DEBUG: Starting status creation process');
    const trimmedContent = content.trim();
    console.log('DEBUG: Content length:', trimmedContent.length);
    console.log('DEBUG: Media URI:', mediaUri ? 'Present' : 'None');
    console.log('DEBUG: Media type:', mediaType);
    console.log('DEBUG: Selected color:', selectedColor);
    
    if (!trimmedContent && !mediaUri) {
      console.log('DEBUG: Empty status validation failed');
      Alert.alert('Empty Status', 'Please add text or media for your status');
      return;
    }

    setLoading(true);
    console.log('DEBUG: Loading state set to true');
    
    try {
      console.log('DEBUG: Calling statusService.createStatus with params:', {
        content: trimmedContent || '',
        hasMedia: !!mediaUri,
        mediaType,
        backgroundColor: selectedColor
      });
      
      const result = await statusService.createStatus(trimmedContent || '', mediaUri || undefined, mediaType, selectedColor);
      console.log('DEBUG: Status created successfully:', result);
      
      console.log('DEBUG: Calling onStatusCreated callback');
      onStatusCreated?.(); // Call the callback to refresh statuses
      
      console.log('DEBUG: Navigating back');
      navigation.goBack();
    } catch (error: any) {
      console.log('DEBUG: Status creation failed:', error);
      console.log('DEBUG: Error message:', error?.message);
      console.log('DEBUG: Error response:', error?.response?.data);
      Alert.alert('Error', error?.message || 'Failed to create status. Please try again.');
    } finally {
      console.log('DEBUG: Setting loading to false');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mediaType === 'image' ? 'Photo Status' : 
           mediaType === 'video' ? 'Video Status' : 'Text Status'}
        </Text>
        <TouchableOpacity 
          onPress={handleCreateStatus}
          disabled={loading || (!content.trim() && !mediaUri)}
          style={[styles.postButton, ((!content.trim() && !mediaUri) || loading) && styles.postButtonDisabled]}
        >
          <Text style={[styles.postButtonText, ((!content.trim() && !mediaUri) || loading) && styles.postButtonTextDisabled]}>
            {loading ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.previewContainer, { backgroundColor: mediaType === 'text' ? selectedColor : '#000' }]}>
        {mediaType === 'image' && mediaUri ? (
          <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />
        ) : mediaType === 'video' && mediaUri ? (
          <Video
            source={{ uri: mediaUri }}
            style={styles.mediaPreview}
            useNativeControls
            resizeMode="contain"
            shouldPlay={false}
          />
        ) : (
          <TextInput
            style={styles.textInput}
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor="rgba(255,255,255,0.7)"
            multiline
            maxLength={700}
            textAlign="center"
            autoFocus
            returnKeyType="done"
            blurOnSubmit
          />
        )}
        {mediaUri && (
          <TouchableOpacity style={styles.removeMediaButton} onPress={removeMedia}>
            <Ionicons name="close-circle" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.mediaOptions}>
        <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
          <Ionicons name="image" size={20} color="#666" />
          <Text style={styles.mediaButtonText}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mediaButton} onPress={pickVideo}>
          <Ionicons name="videocam" size={20} color="#666" />
          <Text style={styles.mediaButtonText}>Video</Text>
        </TouchableOpacity>
      </View>

      {mediaType === 'text' && (
        <View style={styles.colorPicker}>
          <Text style={styles.colorPickerTitle}>Background Color</Text>
          <View style={styles.colorRow}>
            {backgroundColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColor
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.characterCount}>
          <Text style={[styles.characterCountText, content.length > 650 && styles.characterCountWarning]}>
            {content.length}/700
          </Text>
        </View>
        <Text style={styles.tipText}>💡 Tip: Status visible for 24h • Videos max 60s</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#25D366',
  },
  postButtonDisabled: {
    backgroundColor: '#ccc',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  postButtonTextDisabled: {
    color: '#999',
  },
  previewContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    minHeight: 200,
    maxHeight: '60%',
  },
  textInput: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'center',
  },
  colorPicker: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  colorPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#000',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  characterCount: {
    alignItems: 'center',
    marginBottom: 8,
  },
  characterCountText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  characterCountWarning: {
    color: '#FF9800',
  },
  tipText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 11,
    fontStyle: 'italic',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    resizeMode: 'contain',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  mediaOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  mediaButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default CreateStatusScreen;