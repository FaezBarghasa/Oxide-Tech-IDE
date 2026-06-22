import React, { useState, useEffect, useRef } from "react";
import { FileSystemMap, BuildStep, ChatMessage } from "./types";
import { initialFiles, initialBuildSteps, initialChats } from "./data";
import TopBar from "./components/TopBar";
import ExplorerPanel from "./components/ExplorerPanel";
import BottomPanel from "./components/BottomPanel";
import AIChatPanel from "./components/AIChatPanel";

export default function App() {
  // Core IDE states
  const [files, setFiles] = useState<FileSystemMap>(initialFiles);
  const [currentFile, setCurrentFile] = useState<string>("src/models.rs");
  const [openTabs, setOpenTabs] = useState<string[]>([
    "Cargo.toml",
    "src/models.rs",
    "src/main.rs",
  ]);
  
  const [warningBannerVisible, setWarningBannerVisible] = useState<boolean>(true);
  const [showSearchEverywhere, setShowSearchEverywhere] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [envMode, setEnvMode] = useState<string>("dev");
  
  // Sidebar Toggles
  const [activeLeftTab, setActiveLeftTab] = useState<string>("explorer");
  const [rightPanel, setRightPanel] = useState<"ai" | "none">("ai");
  const [explorerExpanded, setExplorerExpanded] = useState<Record<string, boolean>>({
    "oxide-plugin-intellij": true,
    "src": true,
    "front": false,
    "reference": false,
    "rust": false,
    "target": false,
  });

  // Bottom Logger & Terminal states
  const [activeBottomTab, setActiveBottomTab] = useState<string>("Build");
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>(initialBuildSteps);
  const [selectedBuildStepId, setSelectedBuildStepId] = useState<string>("failed-run-cargo");
  const [buildStatus, setBuildStatus] = useState<"error" | "success" | "pending">("error");
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  
  // Raw logs displayed on build details
  const initialErrorLog = `Execution failed (exit code 101).
/home/jrad/.cargo/bin/cargo metadata --verbose --format-version 1 --all-features --filter-platform x86_64-unknown-linux-gnu
in working directory: /home/jrad/RustroverProjects/Oxide-tech-plugins-workspace/oxide-plugin-intellij
with extra environment variables: TERM=ansi CARGO_TERM_PROGRESS_WHEN=always RUST_BACKTRACE=short RUSTC=/home/jrad/.cargo/bin/rustc CARGO_TERM_PROG

stdout: error: failed to load manifest for workspace member \`/home/jrad/RustroverProjects/Oxide-tech-plugins-workspace/uniffi-bridge\`
referenced by workspace at \`/home/jrad/RustroverProjects/Oxide-tech-plugins-workspace/Cargo.toml\`

Caused by:
    failed to read \`/home/jrad/RustroverProjects/Oxide-tech-plugins-workspace/uniffi-bridge/Cargo.toml\`

Caused by:
    No such file or directory (os error 2)

stderr:`;

  const [buildLogs, setBuildLogs] = useState<string>(initialErrorLog);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // AI Assistant states
  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>(initialChats);
  const [userInputChat, setUserInputChat] = useState<string>("");
  const [isModelResponding, setIsModelResponding] = useState<boolean>(false);

  // Editor cursor trackers
  const [cursorPos, setCursorPos] = useState({ line: 1, ch: 1 });

  // References
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Synchronize cursor selection on click/navigation
  const handleCursorActivity = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const textBefore = el.value.substring(0, el.selectionStart);
    const lines = textBefore.split("\n");
    const line = lines.length;
    const ch = lines[lines.length - 1].length + 1;
    setCursorPos({ line, ch });
  };

  // Select file from file tree or breadcrumbs
  const selectFile = (path: string) => {
    setCurrentFile(path);
    // Add to open tabs if not present
    const fileName = path.split("/").pop() || path;
    if (!openTabs.includes(path)) {
      setOpenTabs([...openTabs, path]);
    }
    // Update cursor position to 1:1 on jump
    setCursorPos({ line: 1, ch: 1 });
  };

  // Close tab
  const closeTab = (pathToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t !== pathToRemove);
    setOpenTabs(newTabs);
    
    // Fallback active file if tab closed
    if (currentFile === pathToRemove && newTabs.length > 0) {
      setCurrentFile(newTabs[newTabs.length - 1]);
    } else if (newTabs.length === 0) {
      setCurrentFile("");
    }
  };

  // Toggle tree structure folders
  const toggleFolder = (path: string) => {
    setExplorerExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Input code content modified
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updatedContent = e.target.value;
    setFiles((prev) => ({
      ...prev,
      [currentFile]: {
        ...prev[currentFile],
        content: updatedContent,
      },
    }));
  };

  // Automatically attach/fix missing Cargo.toml reference dependency
  const handleAttachCargoWorkspace = () => {
    // 1. Remove workspace members section that is crashing uniffi-bridge, simulating direct file modification
    const currentCargoContent = files["Cargo.toml"]?.content || "";
    let revisedCargo = currentCargoContent;
    if (currentCargoContent.includes("uniffi-bridge")) {
      revisedCargo = `[package]
name = "oxide-plugin-intellij"
version = "0.1.0"
edition = "2021"

[dependencies]
dioxus = { version = "0.4", features = ["desktop"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`;
    }

    setFiles((prev) => ({
      ...prev,
      "Cargo.toml": {
        ...prev["Cargo.toml"],
        content: revisedCargo,
      },
    }));

    // Dismiss active workspace banner warnings
    setWarningBannerVisible(false);

    // Run build synchronization to notify client
    triggerBuildSimulation(true);
  };

  // Run the rust/dioxus workspace build
  const triggerBuildSimulation = (autoResolved: boolean = false) => {
    setIsBuilding(true);
    setActiveBottomTab("Build");
    setBuildLogs("Starting workspace index configuration...\nEvaluating Cargo dependencies...");

    setTimeout(() => {
      // If we fixed Cargo.toml workspace parameters
      const hasUniffiErrorExtracted = files["Cargo.toml"]?.content.includes("uniffi-bridge");

      if (!hasUniffiErrorExtracted || autoResolved) {
        setBuildStatus("success");
        setBuildLogs(`Cargo workspaces synchronized successfully!
Detected active members: ["rust"]
Preparing development platform targets: x86_64-unknown-linux-gnu

Compiling oxide-plugin-intellij v0.1.0 (/home/jrad/Oxide-tech-plugins-workspace/oxide-plugin-intellij)
   Compiling serde v1.0.197
   Compiling serde_json v1.0.114
   Compiling dioxus v0.4.3
   Compiling oxide-plugin-intellij v0.1.0 (main.rs)
    Finished dev [unoptimized + debuginfo] target(s) in 1.48s
Process compiled successfully with exit code 0. Ready.`);
        
        // Update Bottom build step tree configuration to positive successes
        setBuildSteps([
          {
            id: "cargo-success",
            name: "Cargo: build success",
            status: "success",
            time: "At 22/06/2026, 19:37",
            duration: "1.48s",
            children: [
              {
                id: "sync-ready",
                name: "Synchronized oxide-plugin-intellij workspace",
                status: "success",
                duration: "812 ms",
              }
            ]
          }
        ]);
        setSelectedBuildStepId("cargo-success");
        setTerminalLogs((prev) => [
          ...prev,
          "Finished dev [unoptimized + debuginfo] targets successfully.",
          "Process completed with exit code 0.",
        ]);
      } else {
        setBuildStatus("error");
        setBuildLogs(initialErrorLog);
        setBuildSteps(initialBuildSteps);
        setSelectedBuildStepId("failed-run-cargo");
        setTerminalLogs((prev) => [
          ...prev,
          "cargo check",
          "error: failed to load manifest for workspace member `/home/jrad/RustroverProjects/Oxide-tech-plugins-workspace/uniffi-bridge`",
        ]);
      }
      setIsBuilding(false);
    }, 1500);
  };

  // Send message to actual/simulated Gemini agent
  const sendChatMessage = async () => {
    if (!userInputChat.trim() || isModelResponding) return;

    const userMessageText = userInputChat;
    setUserInputChat("");
    
    const newUserMsg: ChatMessage = {
      id: `chat-usr-${Date.now()}`,
      role: "user",
      text: userMessageText,
    };

    setAiChatMessages((prev) => [...prev, newUserMsg]);
    setIsModelResponding(true);

    try {
      // POST payload to express backend proxy
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessageText }),
      });

      if (!response.ok) {
        throw new Error("Failed to contact Gemini proxy");
      }

      const data = await response.json();

      const newBotMsg: ChatMessage = {
        id: `chat-ai-${Date.now()}`,
        role: "model",
        text: data.text,
      };

      setAiChatMessages((prev) => [...prev, newBotMsg]);
    } catch (err: any) {
      console.error(err);
      const newBotMsg: ChatMessage = {
        id: `chat-ai-${Date.now()}`,
        role: "model",
        text: `I encountered a communication error with the local Express proxy. Please assure the Node backend Dev server is fully booted.`,
      };
      setAiChatMessages((prev) => [...prev, newBotMsg]);
    } finally {
      setIsModelResponding(false);
    }
  };

  // Filter files matched in Search Everywhere dialog
  const filteredSearchFiles = Object.keys(files).filter(
    (fPath) =>
      !files[fPath].isFolder &&
      fPath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Trigger search keyboard keybind hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault();
        setShowSearchEverywhere(true);
      }
      if (e.key === "Escape") {
        setShowSearchEverywhere(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute total number of lines in code panel editor
  const textContent = files[currentFile]?.content || "";
  const linesArray = textContent.split("\n");

  return (
    <div className="bg-background text-on-background h-screen w-screen flex flex-col font-body-md overflow-hidden text-body-md select-none">
      {/* Top Menu navigation bar */}
      <TopBar
        onRunBuild={() => triggerBuildSimulation(false)}
        isBuilding={isBuilding}
        onSearchOpen={() => {
          setSearchQuery("");
          setShowSearchEverywhere(true);
        }}
        envMode={envMode}
        setEnvMode={setEnvMode}
      />

      {/* Breadcrumb Path Bar */}
      <div className="h-8 flex items-center px-3 bg-surface border-b border-outline-variant shrink-0 gap-1.5 font-body-sm text-[11px] text-on-surface-variant z-40">
        <div 
          onClick={() => alert("Root workspace: oxide-plugin-intellij")}
          className="flex items-center gap-1 cursor-pointer hover:bg-surface-variant/50 px-1.5 py-0.5 rounded transition-colors border border-outline-variant/30 bg-surface-container-lowest"
        >
          <span className="material-symbols-outlined text-[13px] text-primary">data_object</span>
          <span className="text-on-surface">oxide-plugin-intellij</span>
        </div>

        <span className="text-outline/40">/</span>

        {/* Dynamic active file breakdown */}
        {currentFile && (
          <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
            {currentFile.split("/").map((part, index, arr) => (
              <React.Fragment key={part}>
                {index > 0 && <span className="text-outline/40">/</span>}
                <span className={index === arr.length - 1 ? "text-primary font-medium" : ""}>
                  {part}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <div 
            onClick={() => alert("Current branch context is set to master.")}
            className="flex items-center gap-1 cursor-pointer hover:bg-surface-variant/50 px-1.5 py-0.5 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[12px]">mediation</span>
            <span>master</span>
            <span className="material-symbols-outlined text-[12px]">expand_more</span>
          </div>
        </div>
      </div>

      {/* Main workspace panels */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-84px)] relative">
        
        {/* Leftmost Sidebar utility rail */}
        <nav className="bg-surface-container-low text-secondary font-label-caps text-label-caps w-10 h-full flex flex-col border-r border-outline-variant py-2 shrink-0 items-center justify-between z-40 select-none">
          <div className="flex flex-col w-full items-center gap-1.5">
            <button
              onClick={() => setActiveLeftTab(activeLeftTab === "explorer" ? "none" : "explorer")}
              className={`w-full h-10 flex items-center justify-center border-l-2 transition-all cursor-pointer relative ${
                activeLeftTab === "explorer"
                  ? "border-secondary text-secondary bg-surface-variant"
                  : "border-transparent text-outline hover:text-on-surface hover:bg-surface-container"
              }`}
              title="Project Explorer"
            >
              <span className="material-symbols-outlined text-[20px]">folder</span>
            </button>

            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearchEverywhere(true);
              }}
              className="w-full h-10 flex items-center justify-center border-l-2 border-transparent text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              title="Search Everywhere"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            <button
              onClick={() => {
                alert("Opening Local VCS changes...");
                setActiveLeftTab("explorer");
              }}
              className="w-full h-10 flex items-center justify-center border-l-2 border-transparent text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              title="VCS changes"
            >
              <span className="material-symbols-outlined text-[20px]">commit</span>
            </button>

            <button
              onClick={() => alert("Open Installed MCP extensions catalog.")}
              className="w-full h-10 flex items-center justify-center border-l-2 border-transparent text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              title="MCP extensions"
            >
              <span className="material-symbols-outlined text-[20px]">extension</span>
            </button>
            
            <button
              onClick={() => {
                alert("Available skills active inside AI module loaded successfully.");
              }}
              className="w-full h-10 flex items-center justify-center border-l-2 border-transparent text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              title="Smart Assist Skills"
            >
              <span className="material-symbols-outlined text-[20px]">psychology</span>
            </button>
          </div>

          <div className="flex flex-col w-full items-center">
            <button
              onClick={() => {
                alert(`Current Local Time: 2026-06-22T09:12`);
              }}
              className="w-full h-10 flex items-center justify-center border-l-2 border-transparent text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              title="Help & Details"
            >
              <span className="material-symbols-outlined text-[20px]">more_horiz</span>
            </button>
          </div>
        </nav>

        {/* Project Explorer Side Panel */}
        {activeLeftTab === "explorer" && (
          <ExplorerPanel
            files={files}
            currentFile={currentFile}
            onSelectFile={selectFile}
            expandedFolders={explorerExpanded}
            onToggleFolder={toggleFolder}
          />
        )}

        {/* Central Code canvas and bottom terminal panel stack */}
        <main className="flex-1 flex flex-col min-w-0 bg-surface overflow-hidden">
          
          {/* Editor open tab bar */}
          <div className="h-8 flex bg-surface-container-lowest border-b border-outline-variant overflow-x-auto overflow-y-hidden shrink-0 select-none">
            {openTabs.map((tabPath) => {
              const tabNode = files[tabPath];
              if (!tabNode) return null;
              
              const isTabActive = currentFile === tabPath;
              const tabName = tabNode.name;
              
              let tabIcon = "description";
              let tabIconClass = "text-outline";
              
              if (tabName.endsWith(".rs")) {
                tabIcon = "data_object";
                tabIconClass = "text-rust-orange";
              } else if (tabName.endsWith(".toml")) {
                tabIcon = "description";
                tabIconClass = "text-toml-red";
              } else if (tabName.endsWith(".lock")) {
                tabIcon = "lock";
                tabIconClass = "text-amber-500";
              }

              return (
                <div
                  key={tabPath}
                  onClick={() => selectFile(tabPath)}
                  className={`flex items-center gap-1.5 px-3 h-full border-r border-outline-variant min-w-[125px] cursor-pointer group transition-colors select-none ${
                    isTabActive
                      ? "bg-surface border-t-2 border-primary text-on-surface font-medium"
                      : "bg-surface-container-low border-t-2 border-transparent text-on-surface-variant hover:bg-surface-variant/30"
                  }`}
                >
                  <span className={`material-symbols-outlined text-[13px] ${tabIconClass}`}>
                    {tabIcon}
                  </span>
                  <span className="font-body-sm text-[12px] truncate">{tabName}</span>
                  
                  <span
                    onClick={(e) => closeTab(tabPath, e)}
                    className="material-symbols-outlined text-[11px] opacity-0 group-hover:opacity-100 ml-auto hover:bg-surface-variant p-0.5 rounded transition-opacity"
                  >
                    close
                  </span>
                </div>
              );
            })}
          </div>

          {/* Warning Banner */}
          {warningBannerVisible && currentFile && (
            <div className="h-8 bg-[#1e2a4f] flex items-center px-3 border-b border-outline-variant/30 text-[11.5px] font-body-sm text-on-surface justify-between shrink-0 select-none">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">warning</span>
                The file does not belong to a known Cargo project
              </span>
              <div className="flex items-center gap-4 text-primary cursor-pointer font-semibold">
                <span 
                  onClick={handleAttachCargoWorkspace}
                  className="hover:underline hover:text-primary-container"
                >
                  Attach Cargo.toml
                </span>
                <span 
                  onClick={() => setWarningBannerVisible(false)}
                  className="hover:underline text-outline"
                >
                  Don't show again
                </span>
              </div>
            </div>
          )}

          {/* Interactive Code canvas editor segment */}
          <div className="flex-1 flex overflow-hidden font-code-md text-[13px] bg-surface relative">
            {currentFile && files[currentFile] ? (
              <>
                {/* Visual check indicator */}
                <div className="absolute right-3 top-3 text-secondary bg-surface-container-low/80 backdrop-blur px-2 py-1 rounded border border-outline-variant/30 flex items-center gap-1 text-[11px] select-none z-10 font-sans">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  Cargo Checked
                </div>

                {/* Line Numbers column */}
                <div className="w-10 py-3 text-outline-variant text-right pr-2.5 bg-surface/50 select-none overflow-hidden shrink-0 border-r border-outline-variant/30 text-[12px] leading-[22px] font-mono">
                  {linesArray.map((_, i) => (
                    <div key={i} className="h-[22px]">{i + 1}</div>
                  ))}
                </div>

                {/* Real interactive editable textarea with visual alignments */}
                <div className="flex-1 relative overflow-auto bg-surface font-mono select-text">
                  <textarea
                    ref={textareaRef}
                    value={files[currentFile]?.content}
                    onChange={handleCodeChange}
                    onSelect={handleCursorActivity}
                    onClick={handleCursorActivity}
                    onKeyUp={handleCursorActivity}
                    className="w-full h-full min-h-full bg-transparent border-none outline-none resize-none px-3 py-3 font-mono text-[13px] leading-[22px] text-on-surface focus:ring-0 p-0 selection:bg-primary/20 cursor-text"
                    spellCheck="false"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-outline select-none gap-2">
                <span className="material-symbols-outlined text-[48px] text-outline-variant">
                  inventory_2
                </span>
                <p className="font-sans text-[13px]">No file selected.</p>
                <button
                  onClick={() => selectFile("src/models.rs")}
                  className="px-3 py-1 bg-surface-variant hover:bg-surface-variant/80 text-primary border border-outline-variant rounded font-sans text-[12px] cursor-pointer"
                >
                  Open models.rs
                </button>
              </div>
            )}
          </div>

          {/* Bottom Build/Terminal Logs Panel */}
          <BottomPanel
            activeTab={activeBottomTab}
            setActiveTab={setActiveBottomTab}
            buildStatus={buildStatus}
            buildLogs={buildLogs}
            buildSteps={buildSteps}
            selectedStepId={selectedBuildStepId}
            setSelectedStepId={setSelectedBuildStepId}
            terminalLogs={terminalLogs}
          />
        </main>

        {/* Rightmost AI chat assistant panel */}
        {rightPanel === "ai" && (
          <AIChatPanel
            chatMessages={aiChatMessages}
            userInputChat={userInputChat}
            setUserInputChat={setUserInputChat}
            onSendChatMessage={sendChatMessage}
            isModelResponding={isModelResponding}
            onClose={() => setRightPanel("none")}
          />
        )}

        {/* Rightmost auxiliary side utility rail */}
        <nav className="bg-surface-container-low text-outline font-label-caps text-label-caps w-10 h-full flex flex-col border-l border-outline-variant py-2 shrink-0 items-center justify-start z-40 select-none">
          <div className="flex flex-col w-full items-center gap-1.5">
            <button
              onClick={() => setRightPanel(rightPanel === "ai" ? "none" : "ai")}
              className={`w-full h-10 flex items-center justify-center border-r-2 transition-all cursor-pointer ${
                rightPanel === "ai"
                  ? "border-primary text-primary bg-surface-variant"
                  : "border-transparent text-outline hover:text-on-surface hover:bg-surface-container"
              }`}
              title="Gemini AI Assistant"
            >
              <span className="material-symbols-outlined text-[20px]">psychology_alt</span>
            </button>

            <button
              onClick={() => alert("Local SQLite/PostgreSQL Database explorer")}
              className="w-full h-10 flex items-center justify-center border-r-2 border-transparent text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              title="Database Explorer"
            >
              <span className="material-symbols-outlined text-[20px] text-primary">database</span>
            </button>

            <button
              onClick={() => alert("Maven package managers")}
              className="w-full h-10 flex items-center justify-center border-r-2 border-transparent text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              title="Maven dependency tree"
            >
              <span className="material-symbols-outlined text-[20px]">account_tree</span>
            </button>

            <button
              onClick={() => alert("No new workspace system notifications.")}
              className="w-full h-10 flex items-center justify-center border-r-2 border-transparent text-outline hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              title="System Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Persistent Bottom status metadata footer bar */}
      <footer className="bg-surface-container-low border-t border-outline-variant text-on-surface-variant font-body-sm text-[11px] w-full h-6 flex justify-between items-center px-3 z-50 shrink-0 select-none">
        <div className="flex items-center gap-4 h-full">
          <div 
            onClick={() => alert("System connected to sandbox container cluster.")}
            className="flex items-center gap-1 hover:bg-surface-variant h-full px-2 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">desktop_windows</span>
          </div>
          
          {currentFile && (
            <div className="flex items-center gap-1 hover:bg-surface-variant h-full px-2 cursor-pointer transition-colors">
              oxide-plugin-intellij &gt; {currentFile.replace(/\//g, " > ")}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 h-full">
          <div 
            onClick={() => triggerBuildSimulation(false)}
            className="hover:bg-surface-variant h-full px-2 flex items-center cursor-pointer transition-colors gap-1 text-[11px]"
          >
            <span className="material-symbols-outlined text-[13px] text-secondary">settings</span>
            Cargo Check
          </div>
          <div className="hover:bg-surface-variant h-full px-2 flex items-center cursor-pointer transition-colors">
            {cursorPos.line}:{cursorPos.ch}
          </div>
          <div className="hover:bg-surface-variant h-full px-2 flex items-center cursor-pointer transition-colors">
            LF
          </div>
          <div className="hover:bg-surface-variant h-full px-2 flex items-center cursor-pointer transition-colors">
            UTF-8
          </div>
          <div 
            onClick={() => alert("Source formatting mode set to 4 spaces tab sizes.")}
            className="hover:bg-surface-variant h-full px-2 flex items-center cursor-pointer transition-colors gap-1"
          >
            <span className="material-symbols-outlined text-[13px]">space_bar</span>
            4 spaces
          </div>
          <div className="hover:bg-surface-variant h-full px-2 flex items-center cursor-pointer transition-colors">
            x86_64-unknown-linux-gnu
          </div>
          <div className="hover:bg-surface-variant h-full px-2 flex items-center cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-[13px]">lock</span>
          </div>
        </div>
      </footer>

      {/* IntelliJ Search Everywhere Dialog (Ctrl+T) */}
      {showSearchEverywhere && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-24 z-[999] p-4 select-none">
          <div className="bg-surface-container border border-outline border-shadow w-full max-w-lg rounded-lg shadow-2xl flex flex-col overflow-hidden max-h-[400px]">
            {/* Input field */}
            <div className="flex items-center gap-2 p-2 border-b border-outline-variant bg-surface">
              <span className="material-symbols-outlined text-[18px] text-outline">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files everywhere..."
                className="bg-transparent border-none outline-none focus:ring-0 p-1 flex-1 text-[13px] font-sans text-on-surface"
                autoFocus
              />
              <span className="text-[10px] bg-surface-variant px-1.5 py-0.5 rounded text-outline border border-outline-variant">
                ESC to close
              </span>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto py-1.5 font-mono text-[12px]">
              {filteredSearchFiles.length > 0 ? (
                filteredSearchFiles.map((fPath) => (
                  <div
                    key={fPath}
                    onClick={() => {
                      selectFile(fPath);
                      setShowSearchEverywhere(false);
                    }}
                    className="px-4 py-2 hover:bg-primary/20 hover:text-on-surface text-on-surface-variant cursor-pointer flex justify-between items-center transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px] text-primary">description</span>
                      <span>{fPath}</span>
                    </div>
                    <span className="text-[10px] opacity-55 font-sans">oxide-plugin-intellij</span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-[12px] text-outline font-sans">
                  No files match search constraints.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
