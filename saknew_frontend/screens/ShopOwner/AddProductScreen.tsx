// saknew_frontend/screens/ShopOwner/AddProductScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Platform, Switch, Image, Keyboard,
} from 'react-native';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { MainNavigationProp } from '../../navigation/types';
import shopService from '../../services/shopService';
import { safeLog, safeError } from '../../utils/securityUtils';

const SA = {
  green: '#007A4D', blue: '#002395', gold: '#FFB81C',
  red: '#DE3831', black: '#111', white: '#fff',
};

interface Category { id: number; name: string; slug: string; parent_category: number | null; parent_category_name: string | null; }
interface SelectedImage { uri: string; isMain: boolean; }

const STEPS = ['Basics', 'Media', 'Inventory'];

const AddProductScreen: React.FC = () => {
  const { user, isAuthenticated = false, refreshUserProfile } = useAuth();
  const navigation = useNavigation<MainNavigationProp>();

  const [step, setStep] = useState(0);

  // Step 1 — Basics
  const [productName, setProductName]           = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice]         = useState('');
  const [isNameFocused, setIsNameFocused]       = useState(false);
  const [isDescFocused, setIsDescFocused]       = useState(false);
  const [isPriceFocused, setIsPriceFocused]     = useState(false);

  // Step 2 — Media
  const [selectedImages, setSelectedImages]     = useState<SelectedImage[]>([]);
  const [imagePickerLoading, setImagePickerLoading] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  // Step 3 — Inventory
  const [productStock, setProductStock]         = useState('');
  const [isProductActive, setIsProductActive]   = useState(true);
  const [isStockFocused, setIsStockFocused]     = useState(false);
  const [allCategories, setAllCategories]       = useState<Category[]>([]);
  const [currentDisplayCategories, setCurrentDisplayCategories] = useState<Category[]>([]);
  const [selectedLeafCategory, setSelectedLeafCategory] = useState<Category | null>(null);
  const [categoryBreadcrumbs, setCategoryBreadcrumbs]   = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading]       = useState(true);

  // Submission
  const [loading, setLoading]           = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const authReady = isAuthenticated;
  const overallLoading = loading || imageUploadLoading || imagePickerLoading;

  useEffect(() => {
    if (authReady && user?.profile?.is_seller) {
      (async () => {
        setCategoriesLoading(true);
        try {
          const res = await apiClient.get<Category[]>('/api/categories/');
          if (res.status === 200) {
            setAllCategories(res.data || []);
            setCurrentDisplayCategories((res.data || []).filter(c => c.parent_category === null));
          }
        } catch { setErrorMessage('Failed to load categories.'); }
        finally { setCategoriesLoading(false); }
      })();
    }
  }, [authReady, user]);

  useEffect(() => {
    if (errorMessage) { const t = setTimeout(() => setErrorMessage(''), 5000); return () => clearTimeout(t); }
  }, [errorMessage]);
  useEffect(() => {
    if (successMessage) { const t = setTimeout(() => setSuccessMessage(''), 5000); return () => clearTimeout(t); }
  }, [successMessage]);

  // ── Category helpers ──
  const handleCategoryPress = useCallback((cat: Category) => {
    const children = allCategories.filter(c => c.parent_category === cat.id);
    if (children.length > 0) {
      setCategoryBreadcrumbs(p => [...p, cat]);
      setCurrentDisplayCategories(children);
      setSelectedLeafCategory(null);
    } else {
      setSelectedLeafCategory(cat);
      const path: Category[] = [];
      let cur: Category | undefined = cat;
      while (cur) { path.unshift(cur); cur = allCategories.find(c => c.id === cur?.parent_category); }
      setCategoryBreadcrumbs(path);
    }
  }, [allCategories]);

  const navigateUpCategory = useCallback(() => {
    setSelectedLeafCategory(null);
    setCategoryBreadcrumbs(prev => {
      const nb = [...prev]; nb.pop();
      setCurrentDisplayCategories(nb.length === 0
        ? allCategories.filter(c => c.parent_category === null)
        : allCategories.filter(c => c.parent_category === nb[nb.length - 1].id));
      return nb;
    });
  }, [allCategories]);

  // ── Image helpers ──
  const pickImages = useCallback(async () => {
    setImagePickerLoading(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Required', 'Please grant media library access.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.5 });
      if (result.canceled || !result.assets?.length) return;
      setSelectedImages(prev => {
        const next = [...prev, ...result.assets.map(a => ({ uri: a.uri, isMain: false }))];
        if (!next.some(i => i.isMain)) next[0].isMain = true;
        return next;
      });
    } catch { Alert.alert('Error', 'Failed to open image library.'); }
    finally { setImagePickerLoading(false); }
  }, []);

  const removeImage = useCallback((uri: string) => {
    setSelectedImages(prev => {
      const next = prev.filter(i => i.uri !== uri);
      if (prev.find(i => i.uri === uri)?.isMain && next.length > 0) next[0].isMain = true;
      return next;
    });
  }, []);

  const setMainImage = useCallback((uri: string) => {
    setSelectedImages(prev => prev.map(i => ({ ...i, isMain: i.uri === uri })));
  }, []);

  const createImageData = useCallback(async (uri: string, isMain: boolean) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return { image: { uri, name: `image_${Date.now()}.jpg`, type: 'image/jpeg', blob }, is_main: isMain };
  }, []);

  // ── Step validation ──
  const validateStep = () => {
    if (step === 0) {
      if (!productName.trim())        { setErrorMessage('Product name is required.'); return false; }
      if (!productDescription.trim()) { setErrorMessage('Description is required.'); return false; }
      const p = parseFloat(productPrice);
      if (isNaN(p) || p <= 0)         { setErrorMessage('Enter a valid price.'); return false; }
    }
    if (step === 1) {
      if (!selectedImages.length)     { setErrorMessage('Select at least one image.'); return false; }
      if (!selectedImages.some(i => i.isMain)) { setErrorMessage('Set one image as main.'); return false; }
    }
    if (step === 2) {
      const s = parseInt(productStock, 10);
      if (isNaN(s) || s < 0)          { setErrorMessage('Enter a valid stock quantity.'); return false; }
      if (!selectedLeafCategory)      { setErrorMessage('Select a product category.'); return false; }
    }
    return true;
  };

  const goNext = () => { if (validateStep()) { setErrorMessage(''); setStep(s => s + 1); } };
  const goBack = () => { setErrorMessage(''); setStep(s => s - 1); };

  // ── Submit ──
  const handleAddProduct = useCallback(async () => {
    if (!validateStep()) return;
    Keyboard.dismiss();
    setLoading(true);
    let productId: number | null = null;
    try {
      const res = await shopService.createProduct({
        name: productName.trim(),
        description: productDescription.trim(),
        price: parseFloat(productPrice).toFixed(2),
        stock: parseInt(productStock, 10),
        category: selectedLeafCategory!.id,
        is_active: isProductActive,
      });
      if (!res.id) { setErrorMessage('Product creation failed.'); return; }
      productId = res.id;
      setSuccessMessage('Product created! Uploading images...');
      setImageUploadLoading(true);
    } catch (err: any) {
      setErrorMessage(err.response?.data ? Object.values(err.response.data).flat().map(String).join('\n') : err.message || 'Failed to add product.');
      return;
    } finally { setLoading(false); }

    if (productId) {
      let allOk = true;
      for (const img of selectedImages) {
        try {
          const data = await createImageData(img.uri, img.isMain);
          await shopService.addProductImage(productId, data);
        } catch { allOk = false; }
      }
      setImageUploadLoading(false);
      if (allOk) {
        setSuccessMessage('Product added successfully!');
        await refreshUserProfile();
        navigation.dispatch(CommonActions.navigate({ name: 'MainTabs', params: { screen: 'ShopTab', params: { screen: 'MyShop' } } }));
      } else {
        setErrorMessage('Product created but some images failed. Edit the product to add them.');
      }
    }
  }, [productName, productDescription, productPrice, productStock, isProductActive, selectedImages, selectedLeafCategory, createImageData, navigation, refreshUserProfile]);

  if (!authReady && user === undefined) {
    return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color={SA.green} /></View></SafeAreaView>;
  }
  if (!isAuthenticated || !user?.profile?.is_seller) {
    return (
      <SafeAreaView style={s.safe}><View style={s.center}>
        <Ionicons name="lock-closed-outline" size={60} color={SA.red} />
        <Text style={s.title}>Access Denied</Text>
        <Text style={s.subtitle}>You must be a seller to add products.</Text>
      </View></SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Stepper header */}
      <View style={s.stepperRow}>
        {STEPS.map((label, i) => (
          <View key={i} style={s.stepItem}>
            <View style={[s.stepCircle, i === step && s.stepCircleActive, i < step && s.stepCircleDone]}>
              {i < step
                ? <Ionicons name="checkmark" size={14} color="#fff" />
                : <Text style={[s.stepNum, i === step && s.stepNumActive]}>{i + 1}</Text>}
            </View>
            <Text style={[s.stepLabel, i === step && s.stepLabelActive]}>{label}</Text>
            {i < STEPS.length - 1 && <View style={[s.stepLine, i < step && s.stepLineDone]} />}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Messages */}
        {errorMessage ? (
          <View style={s.msgError}><Ionicons name="close-circle" size={18} color={SA.red} /><Text style={s.msgErrorText}>{errorMessage}</Text></View>
        ) : null}
        {successMessage ? (
          <View style={s.msgSuccess}><Ionicons name="checkmark-circle" size={18} color={SA.green} /><Text style={s.msgSuccessText}>{successMessage}</Text></View>
        ) : null}

        {/* ── STEP 1: BASICS ── */}
        {step === 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Product Basics</Text>
            <Text style={s.label}>Product Name *</Text>
            <View style={[s.input, isNameFocused && s.inputFocus]}>
              <TextInput style={s.inputText} placeholder="e.g., Organic Honey 500g" placeholderTextColor="#888"
                value={productName} onChangeText={setProductName}
                onFocus={() => setIsNameFocused(true)} onBlur={() => setIsNameFocused(false)} maxLength={200} />
            </View>

            <Text style={s.label}>Description *</Text>
            <View style={[s.input, s.textArea, isDescFocused && s.inputFocus]}>
              <TextInput style={[s.inputText, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe your product..." placeholderTextColor="#888"
                multiline value={productDescription} onChangeText={setProductDescription}
                onFocus={() => setIsDescFocused(true)} onBlur={() => setIsDescFocused(false)} />
            </View>

            <Text style={s.label}>Price (ZAR) *</Text>
            <View style={[s.input, s.priceInput, isPriceFocused && s.priceInputFocus]}>
              <Text style={s.currencyR}>R</Text>
              <TextInput style={s.inputText} placeholder="0.00" placeholderTextColor="#888"
                keyboardType="numeric" value={productPrice} onChangeText={setProductPrice}
                onFocus={() => setIsPriceFocused(true)} onBlur={() => setIsPriceFocused(false)} maxLength={10} />
            </View>
          </View>
        )}

        {/* ── STEP 2: MEDIA ── */}
        {step === 1 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Product Images</Text>
            <TouchableOpacity style={[s.pickBtn, overallLoading && s.btnDisabled]} onPress={pickImages} disabled={overallLoading}>
              {imagePickerLoading
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="image-outline" size={22} color="#fff" /><Text style={s.pickBtnText}>Select Images</Text></>}
            </TouchableOpacity>

            {selectedImages.length === 0
              ? <View style={s.noImgRow}><Text style={s.noImgText}>No images selected yet.</Text><Text style={s.reqStar}> *</Text></View>
              : <Text style={s.imgCount}>{selectedImages.length} image(s) selected</Text>}

            {selectedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator style={s.imgPreviewScroll}>
                {selectedImages.map(img => (
                  <View key={img.uri} style={s.imgWrap}>
                    <Image source={{ uri: img.uri }} style={s.imgThumb} />
                    <TouchableOpacity style={s.imgRemove} onPress={() => removeImage(img.uri)}>
                      <Ionicons name="close-circle" size={22} color={SA.red} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.imgMain, img.isMain && s.imgMainActive]} onPress={() => setMainImage(img.uri)}>
                      <Text style={s.imgMainText}>{img.isMain ? 'Main' : 'Set Main'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            {imageUploadLoading && <ActivityIndicator size="small" color={SA.green} style={{ marginTop: 8 }} />}
          </View>
        )}

        {/* ── STEP 3: INVENTORY ── */}
        {step === 2 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Inventory & Category</Text>

            <Text style={s.label}>Stock Quantity *</Text>
            <View style={[s.input, isStockFocused && s.inputFocus]}>
              <TextInput style={s.inputText} placeholder="e.g., 100" placeholderTextColor="#888"
                keyboardType="numeric" value={productStock} onChangeText={setProductStock}
                onFocus={() => setIsStockFocused(true)} onBlur={() => setIsStockFocused(false)} maxLength={6} />
            </View>

            <Text style={s.label}>Category *</Text>
            {categoriesLoading
              ? <ActivityIndicator size="small" color={SA.green} />
              : (
                <View style={s.catBox}>
                  {categoryBreadcrumbs.length > 0 && (
                    <View style={s.breadcrumbRow}>
                      <TouchableOpacity onPress={navigateUpCategory} style={s.backBtn}>
                        <Ionicons name="arrow-back-outline" size={18} color={SA.black} />
                      </TouchableOpacity>
                      <Text style={s.breadcrumbText}>{categoryBreadcrumbs.map(c => c.name).join(' › ')}</Text>
                      {selectedLeafCategory && (
                        <TouchableOpacity onPress={() => setSelectedLeafCategory(null)} style={s.clearBtn}>
                          <Ionicons name="close-circle-outline" size={18} color={SA.red} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator>
                    <View style={s.catChips}>
                      {currentDisplayCategories.map(cat => (
                        <TouchableOpacity key={cat.id}
                          style={[s.catChip, selectedLeafCategory?.id === cat.id && s.catChipActive]}
                          onPress={() => handleCategoryPress(cat)}>
                          <Text style={[s.catChipText, selectedLeafCategory?.id === cat.id && s.catChipTextActive]}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  {selectedLeafCategory && (
                    <Text style={s.selectedCat}>Selected: <Text style={{ fontWeight: '800' }}>{selectedLeafCategory.name}</Text></Text>
                  )}
                </View>
              )}

            <View style={s.switchRow}>
              <Text style={s.label}>Active (visible to customers)</Text>
              <Switch trackColor={{ false: '#D0D0D0', true: SA.green }}
                thumbColor={Platform.OS === 'android' ? SA.green : '#fff'}
                ios_backgroundColor="#D0D0D0"
                onValueChange={setIsProductActive} value={isProductActive} />
            </View>
          </View>
        )}

        {/* Navigation buttons */}
        <View style={s.navRow}>
          {step > 0 && (
            <TouchableOpacity style={s.backNavBtn} onPress={goBack}>
              <Ionicons name="arrow-back" size={16} color={SA.blue} />
              <Text style={s.backNavText}>Back</Text>
            </TouchableOpacity>
          )}
          {step < STEPS.length - 1 ? (
            <TouchableOpacity style={s.nextBtn} onPress={goNext}>
              <Text style={s.nextBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.submitBtn, overallLoading && s.btnDisabled]} onPress={handleAddProduct} disabled={overallLoading}>
              {overallLoading
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={s.submitBtnText}>Add Product</Text></>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: '#F0F2F5' },
  center:{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scroll:{ padding: 16, paddingBottom: 40 },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  stepItem:   { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: '#002395' },
  stepCircleDone:   { backgroundColor: '#007A4D' },
  stepNum:    { fontSize: 12, fontWeight: '700', color: '#888' },
  stepNumActive: { color: '#fff' },
  stepLabel:  { fontSize: 10, color: '#888', fontWeight: '600', marginLeft: 6, marginRight: 4 },
  stepLabelActive: { color: '#002395', fontWeight: '800' },
  stepLine:   { width: 24, height: 2, backgroundColor: '#E0E0E0', marginHorizontal: 4 },
  stepLineDone: { backgroundColor: '#007A4D' },

  // Messages
  msgError:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#DE3831', gap: 8 },
  msgErrorText: { color: '#DE3831', fontSize: 12, flex: 1, fontWeight: '600' },
  msgSuccess: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D4EFDF', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#007A4D', gap: 8 },
  msgSuccessText: { color: '#007A4D', fontSize: 12, flex: 1, fontWeight: '600' },

  // Card
  card:      { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#C8A96E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 16 },

  // Inputs
  label:     { fontSize: 12, fontWeight: '700', color: '#444', marginBottom: 6, marginTop: 10 },
  input:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderWidth: 1.5, borderColor: '#D0D0D0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 8, marginBottom: 4 },
  inputFocus:{ borderColor: '#002395', backgroundColor: '#F0F4FF' },
  textArea:  { alignItems: 'flex-start', paddingTop: 10 },
  priceInput:{ borderColor: '#FFB81C' },
  priceInputFocus: { borderColor: '#FFB81C', borderWidth: 2 },
  currencyR: { fontSize: 15, fontWeight: '800', color: '#111', marginRight: 6 },
  inputText: { flex: 1, fontSize: 14, color: '#111' },

  // Image picker
  pickBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007A4D', borderRadius: 10, paddingVertical: 12, marginBottom: 12, gap: 8, shadowColor: '#007A4D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  pickBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  noImgRow:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  noImgText:   { fontSize: 12, color: '#555' },
  reqStar:     { fontSize: 14, fontWeight: '800', color: '#DE3831' },
  imgCount:    { fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 8 },
  imgPreviewScroll: { marginBottom: 8 },
  imgWrap:     { marginRight: 8, width: 80, height: 80, borderRadius: 8, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#D0D0D0' },
  imgThumb:    { width: '100%', height: '100%', resizeMode: 'cover' },
  imgRemove:   { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 12, zIndex: 1 },
  imgMain:     { position: 'absolute', bottom: 3, left: 3, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  imgMainActive: { backgroundColor: '#007A4D' },
  imgMainText: { color: '#fff', fontSize: 8, fontWeight: '700' },

  // Category
  catBox:       { backgroundColor: '#FAFAFA', borderWidth: 1.5, borderColor: '#D0D0D0', borderRadius: 10, padding: 10, marginBottom: 4 },
  breadcrumbRow:{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backBtn:      { padding: 4, marginRight: 6 },
  breadcrumbText: { flex: 1, fontSize: 11, fontWeight: '600', color: '#111' },
  clearBtn:     { padding: 4 },
  catChips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip:      { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#002395', backgroundColor: '#fff' },
  catChipActive:{ backgroundColor: '#002395', borderColor: '#002395' },
  catChipText:  { fontSize: 11, fontWeight: '600', color: '#111' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  selectedCat:  { fontSize: 11, color: '#007A4D', marginTop: 8, textAlign: 'center' },

  // Switch
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },

  // Nav buttons
  navRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  backNavBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#002395' },
  backNavText: { color: '#002395', fontWeight: '700', fontSize: 14 },
  nextBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#002395', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, marginLeft: 'auto', shadowColor: '#002395', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  submitBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#007A4D', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, marginLeft: 'auto', shadowColor: '#007A4D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },

  // Misc
  title:    { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center' },
});

export default AddProductScreen;
