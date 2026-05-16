import { useState, useCallback } from "react";

interface UseConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => Promise<void> | void;
}

export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<UseConfirmDialogOptions | null>(null);

  const confirm = useCallback((opts: UseConfirmDialogOptions) => {
    setOptions(opts);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setOptions(null);
  }, []);

  return {
    open,
    options,
    confirm,
    close,
  };
}
