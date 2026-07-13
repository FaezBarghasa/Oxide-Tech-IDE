import React, { useState, useEffect } from 'react';

interface TimelineStep {
    id: string;
    title: string;
    details: any; // In a real implementation, this would be a structured type
}

const TimelineInspector: React.FC = () => {
    const [steps, setSteps] = useState<TimelineStep[]>([]);
    const [selectedStep, setSelectedStep] = useState<TimelineStep | null>(null);

    useEffect(() => {
        // In a real implementation, this would fetch the timeline from the backend.
        setSteps([
            { id: '1', title: 'Initial Commit', details: {} },
            { id: '2', title: 'Agent Action 1', details: {} },
            { id: '3', title: 'Compiler Error', details: {} },
        ]);
    }, []);

    const handleRollback = (stepId: string) => {
        // In a real implementation, this would call the backend to rollback.
        console.log(`Rolling back to step ${stepId}`);
    };

    return (
        <div>
            <h2>Timeline</h2>
            <ul>
                {steps.map(step => (
                    <li key={step.id} onClick={() => setSelectedStep(step)}>
                        {step.title}
                    </li>
                ))}
            </ul>
            {selectedStep && (
                <div>
                    <h3>Step Details</h3>
                    <pre>{JSON.stringify(selectedStep.details, null, 2)}</pre>
                    <button onClick={() => handleRollback(selectedStep.id)}>Rollback and Replan</button>
                </div>
            )}
        </div>
    );
};

export default TimelineInspector;
