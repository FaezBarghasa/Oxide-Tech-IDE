import React, { useEffect } from 'react';
import { create } from 'zustand';

interface TimelineStep {
    id: string;
    title: string;
    details: any;
}

interface TimelineState {
    steps: TimelineStep[];
    selectedStep: TimelineStep | null;
    fetchSteps: () => Promise<void>;
    selectStep: (step: TimelineStep) => void;
    rollback: (stepId: string) => Promise<void>;
}

const useTimelineStore = create<TimelineState>((set) => ({
    steps: [],
    selectedStep: null,
    fetchSteps: async () => {
        // Replace with actual API call
        const mockSteps: TimelineStep[] = [
            { id: '1', title: 'Initial Commit', details: { prompt: "Initial state" } },
            { id: '2', title: 'Agent Action 1', details: { diff: "+ console.log('hello')" } },
            { id: '3', title: 'Compiler Error', details: { error: "SyntaxError" } },
        ];
        set({ steps: mockSteps });
    },
    selectStep: (step) => set({ selectedStep: step }),
    rollback: async (stepId) => {
        // Replace with actual API call
        console.log(`Rolling back to step ${stepId}`);
        // After rollback, you might want to refetch the steps
    },
}));

const TimelineInspector: React.FC = () => {
    const { steps, selectedStep, fetchSteps, selectStep, rollback } = useTimelineStore();

    useEffect(() => {
        fetchSteps();
    }, [fetchSteps]);

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <div className="w-1/4 border-r border-gray-700 p-4">
                <h2 className="text-lg font-bold mb-4">Timeline</h2>
                <ul>
                    {steps.map(step => (
                        <li 
                            key={step.id} 
                            className={`cursor-pointer p-2 rounded ${selectedStep?.id === step.id ? 'bg-blue-500' : 'hover:bg-gray-800'}`}
                            onClick={() => selectStep(step)}
                        >
                            {step.title}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="w-3/4 p-4">
                {selectedStep ? (
                    <div>
                        <h3 className="text-lg font-bold mb-4">Step Details</h3>
                        <div className="bg-gray-800 p-4 rounded">
                            <pre>{JSON.stringify(selectedStep.details, null, 2)}</pre>
                        </div>
                        <button 
                            className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                            onClick={() => rollback(selectedStep.id)}
                        >
                            Rollback and Replan
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p>Select a step to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineInspector;
