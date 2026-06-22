import { useQuery } from '@tanstack/react-query';
import { tauriCommands } from '../services/tauri';

export function useSystemStats() {
  return useQuery({
    queryKey: ['systemStats'],
    queryFn: () => tauriCommands.getSystemStats(),
    refetchInterval: 5000 // Refetch every 5 seconds
  });
}
