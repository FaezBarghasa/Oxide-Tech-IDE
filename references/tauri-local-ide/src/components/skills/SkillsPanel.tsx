import React from 'react';
import { useSkillsStore } from '../../state/skillsStore';
import { Terminal } from 'lucide-react';

export function SkillsPanel() {
  const { skills, executeSkill } = useSkillsStore();

  return (
    <div className="fixed top-20 right-4 w-96 h-[60vh] bg-darcula-toolwindow border border-darcula-border rounded-lg shadow-2xl flex flex-col z-[101] overflow-hidden">
      <div className="p-3 border-b border-darcula-border font-bold text-xs uppercase tracking-widest text-darcula-text">
        <Terminal className="w-4 h-4 inline mr-2 text-darcula-accent" /> Skills
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {skills.map(skill => (
          <button key={skill.id} onClick={() => executeSkill(skill.id)} className="w-full text-left p-2 hover:bg-darcula-selection rounded text-xs text-darcula-text">
            {skill.name}
          </button>
        ))}
      </div>
    </div>
  );
}
