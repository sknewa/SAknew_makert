import { useState, useCallback, useEffect } from 'react';

interface PaginationOptions<T> {
  initialData?: T[];
  pageSize?: number;
  fetchFunction: (page: number, limit: number) => Promise<T[]>;
  onError?: (error: any) => void;
}

interface PaginationResult<T> {
  data: T[];
  loading: boolean;
  error: any;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshing: boolean;
}

export function usePagination<T>({
  initialData = [],
  pageSize = 10,
  fetchFunction,
  onError
}: PaginationOptions<T>): PaginationResult<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const initialItems = await fetchFunction(1, pageSize);
      setData(initialItems);
      setHasMore(initialItems.length === pageSize);
      setCurrentPage(1);
    } catch (err) {
      setError(err);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, pageSize, onError]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const nextPage = currentPage + 1;
      const newItems = await fetchFunction(nextPage, pageSize);
      
      if (newItems.length > 0) {
        setData(prevData => [...prevData, ...newItems]);
        setCurrentPage(nextPage);
        setHasMore(newItems.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, currentPage, fetchFunction, pageSize, onError]);

  // Refresh data
  const refresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    setError(null);
    
    try {
      const refreshedItems = await fetchFunction(1, pageSize);
      setData(refreshedItems);
      setHasMore(refreshedItems.length === pageSize);
      setCurrentPage(1);
    } catch (err) {
      setError(err);
      if (onError) {
        onError(err);
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, fetchFunction, pageSize, onError]);

  // Load initial data on mount
  useEffect(() => {
    if (initialData.length === 0) {
      loadInitialData();
    }
  }, [loadInitialData, initialData.length]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    refreshing
  };
}