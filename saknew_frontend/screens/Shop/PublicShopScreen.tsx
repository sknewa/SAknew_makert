// saknew_frontend/screens/Shop/PublicShopScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import shopService from '../../services/shopService';
import statusService from '../../services/statusService';
import { Shop, Product } from '../../services/shop.types';
import { UserStatus } from '../../services/status.types';
import ProductCard from '../../components/ProductCard';

const colors = {
  primary: '#28A745',
  background: '#F8F9FA',
  card: '#FFFFFF',
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  border: '#DEE2E6',
  accent: '#FFD700',
};

const { width } = Dimensions.get('window');

type PublicShopScreenRouteProp = RouteProp<{ params: { shopSlug: string } }, 'params'>;

const PublicShopScreen: React.FC = () => {
  const route = useRoute<PublicShopScreenRouteProp>();
  const navigation = useNavigation();
  const { shopSlug } = route.params;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [statuses, setStatuses] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<{ id: string; name: string; count: number }[]>([]);

  const fetchShopData = useCallback(async () => {
    try {
      const [shopData, productsData] = await Promise.all([
        shopService.getShopBySlug(shopSlug),
        shopService.getShopProducts(shopSlug),
      ]);

      setShop(shopData);
      const productList = Array.isArray(productsData) ? productsData : productsData.results || [];
      setProducts(productList);
      setFilteredProducts(productList);

      // Extract unique categories from products
      const categoryMap = new Map<string, { name: string; count: number }>();
      productList.forEach((product) => {
        if (product.category_name) {
          const existing = categoryMap.get(product.category_slug);
          if (existing) {
            existing.count++;
          } else {
            categoryMap.set(product.category_slug, {
              name: product.category_name,
              count: 1,
            });
          }
        }
      });

      const categoryList = [
        { id: 'all', name: 'All Products', count: productList.length },
        ...Array.from(categoryMap.entries()).map(([slug, data]) => ({
          id: slug,
          name: data.name,
          count: data.count,
        })),
      ];
      setCategories(categoryList);

      // Fetch seller statuses
      if (shopData.user?.id) {
        const userStatuses = await statusService.getUserStatuses();
        const sellerStatuses = userStatuses.filter((s) => s.user.id === shopData.user.id);
        setStatuses(sellerStatuses);
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopSlug]);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  useEffect(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category_slug === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchShopData();
  };

  const handleStatusPress = (userStatus: UserStatus) => {
    navigation.navigate('StatusViewer' as never, { userStatus } as never);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading shop...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.textSecondary} />
          <Text style={styles.errorText}>Shop not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        stickyHeaderIndices={[1]}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.shopInfo}>
            <View style={styles.shopBadge}>
              <Ionicons name="storefront" size={32} color={colors.primary} />
            </View>
            <Text style={styles.shopName}>{shop.name}</Text>
            {shop.description && (
              <Text style={styles.shopDescription}>{shop.description}</Text>
            )}
            
            {/* Shop Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="cube-outline" size={18} color={colors.primary} />
                <Text style={styles.statText}>{products.length} Products</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <Text style={styles.statText}>{shop.town || 'Location'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Statuses Section */}
        {statuses.length > 0 && (
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Shop Updates</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {statuses.map((userStatus) => (
                <TouchableOpacity
                  key={userStatus.user.id}
                  style={styles.statusCard}
                  onPress={() => handleStatusPress(userStatus)}
                >
                  <View
                    style={[
                      styles.statusPreview,
                      { backgroundColor: userStatus.latest_status?.background_color || '#25D366' },
                    ]}
                  >
                    <Text style={styles.statusContent} numberOfLines={3}>
                      {userStatus.latest_status?.content || userStatus.statuses[0]?.content}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Navigation */}
        {categories.length > 1 && (
          <View style={styles.categoryNav}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name} ({cat.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Products Grid */}
        <View style={styles.productsContainer}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={60} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No products found' : 'No products available'}
              </Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((product) => (
                <View key={product.id} style={styles.productWrapper}>
                  <ProductCard
                    product={product}
                    isShopOwner={false}
                    navigation={navigation}
                    onPress={() =>
                      navigation.navigate('ProductDetail' as never, { productId: product.id } as never)
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.card,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopInfo: {
    alignItems: 'center',
  },
  shopBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  shopName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  shopDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusSection: {
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  statusCard: {
    width: 100,
    height: 140,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusPreview: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContent: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchContainer: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  categoryNav: {
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  productsContainer: {
    padding: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
  },
});

export default PublicShopScreen;
