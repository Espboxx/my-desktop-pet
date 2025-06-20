import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 优化的状态管理hook
 * 提供批量更新、防抖更新和状态同步功能
 */
export function useOptimizedState<T>(
  initialState: T,
  options: {
    debounceMs?: number;
    batchUpdates?: boolean;
    onStateChange?: (newState: T, prevState: T) => void;
  } = {}
) {
  const { debounceMs = 0, batchUpdates = false, onStateChange } = options;
  
  const [state, setState] = useState<T>(initialState);
  const stateRef = useRef<T>(initialState);
  const pendingUpdatesRef = useRef<Array<(prev: T) => T>>([]);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  // 更新ref值
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 批量处理更新
  const processPendingUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length === 0 || isUpdatingRef.current) return;
    
    isUpdatingRef.current = true;
    const updates = [...pendingUpdatesRef.current];
    pendingUpdatesRef.current = [];
    
    setState(prevState => {
      let newState = prevState;
      updates.forEach(update => {
        newState = update(newState);
      });
      
      if (onStateChange && newState !== prevState) {
        onStateChange(newState, prevState);
      }
      
      return newState;
    });
    
    isUpdatingRef.current = false;
  }, [onStateChange]);

  // 防抖更新
  const debouncedUpdate = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      processPendingUpdates();
      debounceTimeoutRef.current = null;
    }, debounceMs);
  }, [processPendingUpdates, debounceMs]);

  // 优化的setState
  const setOptimizedState = useCallback((
    update: T | ((prev: T) => T)
  ) => {
    const updateFn = typeof update === 'function' ? update as (prev: T) => T : () => update;
    
    if (batchUpdates || debounceMs > 0) {
      pendingUpdatesRef.current.push(updateFn);
      
      if (debounceMs > 0) {
        debouncedUpdate();
      } else {
        // 使用requestAnimationFrame进行批量更新
        requestAnimationFrame(processPendingUpdates);
      }
    } else {
      // 立即更新
      setState(prevState => {
        const newState = updateFn(prevState);
        if (onStateChange && newState !== prevState) {
          onStateChange(newState, prevState);
        }
        return newState;
      });
    }
  }, [batchUpdates, debounceMs, debouncedUpdate, processPendingUpdates, onStateChange]);

  // 强制立即更新
  const forceUpdate = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    processPendingUpdates();
  }, [processPendingUpdates]);

  // 获取当前状态（同步）
  const getCurrentState = useCallback(() => {
    return stateRef.current;
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    setState: setOptimizedState,
    getCurrentState,
    forceUpdate,
    hasPendingUpdates: () => pendingUpdatesRef.current.length > 0
  };
}

/**
 * 状态同步hook
 * 用于在多个组件间同步状态
 */
export function useStateSync<T>(
  key: string,
  initialState: T,
  storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'
) {
  const storageMap = useRef(new Map<string, any>());
  
  const getStoredValue = useCallback(() => {
    switch (storage) {
      case 'localStorage':
        try {
          const stored = localStorage.getItem(key);
          return stored ? JSON.parse(stored) : initialState;
        } catch {
          return initialState;
        }
      case 'sessionStorage':
        try {
          const stored = sessionStorage.getItem(key);
          return stored ? JSON.parse(stored) : initialState;
        } catch {
          return initialState;
        }
      case 'memory':
      default:
        return storageMap.current.get(key) ?? initialState;
    }
  }, [key, initialState, storage]);

  const setStoredValue = useCallback((value: T) => {
    switch (storage) {
      case 'localStorage':
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.warn('Failed to save to localStorage:', error);
        }
        break;
      case 'sessionStorage':
        try {
          sessionStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.warn('Failed to save to sessionStorage:', error);
        }
        break;
      case 'memory':
      default:
        storageMap.current.set(key, value);
        break;
    }
  }, [key, storage]);

  const [state, setState] = useState<T>(getStoredValue);

  const setSyncedState = useCallback((update: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newState = typeof update === 'function' ? (update as (prev: T) => T)(prevState) : update;
      setStoredValue(newState);
      return newState;
    });
  }, [setStoredValue]);

  // 监听存储变化（仅对localStorage和sessionStorage）
  useEffect(() => {
    if (storage === 'memory') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const newValue = JSON.parse(e.newValue);
          setState(newValue);
        } catch (error) {
          console.warn('Failed to parse storage value:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, storage]);

  return {
    state,
    setState: setSyncedState,
    clearState: () => setSyncedState(initialState)
  };
}
