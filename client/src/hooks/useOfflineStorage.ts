import { useEffect, useState } from 'react';

// Simple IndexedDB wrapper for offline storage
const DB_NAME = 'leadership-hub-offline';
const DB_VERSION = 1;

interface OfflineStore {
  actions: any[];
  employees: any[];
  lastSync: string | null;
}

const defaultStore: OfflineStore = {
  actions: [],
  employees: [],
  lastSync: null
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('pendingSync')) {
        const pendingStore = db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cache', 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value || null);
    });
  } catch {
    return null;
  }
}

async function setInCache<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cache', 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put({ key, value, timestamp: Date.now() });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // Silently fail for offline storage
  }
}

async function addPendingSync(operation: {
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
}): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingSync', 'readwrite');
      const store = transaction.objectStore('pendingSync');
      const request = store.add({
        ...operation,
        timestamp: Date.now()
      });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // Silently fail
  }
}

async function getPendingSync(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingSync', 'readonly');
      const store = transaction.objectStore('pendingSync');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch {
    return [];
  }
}

async function clearPendingSync(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingSync', 'readwrite');
      const store = transaction.objectStore('pendingSync');
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // Silently fail
  }
}

export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check pending sync count
    getPendingSync().then(items => setPendingCount(items.length));
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cacheData = async (key: string, data: any) => {
    await setInCache(key, data);
  };

  const getCachedData = async <T>(key: string): Promise<T | null> => {
    return getFromCache<T>(key);
  };

  const queueOfflineAction = async (operation: {
    type: 'create' | 'update' | 'delete';
    entity: string;
    data: any;
  }) => {
    await addPendingSync(operation);
    const items = await getPendingSync();
    setPendingCount(items.length);
  };

  const syncPendingActions = async (syncFn: (operation: any) => Promise<void>) => {
    const pending = await getPendingSync();
    
    for (const operation of pending) {
      try {
        await syncFn(operation);
      } catch (error) {
        console.error('Failed to sync operation:', operation, error);
        // Keep failed operations for retry
        return;
      }
    }
    
    await clearPendingSync();
    setPendingCount(0);
  };

  return {
    isOnline,
    pendingCount,
    cacheData,
    getCachedData,
    queueOfflineAction,
    syncPendingActions
  };
}

export default useOfflineStorage;

