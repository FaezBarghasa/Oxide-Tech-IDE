import React, { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
    value: string;
    language: string;
    proposedChanges: monaco.editor.IModelDeltaDecoration[];
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ value, language, proposedChanges }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    useEffect(() => {
        if (editorRef.current) {
            editorInstance.current = monaco.editor.create(editorRef.current, {
                value,
                language,
                theme: 'vs-dark',
            });

            return () => {
                editorInstance.current?.dispose();
            };
        }
    }, []);

    useEffect(() => {
        if (editorInstance.current) {
            editorInstance.current.deltaDecorations([], proposedChanges);
        }
    }, [proposedChanges]);

    const handleAccept = () => {
        // In a real implementation, this would send a message to the Tauri backend
        // to accept the changes.
        console.log("Changes accepted");
    };

    const handleReject = () => {
        // In a real implementation, this would clear the decorations.
        console.log("Changes rejected");
    };

    return (
        <div>
            <div ref={editorRef} style={{ height: '500px' }} />
            <button onClick={handleAccept}>Accept Chunk</button>
            <button onClick={handleReject}>Reject</button>
        </div>
    );
};

export default MonacoEditor;
