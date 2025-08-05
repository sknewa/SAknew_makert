import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductImage } from '../services/shop.types';

interface ProductImageItemProps {
  item: ProductImage;
}

class ProductImageItem extends React.Component<ProductImageItemProps, { imageError: boolean }> {
  constructor(props: ProductImageItemProps) {
    super(props);
    this.state = {
      imageError: false
    };
  }
  
  render() {
    const { item } = this.props;
    const { imageError } = this.state;
    
    return (
      <View style={styles.imageSlide}>
        {!imageError && item.image ? (
          <Image 
            source={{ uri: item.image }} 
            style={styles.carouselImage} 
            resizeMode="contain" 
            onError={() => this.setState({ imageError: true })}
          />
        ) : (
          <Ionicons name="image-outline" size={80} color="#999999" />
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  imageSlide: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
});

export default ProductImageItem;