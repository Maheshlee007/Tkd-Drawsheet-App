import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AutoCloseErrorModalProps {
  open: boolean;
  title?: string;
  message: string;
  durationMs?: number;
  onOpenChange: (open: boolean) => void;
}

export function AutoCloseErrorModal({
  open,
  title = 'Unable to continue',
  message,
  durationMs = 2000,
  onOpenChange,
}: AutoCloseErrorModalProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => onOpenChange(false), durationMs);
    return () => clearTimeout(timer);
  }, [open, durationMs, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-700">{message}</p>
      </DialogContent>
    </Dialog>
  );
}
