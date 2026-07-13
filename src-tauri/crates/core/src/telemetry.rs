use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use tracing_appender::rolling;
use tokio::sync::broadcast;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LogEvent {
    pub timestamp: DateTime<Utc>,
    pub level: String,
    pub target: String,
    pub message: String,
    pub fields: serde_json::Value,
}

pub struct TelemetryPipeline {
    broadcast_tx: broadcast::Sender<LogEvent>,
}

impl TelemetryPipeline {
    pub fn new(log_dir: &str) -> Self {
        let (broadcast_tx, _) = broadcast::channel(10_000);

        // Layer 1: JSON file logging (for episodic memory)
        let file_appender = rolling::daily(log_dir, "oxide.log");
        let (file_writer, _guard) = tracing_appender::non_blocking(file_appender);

        let file_layer = fmt::layer()
            .json()
            .with_writer(file_writer)
            .with_target(true)
            .with_thread_ids(true)
            .with_thread_names(true);

        // Layer 2: Console logging (for development)
        let console_layer = fmt::layer()
            .with_target(true)
            .with_thread_ids(false);

        // Initialize subscriber
        tracing_subscriber::registry()
            .with(EnvFilter::from_default_env())
            .with(file_layer)
            .with(console_layer)
            .init();

        Self { broadcast_tx }
    }

    pub fn emit_event(&self, level: &str, target: &str, message: &str, fields: serde_json::Value) {
        let event = LogEvent {
            timestamp: Utc::now(),
            level: level.to_string(),
            target: target.to_string(),
            message: message.to_string(),
            fields,
        };

        // Ignore send errors (no receivers)
        let _ = self.broadcast_tx.send(event);
    }

    pub fn subscribe(&self) -> broadcast::Receiver<LogEvent> {
        self.broadcast_tx.subscribe()
    }
}

// Example usage with custom spans
#[tracing::instrument(skip_all, fields(agent_id = %agent_id, task_id = %task_id))]
pub async fn execute_agent_task(agent_id: uuid::Uuid, task_id: uuid::Uuid) {
    tracing::info!("Starting agent task");
    // ... task logic ...
    tracing::info!("Agent task completed");
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_telemetry_initialization() {
        let temp_dir = tempdir().unwrap();
        let pipeline = TelemetryPipeline::new(temp_dir.path().to_str().unwrap());

        // Verify broadcast channel works
        let mut receiver = pipeline.subscribe();

        pipeline.emit_event(
            "INFO",
            "test_module",
            "Test message",
            serde_json::json!({"key": "value"}),
        );

        // Receiver should get the event
        let event = receiver.try_recv().unwrap();
        assert_eq!(event.level, "INFO");
        assert_eq!(event.target, "test_module");
        assert_eq!(event.message, "Test message");
    }

    #[test]
    fn test_log_event_serialization() {
        let event = LogEvent {
            timestamp: Utc::now(),
            level: "ERROR".to_string(),
            target: "test".to_string(),
            message: "Test error".to_string(),
            fields: serde_json::json!({"error_code": 42}),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("ERROR"));
        assert!(json.contains("Test error"));
        assert!(json.contains("42"));
    }
}
