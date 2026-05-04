import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, FlatList, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../styles/globalStyles';
import publicApiClient from '../services/publicApiClient';
import apiClient from '../services/apiClient';

interface FeedbackItem {
  id: number;
  feedback: string;
  sender_label: string;
  created_at: string;
}

const FeedbackScreen = () => {
  const navigation = useNavigation();
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeedbackList = async () => {
    setListLoading(true);
    try {
      const response = await publicApiClient.get('/api/feedback/list/');
      setFeedbackList(Array.isArray(response.data) ? response.data : []);
    } catch {
      // silently fail
    } finally {
      setListLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (submitted) fetchFeedbackList();
  }, [submitted]);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setLoading(true);
    try {
      await apiClient.post('/api/feedback/submit/', { feedback: feedback.trim() });
      setFeedback('');
      setSubmitted(true);
    } catch {
      // try without auth for anonymous
      try {
        await publicApiClient.post('/api/feedback/submit/', { feedback: feedback.trim() });
        setFeedback('');
        setSubmitted(true);
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Community Feedback</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSubmitted(false)}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.successText}>Thank you! Your feedback was submitted.</Text>
        </View>

        {listLoading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={feedbackList}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchFeedbackList(); }}
                colors={[colors.primary]}
              />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No feedback yet. Be the first!</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.feedbackCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatarCircle}>
                    <Ionicons
                      name={item.sender_label === 'Anonymous' ? 'person-outline' : 'storefront-outline'}
                      size={16}
                      color={item.sender_label === 'Anonymous' ? colors.textSecondary : colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.senderLabel,
                      item.sender_label !== 'Anonymous' && styles.shopLabel
                    ]}>
                      {item.sender_label}
                    </Text>
                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                  </View>
                </View>
                <Text style={styles.feedbackText}>{item.feedback}</Text>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Feedback</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.iconContainer}>
            <Ionicons name="chatbubble-ellipses" size={60} color={colors.primary} />
          </View>
          <Text style={styles.title}>We'd love to hear from you!</Text>
          <Text style={styles.subtitle}>No login required. Your feedback helps us improve.</Text>

          <TextInput
            style={styles.feedbackInput}
            placeholder="Tell us what you think..."
            placeholderTextColor={colors.textSecondary}
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, (!feedback.trim() || loading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!feedback.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: spacing.xs, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  iconContainer: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  feedbackInput: {
    backgroundColor: colors.card, borderRadius: 8, padding: spacing.md,
    fontSize: 15, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
    minHeight: 150, marginBottom: spacing.lg,
  },
  submitButton: {
    backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5',
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  successText: { fontSize: 13, color: '#065F46', fontWeight: '600', flex: 1 },
  listContent: { padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 12 },

  feedbackCard: {
    backgroundColor: colors.card, borderRadius: 10, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  senderLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  shopLabel: { color: colors.primary },
  dateText: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  feedbackText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
});

export default FeedbackScreen;
