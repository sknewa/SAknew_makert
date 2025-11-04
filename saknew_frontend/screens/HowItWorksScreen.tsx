import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const colors = {
  primary: '#27AE60',
  background: '#F5F5F5',
  card: '#FFFFFF',
  textPrimary: '#222222',
  textSecondary: '#666666',
  border: '#E0E0E0',
};

const HowItWorksScreen = () => {
  const navigation = useNavigation();

  const sections = [
    {
      icon: 'person-add-outline',
      title: 'Getting Started',
      steps: [
        'Register with your email and verify your account',
        'Complete your profile with basic information',
        'Start browsing products from local sellers',
      ],
    },
    {
      icon: 'cart-outline',
      title: 'For Buyers',
      steps: [
        'Browse products by categories or search',
        'View product details, prices, and seller info',
        'Add items to cart and proceed to checkout',
        'Add funds to your wallet for payments',
        'Enter delivery address and place order',
        'Track order status in real-time',
        'Verify delivery with unique code',
        'Rate and review products after delivery',
      ],
    },
    {
      icon: 'storefront-outline',
      title: 'For Sellers',
      steps: [
        'Create your shop with name and description',
        'Add products with photos, prices, and stock',
        'Set promotions and discounts on products',
        'Receive orders from buyers',
        'Process orders and update status',
        'Generate delivery codes for buyers',
        'Receive payments in your wallet',
        'Share your shop link to attract customers',
      ],
    },
    {
      icon: 'wallet-outline',
      title: 'Wallet System',
      steps: [
        'Add funds to your wallet securely',
        'Use wallet balance to pay for orders',
        'Sellers receive payments in wallet',
        'View transaction history anytime',
        'Refunds credited back to wallet',
      ],
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Order Process',
      steps: [
        'Pending: Order placed, awaiting seller approval',
        'Processing: Seller preparing your order',
        'Approved: Order confirmed by seller',
        'Ready for Delivery: Order ready to ship',
        'Completed: Delivery verified with code',
        'Cancel within 12 hours if needed',
      ],
    },
    {
      icon: 'location-outline',
      title: 'Location Features',
      steps: [
        'Products sorted by distance from you',
        'See nearby shops and sellers',
        'Get directions to shop locations',
        'Support local businesses in your area',
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How It Works</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Ionicons name="information-circle" size={48} color={colors.primary} />
          <Text style={styles.introTitle}>Welcome to Saknew Market</Text>
          <Text style={styles.introText}>
            A platform connecting buyers and sellers in South Africa. Buy from local shops or start selling your own products!
          </Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon as any} size={28} color={colors.primary} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.steps.map((step, stepIndex) => (
              <View key={stepIndex} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{stepIndex + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footerCard}>
          <Ionicons name="help-circle-outline" size={32} color={colors.primary} />
          <Text style={styles.footerTitle}>Need Help?</Text>
          <Text style={styles.footerText}>
            Contact our support team or send feedback through the app
          </Text>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => navigation.navigate('Feedback' as any)}
          >
            <Text style={styles.feedbackButtonText}>Send Feedback</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  introCard: {
    backgroundColor: colors.card,
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footerCard: {
    backgroundColor: colors.card,
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  feedbackButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  feedbackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HowItWorksScreen;
