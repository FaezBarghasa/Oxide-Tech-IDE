import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import { ASTNode } from '../types/ast';

export function useAST(fileContent: string) {
  return useQuery({
    queryKey: ['ast', fileContent],
    queryFn: async () => {
      // Typically fetch from Actix backend here
      return apiClient.post('/parse', { content: fileContent }) as Promise<ASTNode>;
    },
    enabled: !!fileContent
  });
}
