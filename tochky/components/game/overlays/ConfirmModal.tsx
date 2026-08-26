"use client";
import { X } from 'lucide-react';
import { ReactNode } from 'react';

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  icon,
  confirmButtonClass
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  icon?: ReactNode;
  confirmButtonClass?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border shadow-xl rounded-xl w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          {icon} {title}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {description}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-md text-sm font-medium transition-colors shadow-sm ${confirmButtonClass || 'bg-primary hover:bg-primary/90'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
