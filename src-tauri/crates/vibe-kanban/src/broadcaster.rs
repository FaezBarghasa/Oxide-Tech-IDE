use tokio::sync::broadcast;
use serde::Serialize;

pub struct StateBroadcaster {
    sender: broadcast::Sender<StateEvent>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum StateEvent {
    AgentStateChanged {
        agent_id: String,
        phase: String,
        iteration: u32,
    },
    LogAppended {
        agent_id: String,
        level: String,
        message: String,
    },
    TaskCompleted {
        task_id: String,
        status: String,
    },
    SwarmStarted {
        swarm_id: String,
        task_count: usize,
    },
}

impl StateBroadcaster {
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<StateEvent> {
        self.sender.subscribe()
    }

    pub fn broadcast(&self, event: StateEvent) {
        // Ignore send errors (no receivers)
        let _ = self.sender.send(event);
    }

    pub fn receiver_count(&self) -> usize {
        self.sender.receiver_count()
    }
}