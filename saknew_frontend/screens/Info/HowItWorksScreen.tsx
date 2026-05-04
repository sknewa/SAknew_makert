import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const SA = {
  green:  '#007A4D',
  gold:   '#FFB81C',
  red:    '#DE3831',
  blue:   '#002395',
  bg:     '#FAF8F4',
  card:   '#FFFFFF',
  text:   '#1A1A2E',
  sub:    '#64748B',
};

const buyerSteps = [
  { icon: 'search-outline',        label: 'Browse Products',     desc: 'Explore a wide range of products from verified South African sellers.' },
  { icon: 'cart-outline',          label: 'Add to Cart',         desc: 'Select items and add them to your shopping cart with one tap.' },
  { icon: 'card-outline',          label: 'Checkout',            desc: 'Provide your shipping details and pay securely from your wallet.' },
  { icon: 'checkmark-circle-outline', label: 'Verify Delivery',  desc: 'Enter the unique delivery code when your order arrives to release payment.' },
];

const sellerSteps = [
  { icon: 'storefront-outline',    label: 'Create Your Shop',    desc: 'Set up your online store inside SAMakert in minutes.' },
  { icon: 'pricetag-outline',      label: 'List Products',       desc: 'Add products with photos, descriptions, and prices.' },
  { icon: 'receipt-outline',       label: 'Manage Orders',       desc: 'Track incoming orders and mark them as ready for delivery.' },
  { icon: 'wallet-outline',        label: 'Receive Payments',    desc: 'Funds are credited to your wallet once the buyer confirms delivery.' },
];

const gettingStarted = [
  { icon: 'person-add-outline',    label: 'Register',            desc: 'Create a free account with your email address.' },
  { icon: 'mail-outline',          label: 'Verify Email',        desc: 'Confirm your email to activate your account.' },
  { icon: 'log-in-outline',        label: 'Sign In',             desc: 'Log in and start buying or selling right away.' },
];

type Step = { icon: string; label: string; desc: string };

const StepCard = ({
  step, index, accentColor, borderColor,
}: { step: Step; index: number; accentColor: string; borderColor: string }) => (
  <View style={[s.stepCard, { borderTopColor: borderColor }]}>
    <View style={[s.stepNum, { backgroundColor: accentColor, shadowColor: accentColor }]}>
      <Text style={s.stepNumText}>{index + 1}</Text>
    </View>
    <View style={s.stepBody}>
      <View style={s.stepTitleRow}>
        <Ionicons name={step.icon as any} size={18} color={accentColor} style={{ marginRight: 6 }} />
        <Text style={s.stepLabel}>{step.label}</Text>
      </View>
      <Text style={s.stepDesc}>{step.desc}</Text>
    </View>
  </View>
);

const Section = ({
  icon, title, color, steps, borderColor,
}: { icon: string; title: string; color: string; steps: Step[]; borderColor: string }) => (
  <View style={s.section}>
    <View style={s.sectionHeader}>
      <Ionicons name={icon as any} size={22} color={color} style={{ marginRight: 8 }} />
      <Text style={[s.sectionTitle, { color }]}>{title}</Text>
    </View>
    {steps.map((step, i) => (
      <StepCard key={i} step={step} index={i} accentColor={color} borderColor={borderColor} />
    ))}
  </View>
);

const HowItWorksScreen = () => {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={SA.bg} />

      {/* Flag bar */}
      <View style={s.flagBar}>
        {[SA.green, SA.gold, SA.red, SA.blue, '#000', '#fff'].map((c, i) => (
          <View key={i} style={[s.flagSeg, { backgroundColor: c }]} />
        ))}
      </View>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={SA.green} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>How It Works</Text>
          <Text style={s.headerSub}><Text style={s.headerSA}>SA</Text>Makert — South Africa's marketplace</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Section
          icon="rocket-outline"
          title="Getting Started"
          color={SA.green}
          borderColor={SA.green}
          steps={gettingStarted}
        />

        <Section
          icon="bag-handle-outline"
          title="For Buyers"
          color={SA.blue}
          borderColor={SA.blue}
          steps={buyerSteps}
        />

        <Section
          icon="storefront-outline"
          title="For Sellers"
          color={SA.gold}
          borderColor={SA.gold}
          steps={sellerSteps}
        />

        {/* Commitment banner */}
        <View style={s.banner}>
          <Ionicons name="shield-checkmark-outline" size={20} color={SA.red} style={{ marginRight: 8 }} />
          <Text style={s.bannerText}>
            SAMakert ensures secure transactions and a transparent delivery verification process for every South African buyer and seller.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: SA.bg },

  flagBar: { flexDirection: 'row', height: 3 },
  flagSeg: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: SA.bg,
  },
  backBtn: {
    padding: 8, borderRadius: 10,
    backgroundColor: '#E8F5EE', marginRight: 12,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: SA.text },
  headerSub:   { fontSize: 12, color: SA.sub, marginTop: 1 },
  headerSA:    { color: SA.gold, fontWeight: '800' },

  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },

  stepCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: SA.card, borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  stepNum: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, marginTop: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 5, elevation: 5,
  },
  stepNumText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  stepBody:    { flex: 1 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  stepLabel:   { fontSize: 15, fontWeight: '700', color: SA.text },
  stepDesc:    { fontSize: 13, color: SA.sub, lineHeight: 20 },

  banner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF5F5', borderRadius: 14,
    padding: 16, borderLeftWidth: 4, borderLeftColor: SA.red,
    marginTop: 4,
  },
  bannerText: { flex: 1, fontSize: 13, color: '#7F1D1D', lineHeight: 20 },
});

export default HowItWorksScreen;
