import React, { useState } from 'react';
import { View, Modal, Text, TextInput, Button, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import aiService from '../services/aiService';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave?: (draft: any) => void;
}

export default function AIListingAssistant({ visible, onClose, onSave }: Props) {
  const [keywords, setKeywords] = useState('Handmade, wooden, coaster');
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processedPngB64, setProcessedPngB64] = useState<string | null>(null);
  const [processedGifB64, setProcessedGifB64] = useState<string | null>(null);
  const [aiCategory, setAiCategory] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    try {
      const res = await aiService.generateListing({ keywords, tone, length: 'short' });
      setAiCategory(res.category || null);
      setResult(res);
    } catch (e) {
      console.warn('AI generation failed', e);
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return alert('Please allow access to photos');
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (picked.canceled || (picked as any).cancelled) return;
    const uri = Array.isArray((picked as any).assets) ? (picked as any).assets[0].uri : (picked as any).uri;
    setLocalImageUri(uri);
  }

  async function uploadAndProcess() {
    if (!localImageUri) return alert('Select an image first');
    setProcessing(true);
    try {
      const resp = await aiService.processImageFile({ uri: localImageUri });
      if (resp.png_base64) setProcessedPngB64(resp.png_base64);
      if (resp.gif_base64) setProcessedGifB64(resp.gif_base64);
    } catch (e) {
      console.warn('Image processing failed', e);
      alert('Image processing failed');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <Text style={styles.title}>AI Listing Assistant</Text>
        <Text style={styles.label}>Keywords (comma separated)</Text>
        <TextInput style={styles.input} value={keywords} onChangeText={setKeywords} />
        <Text style={styles.label}>Tone</Text>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setTone('professional')} style={[styles.toneBtn, tone === 'professional' && styles.toneActive]}>
            <Text>Professional</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTone('friendly')} style={[styles.toneBtn, tone === 'friendly' && styles.toneActive]}>
            <Text>Friendly</Text>
          </TouchableOpacity>
        </View>

        <Button title="Generate" onPress={generate} disabled={loading} />
        {loading && <ActivityIndicator style={{ marginTop: 12 }} />}

        <View style={{ marginTop: 12 }}>
          <Button title="Pick Image" onPress={pickImage} />
          {localImageUri && <Image source={{ uri: localImageUri }} style={{ width: 120, height: 120, marginTop: 8, borderRadius: 8 }} />}
          <Button title="Process Image (Remove BG + 3D)" onPress={uploadAndProcess} disabled={processing} />
          {processing && <ActivityIndicator style={{ marginTop: 8 }} />}
          {processedPngB64 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: '700' }}>Processed Preview</Text>
              <Image source={{ uri: `data:image/png;base64,${processedPngB64}` }} style={{ width: 160, height: 160, marginTop: 8 }} />
            </View>
          )}
          {processedGifB64 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: '700' }}>Animated Preview</Text>
              <Image source={{ uri: `data:image/gif;base64,${processedGifB64}` }} style={{ width: 160, height: 160, marginTop: 8 }} />
            </View>
          )}
        </View>

        {result && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: 'bold' }}>{result.title}</Text>
            {aiCategory ? <Text style={{ marginTop: 6, fontSize: 12, color: '#555' }}>Category: {aiCategory}</Text> : null}
            <Text style={{ marginTop: 8 }}>{result.description}</Text>
            <Button title="Save Draft" onPress={() => { onSave && onSave({ ...result, category: aiCategory, image_png_b64: processedPngB64, image_gif_b64: processedGifB64 }); onClose(); }} />
          </View>
        )}

        <View style={{ marginTop: 24 }}>
          <Button title="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  label: { marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6 },
  toneBtn: { padding: 8, marginRight: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 },
  toneActive: { borderColor: '#FFB81C', backgroundColor: '#FFF6E0' }
});
