"use client";
import { RotateCcw } from 'lucide-react';
import { wsService } from '@/lib/websocket';

export function UndoRequestOverlay({ t }: { t: (key: string) => string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border shadow-xl rounded-xl w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2 text-primary">
          <RotateCcw className="w-5 h-5" /> {t("undoQuestion")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t("undoDescription")}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => wsService.send('answer_undo', { accept: false })}
            className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-bold transition-colors"
          >
            {t("no")}
          </button>
          <button
            onClick={() => wsService.send('answer_undo', { accept: true })}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-bold transition-colors shadow-sm"
          >
            {t("yes")}
          </button>
        </div>
      </div>
    </div>
  );
}
