pub mod embedded;
pub mod engine;
pub mod events;
pub mod healing;
pub mod mcp_export;
pub mod orchestrator;
pub mod schema;
pub mod temporal;
pub mod tools;

pub use embedded::{EmbeddedAgent, GeneratedHalDriver, HardFaultDiagnosis};
pub use engine::{AgentEngine, AgentSession, HeuristicLLMProvider, LLMProvider};
pub use events::{
    AgentAction, AgentConfig, AgentEvent, AgentMode, AgentResult, AgentStatus, AgentTask,
    DiffHunk, PendingDiff,
};
pub use healing::{AppliedFix, HealingAgent, HealingTrigger};
pub use mcp_export::AgentMcpBridge;
pub use orchestrator::{AgentHandle, AgentOrchestrator, AgentRuntime, GraphLock, ParallelAgentInfo};
pub use schema::{CodePointPayload, ItemRecord, MemoryRecord, ModuleRecord, ProjectRecord};
pub use temporal::{BugIntroductionCandidate, EvolutionEvent, TemporalService};
pub use tools::{create_standard_tool_registry, AgentTool, ToolRegistry};
