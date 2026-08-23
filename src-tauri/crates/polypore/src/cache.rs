use dashmap::DashMap;
use std::sync::Arc;
use chrono::{DateTime, Utc, Duration};

pub struct CacheEntry<T> {
    pub data: Arc<T>,
    pub expires_at: DateTime<Utc>,
}

pub struct ContextCache<T> {
    store: DashMap<String, CacheEntry<T>>,
}

impl<T: Send + Sync + 'static> ContextCache<T> {
    pub fn new() -> Self {
        Self { store: DashMap::new() }
    }

    pub fn insert(&self, key: String, val: T, ttl: Duration) {
        let expires_at = Utc::now() + ttl;
        self.store.insert(key, CacheEntry { data: Arc::new(val), expires_at });
    }

    pub fn get(&self, key: &str) -> Option<Arc<T>> {
        let entry = self.store.get(key)?;
        if Utc::now() > entry.expires_at {
            drop(entry); // Release the lock before removing
            self.store.remove(key);
            None
        } else {
            Some(entry.data.clone())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_cache_insertion_and_retrieval() {
        let cache = ContextCache::<String>::new();
        let key = "test_key".to_string();
        let value = "test_value".to_string();
        let ttl = Duration::seconds(1);

        cache.insert(key.clone(), value.clone(), ttl);

        let retrieved = cache.get(&key).unwrap();
        assert_eq!(*retrieved, value);

        sleep(Duration::from_secs(2)).await;

        let retrieved_expired = cache.get(&key);
        assert!(retrieved_expired.is_none());
    }

    #[tokio::test]
    async fn test_cache_no_expiration() {
        let cache = ContextCache::<u32>::new();
        let key = "numeric_key".to_string();
        let value = 12345;
        let ttl = Duration::minutes(5);

        cache.insert(key.clone(), value, ttl);

        let retrieved = cache.get(&key).unwrap();
        assert_eq!(*retrieved, value);
    }

    #[tokio::test]
    async fn test_cache_concurrent_access() {
        let cache = Arc::new(ContextCache::<usize>::new());
        let num_tasks = 100;
        let ttl = Duration::seconds(5);

        let mut handles = Vec::new();
        for i in 0..num_tasks {
            let cache_clone = Arc::clone(&cache);
            let key = format!("key_{}", i);
            let value = i;
            handles.push(tokio::spawn(async move {
                cache_clone.insert(key.clone(), value, ttl);
                let retrieved = cache_clone.get(&key).unwrap();
                assert_eq!(*retrieved, value);
            }));
        }

        for handle in handles {
            handle.await.unwrap();
        }

        assert_eq!(cache.store.len(), num_tasks);
    }
}
