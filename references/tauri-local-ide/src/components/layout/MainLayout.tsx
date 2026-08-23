import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { ActivityBar } from './ActivityBar';
import { FloatingAIChat } from '../chat/FloatingAIChat';
import { GitPanel } from '../git/GitPanel';
import { SkillsPanel } from '../skills/SkillsPanel';
import { MCPExplorer } from '../mcp/MCPExplorer';
import { CodeEditor } from '../editor/CodeEditor';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { useSettingsStore } from '../../state/settingsStore';

/**
 * Main application layout with CSS grid structure
 * @returns React Component
 */
export function MainLayout() {
  const { showActivityBar, showSidebar, showChat, showGit, showSkills, showMCP, toggleChat } = useSettingsStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        toggleChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleChat]);

  return (
    <div className="flex flex-col h-screen w-full bg-darcula-bg text-darcula-text font-sans overflow-hidden border border-darcula-border">
      <FloatingAIChat open={showChat} onOpenChange={toggleChat} />
      {showGit && <GitPanel />}
      {showSkills && <SkillsPanel />}
      {showMCP && <MCPExplorer />}

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        {showActivityBar && <ActivityBar />}
        
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-60 flex-shrink-0 border-r border-darcula-border bg-darcula-toolwindow flex flex-col">
            <Sidebar />
          </div>
        )}
        
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-darcula-bg">
          <div className="flex-1 overflow-hidden relative">
            <CodeEditor />
          </div>
          
          {/* Terminal / Diagnostics Panel */}
          <div className="h-48 flex-shrink-0 border-t border-darcula-border bg-darcula-toolwindow flex flex-col">
            <TerminalPanel />
          </div>
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="h-6 flex-shrink-0">
        <StatusBar />
      </div>
    </div>
  );
}
