import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTournamentStore } from '@/store/useTournamentStore';

export function ToastProvider() {
  const toast = useTournamentStore(state => state.toast);
  const clearToast = useTournamentStore(state => state.clearToast);
  const { toast: showToast } = useToast();

  useEffect(() => {
    if (toast) {
      showToast({
        variant: toast.type === 'destructive' ? 'destructive' : 'default',
        title: toast.title,
        description: toast.description,
      });
      
      // Clear the toast after it's been displayed
      clearToast();
    }
  }, [toast, showToast, clearToast]);

  return null;
}