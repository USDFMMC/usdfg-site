import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  getDeployLabelParts,
  shouldShowStalePagesWarning,
} from '@/lib/deploy/stalePagesWarning';

const DISMISS_KEY = 'usdfg_dismiss_stale_pages_banner';

export default function StalePagesDeployBanner() {
  const shouldShow = useMemo(() => shouldShowStalePagesWarning(), []);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  const label = useMemo(() => getDeployLabelParts().join(' · '), []);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  if (!shouldShow || dismissed) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[100] border-b border-amber-500/40 bg-[#1a1408]/95 px-3 py-2 text-center text-xs text-amber-100/95 backdrop-blur-sm sm:px-4 sm:text-left"
    >
      <div className="mx-auto flex max-w-4xl items-start justify-center gap-2 sm:justify-between">
        <p className="leading-snug">
          <span className="font-semibold text-amber-300">Preview QA:</span>{' '}
          This URL is the production-style Pages host (
          <span className="font-mono text-amber-200/90">usdfg-app.pages.dev</span>
          ) and may be a stale build. Use the Cloudflare{' '}
          <span className="font-semibold">Preview</span> URL for your branch
          (e.g. <span className="font-mono">safety/prelaunch-hardening-p0</span>
          ).
          {label ? (
            <span className="mt-1 block font-mono text-[10px] text-amber-200/70 sm:mt-0 sm:inline sm:pl-2">
              {label}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded p-1 text-amber-200/80 hover:bg-amber-500/20 hover:text-amber-100"
          aria-label="Dismiss warning"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
