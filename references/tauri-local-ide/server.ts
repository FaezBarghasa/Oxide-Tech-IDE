import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import { WebContainerSandbox, NPMDaemonResolver, SelfHealingGuard } from "./server/sandboxing.js";
import { TaskQueue, ProtocolAgnosticGateway } from "./server/orchestrator.js";
import { LSPProxy, DAPProxy } from "./server/languageIntelligence.js";
import { LocalRAGIndexer, FIMEngine, SecretsVault } from "./server/productivityServices.js";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // Initialize Modules
  const sandbox = new WebContainerSandbox();
  const npmDaemon = new NPMDaemonResolver();
  const healer = new SelfHealingGuard();
  const taskQueue = new TaskQueue();
  const gateway = new ProtocolAgnosticGateway();
  const lsp = new LSPProxy();
  const dap = new DAPProxy();
  const rag = new LocalRAGIndexer();
  const fim = new FIMEngine();
  const vault = new SecretsVault();

  await sandbox.init();
  await rag.indexWorkspace(process.cwd());

  // === Phase 1: Sandboxing & Healing ===
  app.post("/api/report-error", async (req, res) => {
    console.log("[Orchestrator] Received runtime error report:", req.body);
    const result = await healer.attemptAutoHeal(req.body);
    res.json({ status: "received", healing: result });
  });

  // === Phase 2: Orchestration ===
  app.post("/api/agent/task", async (req, res) => {
    const taskId = await taskQueue.enqueue(req.body);
    res.status(202).json({ taskId, status: "accepted" });
  });

  app.get("/api/agent/stream/:taskId", async (req, res) => {
    const { taskId } = req.params;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    
    // Send immediate ack
    res.write(`data: ${JSON.stringify({ status: "planning", taskId })}\n\n`);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step === 1) res.write(`data: ${JSON.stringify({ status: "writing" })}\n\n`);
      if (step === 2) {
        res.write(`data: ${JSON.stringify({ status: "complete" })}\n\n`);
        clearInterval(interval);
        res.end();
      }
    }, 2000);

    req.on("close", () => clearInterval(interval));
  });

  // === Phase 3: Language Intelligence (Mocked via RPC style or LSP HTTP endpoints) ===
  app.post("/api/chat", async (req, res) => {
    const { prompt, isPlanning } = req.body;
    res.json({ 
      response: isPlanning ? `Plan initiated for: ${prompt}` : `Response to: ${prompt}`,
      type: isPlanning ? 'plan' : 'chat'
    });
  });

  app.post("/api/lsp/hover", async (req, res) => {
    const { file, line, column } = req.body;
    const hoverInfo = await lsp.handleHover(file, line, column);
    res.json(hoverInfo);
  });

  // === Phase 4: Productivity Services ===
  app.post("/api/autocomplete", async (req, res) => {
    const { prefix, suffix } = req.body || { prefix: "", suffix: "" };
    const result = await fim.generateAutocomplete(prefix, suffix);
    res.json(result);
  });

  app.post("/api/proxy/stripe/*", (req, res) => {
    const headers = vault.getHeadersForProvider('stripe');
    console.log("[Orchestrator] Proxied Stripe request with headers:", Object.keys(headers).join(", "));
    res.json({ message: "Mock Stripe response secure" });
  });

  // === Actix-web Mock Endpoints for Frontend Compatibility ===
  app.post("/api/cargo/check", (req, res) => {
    const { workspace_path } = req.body;
    console.log(`[Orchestrator] Cargo check triggered for ${workspace_path}`);
    setTimeout(() => {
      res.json({
        success: true,
        diagnostics: [
          {
            level: 'warning',
            message: "variable `x` is assigned to, but never used",
            filePath: "/src/main.rs",
            line: 5,
            column: 12
          }
        ],
        elapsed_ms: 1250,
        stdout: "Compiling my-project v0.1.0\nFinished dev [unoptimized + debuginfo] target(s) in 1.25s\n"
      });
    }, 500);
  });

  app.get("/api/repository/structure", (req, res) => {
    res.json({
      success: true,
      total_files: 4,
      tree: [
        {
          name: 'src',
          path: '/src',
          isDirectory: true,
          children: [
            { name: 'main.rs', path: '/src/main.rs', isDirectory: false },
            { name: 'lib.rs', path: '/src/lib.rs', isDirectory: false },
            { name: 'handlers.rs', path: '/src/handlers.rs', isDirectory: false }
          ]
        },
        { name: 'Cargo.toml', path: '/Cargo.toml', isDirectory: false }
      ]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Mega AI-Based IDE Orchestrator] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
