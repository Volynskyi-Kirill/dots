"use client";
import { Copy, Check, Share2 } from 'lucide-react';
import { useState } from 'react';

export function WaitingOverlay({ 
  roomId, 
  doLeaveRoom, 
  t 
}: { 
  roomId: string; 
  doLeaveRoom: () => void;
  t: (key: string) => string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const inviteUrl = window.location.href;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = inviteUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleShare = async () => {
    const inviteUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Dots Game Invitation',
          text: `Join my Dots game in room: ${roomId}`,
          url: inviteUrl,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10 p-4">
      <div className="bg-card border shadow-2xl rounded-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">{t("waiting")}</h2>
        <p className="text-sm text-muted-foreground mb-8">
          {t("shareInstruction")}
        </p>
        
        <div className="flex items-center justify-between bg-secondary/30 p-3 rounded-lg border mb-6">
          <div className="flex flex-col items-start overflow-hidden mr-3">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t("roomPrefix")}</span>
            <span className="font-mono font-bold text-lg text-primary truncate max-w-[150px]">{roomId}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              title={t("copyInviteLink")}
              className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleShare}
              title={t("shareLink")}
              className="p-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <button onClick={doLeaveRoom} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
