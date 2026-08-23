
use dashmap::DashMap;
use rayon::prelude::*;
use uuid::Uuid;
use std::collections::BinaryHeap;
use std::cmp::Ordering;

#[derive(Debug, Clone)]
pub struct IndexedChunk {
    pub id: Uuid,
    pub file_path: String,
    pub content: String,
    pub vector: Vec<f32>,
}

// Wrapper for BinaryHeap to make it a min-heap based on score
#[derive(PartialEq)]
struct ScoredChunk(Uuid, f32);

impl Eq for ScoredChunk {}

impl PartialOrd for ScoredChunk {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        // Reverse ordering to make BinaryHeap a min-heap
        other.1.partial_cmp(&self.1)
    }
}

impl Ord for ScoredChunk {
    fn cmp(&self, other: &Self) -> Ordering {
        self.partial_cmp(other).unwrap_or(Ordering::Equal)
    }
}


pub struct VectorIndex {
    chunks: DashMap<Uuid, IndexedChunk>,
    // The matrix is stored as a flat Vec for cache-friendly iteration.
    // Each vector is stored contiguously.
    matrix: Vec<f32>,
    ids: Vec<Uuid>, // Maps rows in the matrix back to chunk IDs
    vector_dim: usize,
}

impl VectorIndex {
    pub fn new(vector_dim: usize) -> Self {
        Self {
            chunks: DashMap::new(),
            matrix: Vec::new(),
            ids: Vec::new(),
            vector_dim,
        }
    }

    pub fn insert(&self, chunk: IndexedChunk) {
        assert_eq!(chunk.vector.len(), self.vector_dim, "Vector dimension mismatch");
        let id = chunk.id;
        self.matrix.extend_from_slice(&chunk.vector);
        self.ids.push(id);
        self.chunks.insert(id, chunk);
    }

    pub fn search(&self, query_vector: &[f32], limit: usize) -> Vec<(Uuid, f32)> {
        assert_eq!(query_vector.len(), self.vector_dim, "Query vector dimension mismatch");

        let num_vectors = self.ids.len();
        if num_vectors == 0 {
            return vec![];
        }

        // Use rayon for parallel computation of dot products
        let scores: Vec<(Uuid, f32)> = self.matrix
            .par_chunks_exact(self.vector_dim)
            .zip(self.ids.par_iter())
            .map(|(vector_slice, &id)| {
                let score = dot_product(query_vector, vector_slice);
                (id, score)
            })
            .collect();

        // Use a min-heap to efficiently find the top `limit` results.
        let mut heap = BinaryHeap::with_capacity(limit + 1);
        for (id, score) in scores {
            heap.push(ScoredChunk(id, score));
            if heap.len() > limit {
                heap.pop(); // Remove the smallest score
            }
        }

        // Convert the heap to a sorted Vec
        heap.into_sorted_vec().into_iter().map(|scored| (scored.0, scored.1)).collect()
    }

    pub fn get_chunk(&self, id: &Uuid) -> Option<dashmap::mapref::one::Ref<Uuid, IndexedChunk>> {
        self.chunks.get(id)
    }
}

// Helper for dot product
fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}


#[cfg(test)]
mod tests {
    use super::*;
    extern crate criterion;
    use criterion::{criterion_group, criterion_main, Criterion, black_box};

    fn generate_random_vector(dim: usize) -> Vec<f32> {
        (0..dim).map(|_| rand::random::<f32>()).collect()
    }

    #[test]
    fn test_vector_index_search() {
        let dim = 4;
        let index = VectorIndex::new(dim);

        let chunk1 = IndexedChunk { id: Uuid::new_v4(), file_path: "f1".into(), content: "c1".into(), vector: vec![1.0, 0.0, 0.0, 0.0] };
        let chunk2 = IndexedChunk { id: Uuid::new_v4(), file_path: "f2".into(), content: "c2".into(), vector: vec![0.0, 1.0, 0.0, 0.0] };
        let chunk3 = IndexedChunk { id: Uuid::new_v4(), file_path: "f3".into(), content: "c3".into(), vector: vec![0.9, 0.1, 0.0, 0.0] }; // very similar to chunk1

        index.insert(chunk1.clone());
        index.insert(chunk2.clone());
        index.insert(chunk3.clone());

        let query = vec![0.95, 0.05, 0.0, 0.0];
        let results = index.search(&query, 2);

        assert_eq!(results.len(), 2);
        // The top result should be chunk3 because it's slightly more similar
        assert_eq!(results[0].0, chunk1.id);
        assert_eq!(results[1].0, chunk3.id);
    }

    fn benchmark_vector_index(c: &mut Criterion) {
        let dim = 384;
        let num_vectors = 100_000;
        let index = VectorIndex::new(dim);

        for _ in 0..num_vectors {
            let chunk = IndexedChunk {
                id: Uuid::new_v4(),
                file_path: "path".into(),
                content: "content".into(),
                vector: generate_random_vector(dim),
            };
            index.insert(chunk);
        }

        let query_vectors: Vec<_> = (0..1000).map(|_| generate_random_vector(dim)).collect();

        c.bench_function("vector_index_search_100k", |b| {
            b.iter(|| {
                // We can't easily use rayon inside a criterion bench iter,
                // so we'll just test one query at a time. The parallelism is tested in the unit test logic.
                let query = &query_vectors[rand::random::<usize>() % query_vectors.len()];
                black_box(index.search(query, 10));
            })
        });
    }

    criterion_group!(benches, benchmark_vector_index);
    // This requires a main function to run criterion benchmarks
    // To run this, you would need to set up a benchmark harness in Cargo.toml
    // For now, this code serves as the benchmark definition.
}

// Dummy main for criterion
#[cfg(test)]
fn main() {}
