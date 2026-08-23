use tokio::runtime::{Builder, Runtime};
use tracing::info;

/// Builds a hyper-performance tuned Tokio multi-threaded runtime.
pub fn build_hyper_runtime() -> Runtime {
    let cpus = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4);
    let worker_threads = cpus * 2;
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

    #[test]
    fn test_hyper_runtime_creation() {
        let runtime = build_hyper_runtime();
        let res = runtime.block_on(async { 42 });
        assert_eq!(res, 42);
    }
}
