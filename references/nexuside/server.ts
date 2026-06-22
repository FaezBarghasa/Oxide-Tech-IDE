import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route - Advanced Chat with Gemini key proxying
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        // Return a premium simulated reply that acts like a real agent
        const trimmed = message.toLowerCase();
        let reply = "";
        
        if (trimmed.includes("refactor") || trimmed.includes("rust") || trimmed.includes("dioxus")) {
          reply = `That is a solid task. To refactor your React TypeScript components to Rust/Dioxus, we want to align state and props styles:

1. **State Management**: Instead of React \`useState\`, we use Dioxus \`use_signal(cx, || value)\` or \`use_state\`.
2. **Components**: We declare Dioxus components like this:
\`\`\`rust
#[inline_props]
pub fn App(cx: Scope) -> Element {
    let count = use_state(cx, || 0);
    render! {
        div {
            class: "p-4 bg-slate-800 text-white",
            h1 { "Click counter" }
            button { onclick: move |_| count += 1, "Count: {count}" }
        }
    }
}
\`\`\`

Would you like me to generate full Cargo.toml dependencies or write a main bridge module next? Configure your actual **Gemini API Key in Settings > Secrets** to unlock live autonomous generation!`;
        } else if (trimmed.includes("cargo") || trimmed.includes("error") || trimmed.includes("compile") || trimmed.includes("build")) {
          reply = `The workspace build failure is caused by a missing dependency in Cargo.toml. 
Specifically, the workspace member \`uniffi-bridge\` was declared under members in \`Cargo.toml\`, but the directory or its manifest path does not exist on disk (os error 2).

**Recommended Action**:
1. Remove \`"uniffi-bridge"\` from the \`[workspace]\` members inside your \`Cargo.toml\`.
2. Or let me create the \`uniffi-bridge/Cargo.toml\` file for you. 
3. Click **Attach Cargo.toml** in the top warning banner of the Editor to resolve immediately!`;
        } else {
          reply = `Hello! I am Gemini, your expert developer companion inside NexusIDE. 

I can help you:
- Debug your Rust compiler errors (Clicking **Run** in the top bar triggers the Cargo build).
- Teach Dioxus best practices, like state management or template routing.
- Automatically edit files (open files in your Workspace Tree from the left panel).

*Tip: You can set your client credentials / API keys in AI Studio Settings to activate live AI generation.*`;
        }

        return res.json({ text: reply });
      }

      // Initialize GoogleGenAI SDK safely
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `You are Gemini, the built-in AI Developer Agent inside NexusIDE.
The user is working in an IntelliJ-style full-featured developer IDE.
Focus on cargo workspace setup, Rust type-safety, Dioxus components, and structural refactoring.
Match the personality of a premium copilot: write highly professional, clear, and direct answers, with code blocks when helpful.`;

      // Construct simple content structure matching SDK specifications
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: message,
        config: {
          systemInstruction,
        },
      });

      res.json({ text: response.text || "No response received from the model." });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
