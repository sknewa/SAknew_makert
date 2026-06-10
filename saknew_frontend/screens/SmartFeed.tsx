import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import aiService from '../services/aiService';

export default function SmartFeed() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      // placeholder coords (Johannesburg)
      const res = await aiService.getRecommendations({ lat: -26.2041, lng: 28.0473 });
      setItems(res.results || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, padding: 12 }}>
      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text style={{ fontWeight: '700' }}>{item.title}</Text>
              <Text numberOfLines={2} style={{ marginTop: 6 }}>{item.description}</Text>
              <Text style={{ marginTop: 8, color: '#666' }}>{Math.round(item.distance_km)} km away</Text>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        />
      )}
    </View>
  );
}
