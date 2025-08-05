import React, { memo } from 'react';
import { FlatList, FlatListProps } from 'react-native';

// Default item height (can be overridden)
const DEFAULT_ITEM_HEIGHT = 100;

interface OptimizedFlatListProps<T> extends FlatListProps<T> {
  itemHeight?: number;
}

function OptimizedFlatList<T>({
  itemHeight = DEFAULT_ITEM_HEIGHT,
  initialNumToRender = 5,
  maxToRenderPerBatch = 10,
  windowSize = 5,
  updateCellsBatchingPeriod = 50,
  removeClippedSubviews = true,
  keyExtractor,
  ...rest
}: OptimizedFlatListProps<T>) {
  // Generate getItemLayout function if itemHeight is provided
  const getItemLayout = (data: T[] | null | undefined, index: number) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  });

  return (
    <FlatList
      removeClippedSubviews={removeClippedSubviews}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      updateCellsBatchingPeriod={updateCellsBatchingPeriod}
      getItemLayout={getItemLayout}
      keyExtractor={keyExtractor || ((item: any, index) => (item?.key != null ? String(item.key) : String(index)))}
      {...rest}
    />
  );
}

export default memo(OptimizedFlatList);