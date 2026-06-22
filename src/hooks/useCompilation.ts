import { useMutation } from '@tanstack/react-query';
import { tauriCommands } from '../services/tauri';
import { useCompilationStore } from '../state/compilationStore';

export function useCargoCheck(workspacePath: string) {
  const { setBuildStatus } = useCompilationStore();
  
  return useMutation({
    mutationFn: async () => {
      setBuildStatus('running');
      const output = await tauriCommands.spawnCargoCheck(workspacePath);
      return output;
    },
    onSuccess: () => setBuildStatus('success'),
    onError: () => setBuildStatus('error')
  });
}
