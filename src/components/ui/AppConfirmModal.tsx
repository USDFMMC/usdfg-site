import React from "react";

export type AppConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red-styled primary action (destructive delete/cancel) */
  destructive?: boolean;
};

type AppConfirmModalProps = AppConfirmDialogOptions & {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * In-app confirm dialog (replaces window.confirm) — void shell + KIMI tokens.
 */
export function AppConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel,
}: AppConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-confirm-title"
        className="relative z-10 w-full max-w-md rounded-xl border border-white/10 bg-[#07080C] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.55)] ring-1 ring-purple-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="app-confirm-title" className="text-lg font-bold text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-white/70 whitespace-pre-wrap mb-4">{message}</p>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded-lg border border-white/10 text-white/90 text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              destructive
                ? "px-3 py-2 rounded-lg bg-red-600/90 hover:brightness-110 text-white text-sm font-semibold border border-red-500/40 transition-all"
                : "px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-orange-500 hover:brightness-110 text-white text-sm font-semibold border border-white/10 shadow-[0_0_10px_rgba(124,58,237,0.22)] transition-all"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
