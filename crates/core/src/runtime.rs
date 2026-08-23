use tokio::runtime::{Builder, Runtime};
use tracing::{info, error};
use num_cpus;

/// Builds a hyper-performance tuned Tokio multi-threaded runtime.
///
/// This runtime is configured to maximize I/O concurrency and provide a dedicated
/// blocking thread pool for heavy, potentially blocking, operations.
///
/// # Returns
/// A `tokio::runtime::Runtime` instance.
///
/// # Panics
/// Panics if the runtime builder fails to create the runtime.
pub fn build_hyper_runtime() -> Runtime {
    let worker_threads = num_cpus::get() * 2;
    let max_blocking_threads = 128;

    info!(
        "Building Tokio runtime with {} worker threads and {} max blocking threads",
        worker_threads, max_blocking_threads
    );

    Builder::new_multi_thread()
        .worker_threads(worker_threads)
        .max_blocking_threads(max_blocking_threads)
        .thread_name("oxide-worker")
        .enable_all()
        .on_thread_start(|| {
            info!("Tokio worker thread started");
        })
        .on_thread_stop(|| {
            info!("Tokio worker thread stopped");
        })
        .build()
        .expect("Failed to build Tokio runtime")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;
    use tokio::time::{sleep, Duration};

    #[test]
    fn test_hyper_runtime_creation() {
        let runtime = build_hyper_runtime();
        // Assert that the runtime can be created without panicking
        assert!(!runtime.is_shutdown());
    }

    #[tokio::test]
    async fn test_concurrent_tasks_completion() {
        let runtime = build_hyper_runtime();
        let start = Instant::now();
        let num_tasks = 10_000;

        runtime.block_on(async {
            let mut handles = Vec::with_capacity(num_tasks);
            for i in 0..num_tasks {
                let handle = tokio::spawn(async move {
                    // Simulate some non-blocking work
                    if i % 100 == 0 {
                        sleep(Duration::from_nanos(1)).await;
                    }
                    i
                });
                handles.push(handle);
            }

            for handle in handles {
                handle.await.expect("Task failed");
            }
        });

        let duration = start.elapsed();
        info!("{} concurrent tasks completed in {:?}", num_tasks, duration);
        assert!(duration < Duration::from_millis(500), "Tasks took too long: {:?}", duration);
    }
}
