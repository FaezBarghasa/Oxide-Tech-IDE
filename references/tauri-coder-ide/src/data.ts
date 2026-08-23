import { FileItem, AgentTask, DebugVariable } from './types';

export const initialFiles: FileItem[] = [
  {
    name: "main.rs",
    path: "src/main.rs",
    language: "rust",
    content: `// Intelligent Microcontroller Core with MQTT Bridge Support
use std::time::Duration;
use tokio::time::sleep;

#[derive(Debug, Clone)]
pub struct SensorPayload {
    pub temperature: f32,
    pub humidity: f32,
    pub timestamp: u64,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Initializing Live Hardware Sandbox connection...");
    
    let mut controller = HardwareController::new();
    controller.connect_mqtt("broker.hivemq.com").await?;

    loop {
        let telemetry = controller.read_sensors().await;
        println!("Broadcasting state: {:?}", telemetry);
        
        if telemetry.temperature > 32.5 {
            controller.trigger_cooling_fan().await;
        }

        sleep(Duration::from_secs(1)).await;
    }
}`,
    astOutline: [
      { name: "SensorPayload", type: "struct", line: 6 },
      { name: "main()", type: "fn", line: 13 },
      { name: "connect_mqtt", type: "impl method", line: 17 },
      { name: "read_sensors", type: "impl method", line: 20 },
    ]
  },
  {
    name: "HeroCard.tsx",
    path: "src/components/HeroCard.tsx",
    language: "typescript",
    content: `import React, { useState } from 'react';
import { Sparkles, Activity } from 'lucide-react';

export function HeroCard() {
  const [active, setActive] = useState(false);

  return (
    <div className="p-8 bg-[#161925] border border-gray-800 rounded-2xl flex flex-col justify-between transition-all hover:shadow-glow">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-widest text-blue-400">Main Interface</span>
          <h3 className="text-2xl font-semibold tracking-tight">Active Core Node</h3>
        </div>
        <button 
          onClick={() => setActive(!active)}
          className={\`p-2.5 rounded-full transition-all \${active ? 'bg-indigo-600 text-white animate-pulse' : 'bg-gray-800 text-gray-400'}\`}
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-8 flex items-center justify-between text-xs text-gray-500 font-mono">
        <div className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Vcc 3.32V State NOMINAL</span>
        </div>
        <span>L42</span>
      </div>
    </div>
  );
}`,
    astOutline: [
      { name: "HeroCard()", type: "component", line: 4 },
      { name: "active", type: "state", line: 5 },
      { name: "setActive", type: "updater", line: 5 }
    ]
  },
  {
    name: "server.ts",
    path: "server.ts",
    language: "typescript",
    content: `import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = createServer(app);

app.get('/api/telemetry', (req, res) => {
  res.json({
    status: 'nominal',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

console.log('Telemetry microservice live.');
`,
    astOutline: [
      { name: "app", type: "constant", line: 5 },
      { name: "GET /api/telemetry", type: "endpoint", line: 8 }
    ]
  }
];

export const initialTasks: AgentTask[] = [
  {
    id: "task-001",
    name: "Vibe /fix Route Bug",
    status: "completed",
    progress: 100,
    description: "Fix a bounds index crash in telemetry parsing sensor controller",
    targetFile: "src/main.rs",
    timestamp: "2 mins ago",
    originalCode: `let telemetry = controller.read_sensors().await;\nprintln!("Telemetry readings captured.");`,
    suggestedCode: `let telemetry = controller.read_sensors().await;\nprintln!("Broadcasting state: {:?}", telemetry);`
  },
  {
    id: "task-002",
    name: "/ui Add Glow Visuals",
    status: "writing",
    progress: 45,
    description: "Inject subtle hover ambient shadows inside the primary HeroCard component container frame",
    targetFile: "src/components/HeroCard.tsx",
    timestamp: "Active",
    originalCode: `// Original Card styles without glow effects\nclassName="p-8 bg-[#161925] border border-gray-800 rounded-2xl"`,
    suggestedCode: `// Ambient-Glow styled visual layout\nclassName="p-8 bg-[#161925] border border-yellow-700 hover:border-indigo-500 rounded-2xl flex flex-col justify-between transition-all hover:shadow-[0_0_25px_rgba(99,102,241,0.2)]"`
  },
  {
    id: "task-003",
    name: "/test Stress Threading",
    status: "queued",
    progress: 0,
    description: "Write integration tests mocking 100 concurrent MQTT brokers sending bursts of float signals",
    targetFile: "src/main.rs",
    timestamp: "Pending"
  }
];

export const initialDebugVariables: DebugVariable[] = [
  { name: "temperature", value: "24.62", type: "f32" },
  { name: "humidity", value: "48.1", type: "f32" },
  { name: "controller.mqtt_broker", value: "\"broker.hivemq.com\"", type: "String" },
  { name: "controller.connected", value: "true", type: "bool" },
  { name: "HEEPH_FREE_BYTES", value: "248232", type: "usize" },
];
