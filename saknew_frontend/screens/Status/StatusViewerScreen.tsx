import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert, SafeAreaView, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { UserStatus, Status } from '../../services/status.types';
import statusService from '../../services/statusService';
import { IMAGE_BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext.minimal';

const { width, height } = Dimensions.get('window');

const StatusViewerScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { userStatus } = route.params as { userStatus: UserStatus };
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const replyInputRef = useRef<TextInput>(null);
  
  const isMyStatus = userStatus.user.id === user?.id;
  
  const currentStatus = userStatus.statuses[currentIndex];

  console.log('DEBUG StatusViewerScreen:', {
    currentIndex,
    totalStatuses: userStatus.statuses.length,
    currentStatus: {
      id: currentStatus?.id,
      mediaType: currentStatus?.media_type,
      mediaUrl: currentStatus?.media_url,
      content: currentStatus?.content
    }
  });

  useEffect(() => {
    if (currentStatus) {
      console.log('DEBUG StatusViewerScreen - Marking status as viewed:', currentStatus.id);
      statusService.viewStatus(currentStatus.id);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < userStatus.statuses.length - 1) {
            setCurrentIndex(prev => prev + 1);
            return 0;
          }
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentIndex, userStatus.statuses.length, isPaused]);

  useEffect(() => {
    if (progress >= 100 && currentIndex >= userStatus.statuses.length - 1) {
      navigation.goBack();
    }
  }, [progress, currentIndex, userStatus.statuses.length]);

  const handleNext = () => {
    if (currentIndex < userStatus.statuses.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      navigation.goBack();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handleLongPress = () => {
    setIsPaused(true);
  };

  const handlePressOut = () => {
    setIsPaused(false);
  };

  const handleReply = () => {
    if (!isMyStatus) {
      setShowReply(true);
      setIsPaused(true);
      setTimeout(() => replyInputRef.current?.focus(), 100);
    }
  };

  const handleSendReply = () => {
    if (replyText.trim()) {
      // TODO: Implement reply functionality (send as private message)
      Alert.alert('Reply Sent', `Reply to ${userStatus.user.username}: ${replyText}`);
      setReplyText('');
      setShowReply(false);
      setIsPaused(false);
    }
  };

  const handleCancelReply = () => {
    setReplyText('');
    setShowReply(false);
    setIsPaused(false);
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Status',
      'Are you sure you want to delete this status?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await statusService.deleteStatus(currentStatus.id);
              if (userStatus.statuses.length === 1) {
                navigation.goBack();
              } else {
                // Remove from list and continue
                handleNext();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete status');
            }
          }
        }
      ]
    );
  };

  if (!currentStatus) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bars */}
      <View style={styles.progressContainer}>
        {userStatus.statuses.map((_, index) => (
          <View key={index} style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  width: index < currentIndex ? '100%' : 
                         index === currentIndex ? `${progress}%` : '0%' 
                }
              ]} 
            />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {userStatus.user.profile?.profile_picture ? (
            <Image source={{ uri: userStatus.user.profile.profile_picture }} style={styles.avatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.username} numberOfLines={1}>{userStatus.user.username}</Text>
            <Text style={styles.timeText}>{formatTime(currentStatus.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Status content */}
      <View style={styles.contentContainer}>
        <TouchableOpacity 
          style={styles.leftTap} 
          onPress={handlePrevious}
          onLongPress={handleLongPress}
          onPressOut={handlePressOut}
          activeOpacity={1}
        />
        <TouchableOpacity 
          style={styles.rightTap} 
          onPress={handleNext}
          onLongPress={handleLongPress}
          onPressOut={handlePressOut}
          activeOpacity={1}
        />
        
        {currentStatus.media_type === 'image' && currentStatus.media_url ? (
          (() => {
            const imageUrl = currentStatus.media_url.startsWith('http') ? currentStatus.media_url : `${IMAGE_BASE_URL}${currentStatus.media_url}`;
            console.log('DEBUG StatusViewerScreen - Displaying image:', imageUrl);
            return <Image source={{ uri: imageUrl }} style={styles.mediaImage} />;
          })()
        ) : (
          <View style={[styles.textStatus, { backgroundColor: currentStatus.background_color || '#25D366' }]}>
            <Text style={styles.statusText} numberOfLines={8}>{currentStatus.content}</Text>
          </View>
        )}
      </View>

      {/* Bottom actions */}
      {!showReply && (
        <View style={styles.bottomActions}>
          {!isMyStatus ? (
            <TouchableOpacity style={styles.replyButton} onPress={handleReply}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
              <Text style={styles.replyText}>Reply</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.viewsContainer}>
              <Ionicons name="eye" size={16} color="#fff" />
              <Text style={styles.viewsText}>{currentStatus.view_count} views</Text>
            </View>
          )}
          
          {isMyStatus && (
            <TouchableOpacity style={styles.deleteIconButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Reply input */}
      {showReply && (
        <View style={styles.replyContainer}>
          <TouchableOpacity onPress={handleCancelReply} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <TextInput
            ref={replyInputRef}
            style={styles.replyInput}
            placeholder="Reply to status..."
            placeholderTextColor="#999"
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            onPress={handleSendReply} 
            style={[styles.sendButton, !replyText.trim() && styles.sendButtonDisabled]}
            disabled={!replyText.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 1,
    borderRadius: 1,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 50,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  defaultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  leftTap: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: width / 2,
    height: '100%',
    zIndex: 1,
  },
  rightTap: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: width / 2,
    height: '100%',
    zIndex: 1,
  },
  mediaImage: {
    width: width - 20,
    maxHeight: height * 0.6,
    resizeMode: 'contain',
  },
  textStatus: {
    width: width - 40,
    maxHeight: height * 0.6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  replyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  viewsText: {
    color: '#fff',
    fontSize: 12,
  },
  deleteIconButton: {
    backgroundColor: 'rgba(220,53,69,0.8)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  cancelButton: {
    padding: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#25D366',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
});

export default StatusViewerScreen;