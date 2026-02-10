import { useEffect } from 'react';

export function useAIDataRefresh(callback) {
  useEffect(() => {
    window.addEventListener('ai-data-updated', callback);
    return () => window.removeEventListener('ai-data-updated', callback);
  }, [callback]);
}
