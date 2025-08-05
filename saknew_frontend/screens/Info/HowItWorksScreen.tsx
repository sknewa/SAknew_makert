// saknew_frontend/screens/Info/HowItWorksScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

const HowItWorksScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.container}>
          <Text style={styles.title}>How Hustlers SA Works</Text>
          <Text style={styles.sectionTitle}>For Buyers:</Text>
          <Text style={styles.paragraph}>
            1. Browse Products: Explore a wide range of products from various sellers.
          </Text>
          <Text style={styles.paragraph}>
            2. Add to Cart: Select items and add them to your shopping cart.
          </Text>
          <Text style={styles.paragraph}>
            3. Checkout: Provide your shipping details and choose a payment method (wallet or Stripe).
          </Text>
          <Text style={styles.paragraph}>
            4. Verify Delivery: Once your order arrives, use a unique code to confirm delivery and release payment to the seller.
          </Text>

          <Text style={styles.sectionTitle}>For Sellers:</Text>
          <Text style={styles.paragraph}>
            1. Create Your Shop: Set up your online store within the marketplace.
          </Text>
          <Text style={styles.paragraph}>
            2. List Products: Add your products with descriptions and images.
          </Text>
          <Text style={styles.paragraph}>
            3. Manage Orders: Track incoming orders and mark them as shipped.
          </Text>
          <Text style={styles.paragraph}>
            4. Receive Payments: Once a buyer verifies delivery, funds are credited to your in-app wallet.
          </Text>

          <Text style={styles.sectionTitle}>Our Commitment:</Text>
          <Text style={styles.paragraph}>
            Hustlers SA is committed to providing a secure and fair marketplace for both buyers and sellers. We ensure secure transactions and a transparent delivery verification process.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  container: {
    width: '90%',
    maxWidth: 600,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 25,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 10,
  },
});

export default HowItWorksScreen;
