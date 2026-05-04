import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/apiClient';
import { colors } from '../../styles/globalStyles';
import { getMyWallet } from '../../services/walletService';
import BackButton from '../../components/BackButton';

// ── App theme (matches globalStyles.ts) ──────────────────────
const C = {
  bg:           '#F4F6FB',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F8FAFF',
  border:       '#E8ECF4',
  primary:      '#6C63FF',
  primaryLight: '#EEF0FF',
  success:      '#22C55E',
  error:        '#EF4444',
  textPrimary:  '#0F172A',
  textSecondary:'#64748B',
  textMuted:    '#94A3B8',
};

const SA_BANKS = [
  { name: 'Absa Bank', branch: '632005' },
  { name: 'African Bank', branch: '430000' },
  { name: 'Bidvest Bank', branch: '462005' },
  { name: 'Capitec Bank', branch: '470010' },
  { name: 'Discovery Bank', branch: '679000' },
  { name: 'First National Bank (FNB)', branch: '250655' },
  { name: 'Grindrod Bank', branch: '223626' },
  { name: 'Investec Bank', branch: '580105' },
  { name: 'Mercantile Bank', branch: '450905' },
  { name: 'Nedbank', branch: '198765' },
  { name: 'Old Mutual Bank', branch: '462005' },
  { name: 'Sasfin Bank', branch: '683000' },
  { name: 'Standard Bank', branch: '051001' },
  { name: 'TymeBank', branch: '678910' },
  { name: 'Ubank', branch: '431010' },
];

const ACCOUNT_TYPES = ['Cheque', 'Savings', 'Transmission'];

const WithdrawScreen: React.FC = () => {
  const navigation = useNavigation() as any;
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState<{ name: string; branch: string } | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountType, setAccountType] = useState('Cheque');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<string>('0.00');

  const [showBankModal, setShowBankModal] = useState(false);
  const [showAccountTypeModal, setShowAccountTypeModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [withdrawnAmount, setWithdrawnAmount] = useState('');
  const [pendingAmount, setPendingAmount] = useState(0);

  useEffect(() => {
    getMyWallet().then(w => setBalance(w.balance)).catch(() => {});
  }, []);

  const handleWithdraw = () => {
    if (!amount || !selectedBank || !accountNumber || !accountHolder) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 100) {
      Alert.alert('Invalid Amount', 'Minimum withdrawal is R100.');
      return;
    }
    if (amountNum > parseFloat(balance)) {
      Alert.alert('Insufficient Funds', `Your wallet balance is R${parseFloat(balance).toFixed(2)}.`);
      return;
    }
    setPendingAmount(amountNum);
    setConfirmModal(true);
  };

  const submitWithdrawal = async () => {
    setConfirmModal(false);
    setLoading(true);
    try {
      await apiClient.post('/api/wallet/withdraw/', {
        amount: pendingAmount,
        bank_name: selectedBank!.name,
        bank_account: accountNumber,
        account_holder: accountHolder,
        account_type: accountType,
        branch_code: selectedBank!.branch,
      });
      setWithdrawnAmount(pendingAmount.toFixed(2));
      // Refresh balance after deduction
      getMyWallet().then(w => setBalance(w.balance)).catch(() => {});
      setSuccessModal(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to submit withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessOk = () => {
    setSuccessModal(false);
    (navigation as any).navigate('WalletDashboard');
  };

  const amountNum = parseFloat(amount) || 0;
  const isValid = amount && selectedBank && accountNumber && accountHolder && amountNum >= 100 && amountNum <= parseFloat(balance);

  return (
    <SafeAreaView style={styles.safe}>

      {/* Bank Picker Modal */}
      <Modal visible={showBankModal} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Your Bank</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SA_BANKS}
              keyExtractor={item => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, selectedBank?.name === item.name && styles.pickerItemActive]}
                  onPress={() => { setSelectedBank(item); setShowBankModal(false); }}
                >
                  <View style={styles.pickerItemLeft}>
                    <View style={styles.bankIcon}>
                      <Text style={styles.bankIconText}>{item.name[0]}</Text>
                    </View>
                    <View>
                      <Text style={[styles.pickerItemText, selectedBank?.name === item.name && styles.pickerItemTextActive]}>
                        {item.name}
                      </Text>
                      <Text style={styles.branchText}>Branch: {item.branch}</Text>
                    </View>
                  </View>
                  {selectedBank?.name === item.name && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Account Type Picker Modal */}
      <Modal visible={showAccountTypeModal} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { maxHeight: 280 }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Account Type</Text>
              <TouchableOpacity onPress={() => setShowAccountTypeModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {ACCOUNT_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.pickerItem, accountType === type && styles.pickerItemActive]}
                onPress={() => { setAccountType(type); setShowAccountTypeModal(false); }}
              >
                <Text style={[styles.pickerItemText, accountType === type && styles.pickerItemTextActive]}>{type}</Text>
                {accountType === type && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Confirm Modal */}
      <Modal visible={confirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="wallet-outline" size={32} color={C.primary} />
            </View>
            <Text style={styles.modalTitle}>Confirm Withdrawal</Text>
            <View style={styles.summaryBox}>
              <SummaryRow label="Amount" value={`R${pendingAmount.toFixed(2)}`} highlight />
              <SummaryRow label="Bank" value={selectedBank?.name || ''} />
              <SummaryRow label="Account" value={accountNumber} />
              <SummaryRow label="Account Type" value={accountType} />
              <SummaryRow label="Branch Code" value={selectedBank?.branch || ''} />
            </View>
            <Text style={styles.modalNote}>
              Funds will be deducted immediately and transferred within 2 business days.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={submitWithdrawal}>
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark" size={32} color="#22C55E" />
            </View>
            <Text style={styles.modalTitle}>Withdrawal Submitted</Text>
            <Text style={styles.successAmount}>R{withdrawnAmount}</Text>
            <Text style={styles.successSub}>
              Your withdrawal has been logged and{'\n'}will be processed within 2 business days.{'\n'}A confirmation email has been sent to you.
            </Text>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSuccessOk}>
              <Text style={styles.confirmBtnText}>Back to Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BackButton title="Withdraw Funds" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceIconWrap}>
            <Ionicons name="wallet-outline" size={22} color={C.primary} />
          </View>
          <View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>R{parseFloat(balance).toFixed(2)}</Text>
          </View>
        </View>

        {/* Amount Section */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>WITHDRAWAL AMOUNT</Text>
          <View style={styles.amountInputWrap}>
            <Text style={styles.currencySymbol}>R</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor={C.textMuted}
            />
          </View>
          {amountNum > 0 && amountNum < 100 && (
            <Text style={styles.fieldError}>Minimum withdrawal is R100</Text>
          )}
          {amountNum > parseFloat(balance) && (
            <Text style={styles.fieldError}>Amount exceeds your balance</Text>
          )}
          <View style={styles.quickAmounts}>
            {[100, 200, 500, 1000].map(q => (
              <TouchableOpacity
                key={q}
                style={[styles.quickBtn, amountNum === q && styles.quickBtnActive]}
                onPress={() => setAmount(String(q))}
              >
                <Text style={[styles.quickBtnText, amountNum === q && styles.quickBtnTextActive]}>R{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bank Details Section */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>BANK DETAILS</Text>

          <Text style={styles.fieldLabel}>Bank Name *</Text>
          <TouchableOpacity style={styles.selectField} onPress={() => setShowBankModal(true)}>
            {selectedBank ? (
              <View style={styles.selectedBankRow}>
                <View style={styles.bankIconSm}>
                  <Text style={styles.bankIconSmText}>{selectedBank.name[0]}</Text>
                </View>
                <View>
                  <Text style={styles.selectFieldText}>{selectedBank.name}</Text>
                  <Text style={styles.branchText}>Branch: {selectedBank.branch}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.selectPlaceholder}>Select your bank</Text>
            )}
            <Ionicons name="chevron-down" size={18} color={C.textMuted} />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Account Holder Name *</Text>
          <TextInput
            style={styles.field}
            placeholder="Full name as per bank"
            value={accountHolder}
            onChangeText={setAccountHolder}
            placeholderTextColor={C.textMuted}
          />

          <Text style={styles.fieldLabel}>Account Number *</Text>
          <TextInput
            style={styles.field}
            placeholder="Enter account number"
            keyboardType="numeric"
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholderTextColor={C.textMuted}
          />

          <Text style={styles.fieldLabel}>Account Type</Text>
          <TouchableOpacity style={styles.selectField} onPress={() => setShowAccountTypeModal(true)}>
            <Text style={styles.selectFieldText}>{accountType}</Text>
            <Ionicons name="chevron-down" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || loading) && styles.submitBtnDisabled]}
          onPress={handleWithdraw}
          disabled={!isValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="arrow-up-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Withdraw Funds</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Funds will be held as pending until processed by our team within 2 business days.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const SummaryRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40 },

  // Balance card
  balanceCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 16, borderWidth: 1, borderColor: C.border,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  balanceIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  balanceLabel: { fontSize: 12, color: C.textSecondary, marginBottom: 2 },
  balanceAmount: { fontSize: 26, fontWeight: '800', color: C.textPrimary },

  // Cards / sections
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: C.border,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textMuted,
    letterSpacing: 1.2, marginBottom: 14,
  },

  // Amount input
  amountInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: C.primary, paddingBottom: 8, marginBottom: 8,
  },
  currencySymbol: { fontSize: 26, fontWeight: '700', color: C.textPrimary, marginRight: 6 },
  amountInput:    { flex: 1, fontSize: 34, fontWeight: '800', color: C.textPrimary },
  fieldError:     { fontSize: 12, color: C.error, marginBottom: 8 },

  quickAmounts: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickBtn: {
    flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
  },
  quickBtnActive:     { backgroundColor: C.primaryLight, borderColor: C.primary },
  quickBtnText:       { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  quickBtnTextActive: { color: C.primary, fontWeight: '700' },

  // Form fields
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 6, marginTop: 12 },
  field: {
    backgroundColor: C.surfaceAlt, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: C.textPrimary, marginBottom: 2,
  },
  selectField: {
    backgroundColor: C.surfaceAlt, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2,
  },
  selectFieldText:  { fontSize: 15, color: C.textPrimary, fontWeight: '500' },
  selectPlaceholder:{ fontSize: 15, color: C.textMuted },
  selectedBankRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  bankIconSm: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  bankIconSmText: { color: C.primary, fontWeight: '800', fontSize: 14 },
  branchText:     { fontSize: 11, color: C.textMuted, marginTop: 1 },

  // Submit
  submitBtn: {
    backgroundColor: C.primary, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: C.border, shadowOpacity: 0 },
  submitBtnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
  disclaimer:        { fontSize: 11, color: C.textMuted, textAlign: 'center', lineHeight: 16 },

  // Picker sheet
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  pickerTitle:   { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  pickerItemActive:     { backgroundColor: C.primaryLight },
  pickerItemLeft:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bankIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  bankIconText:         { color: C.primary, fontWeight: '800', fontSize: 16 },
  pickerItemText:       { fontSize: 15, color: C.textPrimary, fontWeight: '500' },
  pickerItemTextActive: { color: C.primary, fontWeight: '700' },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: C.surface, borderRadius: 24, padding: 24,
    width: '100%', maxWidth: 380, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 16 },
  summaryBox: {
    width: '100%', backgroundColor: C.surfaceAlt, borderRadius: 12,
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border,
  },
  summaryRow:             { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryLabel:           { fontSize: 13, color: C.textSecondary },
  summaryValue:           { fontSize: 13, color: C.textPrimary, fontWeight: '600' },
  summaryValueHighlight:  { fontSize: 16, color: C.primary, fontWeight: '900' },
  modalNote:   { fontSize: 12, color: C.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  modalActions:{ flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  cancelBtnText:  { color: C.textSecondary, fontSize: 15, fontWeight: '700' },
  confirmBtn: {
    flex: 1, backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  successAmount:  { fontSize: 38, fontWeight: '900', color: C.primary, marginBottom: 8 },
  successSub:     { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
});

export default WithdrawScreen;
