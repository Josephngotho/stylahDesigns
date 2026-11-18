import { Download, Share, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Install Stylah app on your device"
        className={
          compact
            ? 'min-h-[40px] px-2.5 rounded border border-[#e5e7eb] text-xs font-semibold text-[#202020] hover:bg-[#f8f9fa] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0'
            : 'min-h-[42px] px-3 rounded border border-[#e5e7eb] text-xs font-semibold text-[#202020] hover:bg-[#f8f9fa] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0'
        }
      >
        <Download className="w-3.5 h-3.5 text-[#a81825]" />
        <span>{compact ? 'Install' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Install on iPhone or iPad"
          className={
            compact
              ? 'min-h-[40px] px-2.5 rounded border border-[#e5e7eb] text-xs font-semibold text-[#202020] hover:bg-[#f8f9fa] inline-flex items-center gap-1 whitespace-nowrap shrink-0'
              : 'min-h-[42px] px-3 rounded border border-[#e5e7eb] text-xs font-semibold text-[#202020] hover:bg-[#f8f9fa] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0'
          }
        >
          <Download className="w-3.5 h-3.5 text-[#a81825]" />
          <span>{compact ? 'Install' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white border border-[#e5e7eb] p-6 shadow-level-2 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-[#202020]">
                  Install Stylah on iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close guide"
                  className="p-1 rounded hover:bg-[#f5f5f5]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-xs text-[#5a403f] space-y-2 list-decimal list-inside">
                <li>
                  Tap the <Share className="w-3.5 h-3.5 inline mx-0.5 text-[#a81825]" />{' '}
                  <strong>Share</strong> icon in the Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> to launch Stylah Designs &amp; Interiors as a standalone app.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[44px] rounded bg-[#a81825] text-white text-xs font-semibold hover:bg-[#820014]"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
