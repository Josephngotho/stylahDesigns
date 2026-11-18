import {
  BatteryCharging,
  ExternalLink,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Monitor,
  RotateCw,
  Signal,
  Smartphone,
  Terminal,
  Wifi,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type PixelFinish = 'obsidian' | 'porcelain' | 'hazel';
type StudioBackdrop = 'light' | 'linen' | 'cinema';

const PIXEL_FINISHES: Record<
  PixelFinish,
  {
    label: string;
    outerBg: string;
    rimBorder: string;
    innerBezel: string;
    buttonBg: string;
  }
> = {
  obsidian: {
    label: 'Obsidian',
    outerBg: 'bg-gradient-to-b from-[#2b2c30] via-[#1c1d20] to-[#141518]',
    rimBorder: 'border-[#4a4c52]/70',
    innerBezel: 'bg-[#0b0b0d]',
    buttonBg: 'bg-[#35373d]',
  },
  porcelain: {
    label: 'Porcelain',
    outerBg: 'bg-gradient-to-b from-[#e6e1dc] via-[#d5cfc9] to-[#c4bdb6]',
    rimBorder: 'border-white/80',
    innerBezel: 'bg-[#121214]',
    buttonBg: 'bg-[#bab3ab]',
  },
  hazel: {
    label: 'Hazel',
    outerBg: 'bg-gradient-to-b from-[#6a726d] via-[#545c57] to-[#434a46]',
    rimBorder: 'border-[#96a09a]/60',
    innerBezel: 'bg-[#0d0e0f]',
    buttonBg: 'bg-[#5c655f]',
  },
};

const STUDIO_BACKDROPS: Record<
  StudioBackdrop,
  { label: string; wrapperClass: string; badgeClass: string }
> = {
  light: {
    label: 'Daylight Studio',
    wrapperClass: 'bg-gradient-to-br from-[#f3f4f6] via-[#e5e7eb] to-[#eef2f6] text-[#1f2937]',
    badgeClass: 'bg-white/90 text-[#1f2937] border-[#d1d5db]',
  },
  linen: {
    label: 'Stylah Linen',
    wrapperClass: 'bg-gradient-to-br from-[#fcf9f8] via-[#f4ece9] to-[#ede2de] text-[#202020]',
    badgeClass: 'bg-white/90 text-[#202020] border-[#e5e7eb]',
  },
  cinema: {
    label: 'Dark Cinema',
    wrapperClass: 'bg-[radial-gradient(ellipse_at_top,_#2a2224_0%,_#121011_65%,_#090809_100%)] text-[#f5f1f0]',
    badgeClass: 'bg-[#1c1919]/90 text-[#f5f1f0] border-[#3a3232]',
  },
};

function formatStatusClock(): string {
  return new Date().toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function DevicePreviewStudio() {
  const [finish, setFinish] = useState<PixelFinish>('obsidian');
  const [backdrop, setBackdrop] = useState<StudioBackdrop>('linen');
  const [statusBarDark, setStatusBarDark] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(true);
  const [recordMode, setRecordMode] = useState(false);
  const [showEmulatorGuide, setShowEmulatorGuide] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [clock, setClock] = useState(formatStatusClock);
  const [autoScale, setAutoScale] = useState(0.88);

  // Normal modern Pixel smartphone display proportions (~2:1 ratio): 396 x 796
  const screenWidth = 396;
  const screenHeight = 796;
  const chassisWidth = screenWidth + 20;
  const chassisHeight = screenHeight + 20;

  useEffect(() => {
    const timer = window.setInterval(() => setClock(formatStatusClock()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  // Sync Pixel Android status bar tone with the app's persisted Light/Dark theme
  useEffect(() => {
    const syncStatusTheme = () => {
      try {
        setStatusBarDark(localStorage.getItem('stylah_theme') === 'dark');
      } catch {
        setStatusBarDark(false);
      }
    };
    syncStatusTheme();
    const poll = window.setInterval(syncStatusTheme, 500);
    window.addEventListener('storage', syncStatusTheme);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('storage', syncStatusTheme);
    };
  }, []);

  useEffect(() => {
    const computeScale = () => {
      const topReserve = recordMode ? 48 : 116;
      const sideReserve = 64;
      const maxH = Math.max(420, window.innerHeight - topReserve);
      const maxW = Math.max(320, window.innerWidth - sideReserve);
      const scaleH = maxH / chassisHeight;
      const scaleW = maxW / chassisWidth;
      setAutoScale(Math.max(0.52, Math.min(1, Number(Math.min(scaleH, scaleW).toFixed(3)))));
    };
    computeScale();
    window.addEventListener('resize', computeScale);
    return () => window.removeEventListener('resize', computeScale);
  }, [chassisHeight, chassisWidth, recordMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape' && showEmulatorGuide) {
        setShowEmulatorGuide(false);
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        setRecordMode((prev) => !prev);
      }
      if (e.key === 'Escape' && recordMode) {
        setRecordMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [recordMode, showEmulatorGuide]);

  const activeScale = fitToScreen ? autoScale : 1;
  const finishStyle = PIXEL_FINISHES[finish];
  const backdropStyle = STUDIO_BACKDROPS[backdrop];

  const handleExitPreview = () => {
    window.location.href = '/';
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-between transition-colors duration-300 select-none ${backdropStyle.wrapperClass}`}
    >
      {/* Presentation Studio Control Bar (Hidden in Recording Mode) */}
      {!recordMode ? (
        <header className="w-full px-4 sm:px-6 pt-3 pb-2 z-20">
          <div
            className={`max-w-7xl mx-auto rounded-xl border px-3.5 py-2.5 shadow-sm backdrop-blur-md flex flex-wrap items-center justify-between gap-3 ${backdropStyle.badgeClass}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#a81825] text-white flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-display text-xs sm:text-sm font-bold leading-tight">
                  Pixel 9 Pro Interactive Preview
                </p>
                <p className="text-[11px] opacity-75">
                  Live app running at 396 &times; 796dp mobile viewport (dev &amp; demo studio)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Pixel Finish Switcher */}
              <div className="inline-flex items-center rounded-lg border border-black/10 dark:border-white/10 p-0.5 bg-black/5">
                {(Object.keys(PIXEL_FINISHES) as PixelFinish[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFinish(key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      finish === key
                        ? 'bg-[#a81825] text-white shadow-xs'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    {PIXEL_FINISHES[key].label}
                  </button>
                ))}
              </div>

              {/* Studio Backdrop Switcher */}
              <div className="inline-flex items-center rounded-lg border border-black/10 dark:border-white/10 p-0.5 bg-black/5">
                {(Object.keys(STUDIO_BACKDROPS) as StudioBackdrop[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBackdrop(key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      backdrop === key
                        ? 'bg-[#202020] text-white shadow-xs'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                  >
                    {STUDIO_BACKDROPS[key].label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setFitToScreen((prev) => !prev)}
                title={fitToScreen ? 'Switch to 100% 1:1 Scale' : 'Fit to Screen'}
                className="h-8 px-2.5 rounded-lg border border-current/15 font-semibold inline-flex items-center gap-1.5 hover:bg-black/5"
              >
                {fitToScreen ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                <span>{fitToScreen ? `Fit (${Math.round(activeScale * 100)}%)` : '100%'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIframeKey((k) => k + 1)}
                title="Reload running app"
                className="h-8 px-2.5 rounded-lg border border-current/15 font-semibold inline-flex items-center gap-1.5 hover:bg-black/5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reload</span>
              </button>

              <button
                type="button"
                onClick={() => setRecordMode(true)}
                title="Hide studio controls for clean screen recording (Shortcut: R)"
                className="h-8 px-3 rounded-lg bg-[#a81825] text-white font-semibold inline-flex items-center gap-1.5 hover:bg-[#820014]"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Record Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEmulatorGuide(true)}
                className="h-8 px-2.5 rounded-lg border border-current/15 font-semibold inline-flex items-center gap-1.5 hover:bg-black/5"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Android Studio AVD</span>
              </button>

              <button
                type="button"
                onClick={handleExitPreview}
                title="Open full production view without phone frame"
                className="h-8 px-2.5 rounded-lg border border-current/15 font-semibold inline-flex items-center gap-1.5 hover:bg-black/5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Full App</span>
              </button>
            </div>
          </div>
        </header>
      ) : (
        <button
          type="button"
          onClick={() => setRecordMode(false)}
          className="fixed top-3 right-3 z-30 h-8 px-3 rounded-full bg-black/45 text-white/90 text-[11px] font-medium backdrop-blur-md opacity-30 hover:opacity-100 transition-opacity inline-flex items-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Show Controls (R / Esc)</span>
        </button>
      )}

      {/* Centered Realistic Google Pixel 9 Pro Hardware Chassis */}
      <main className="flex-1 w-full flex items-center justify-center p-4 overflow-auto">
        <div
          style={{
            width: `${chassisWidth * activeScale}px`,
            height: `${chassisHeight * activeScale}px`,
          }}
          className="relative shrink-0 flex items-center justify-center transition-all duration-200"
        >
          <div
            style={{
              width: `${chassisWidth}px`,
              height: `${chassisHeight}px`,
              transform: `scale(${activeScale})`,
              transformOrigin: 'center center',
            }}
            className={`relative rounded-[46px] p-[10px] border-[2px] ${finishStyle.outerBg} ${finishStyle.rimBorder} shadow-[0_32px_70px_-14px_rgba(0,0,0,0.48),0_12px_24px_-8px_rgba(0,0,0,0.28),inset_0_1px_2px_rgba(255,255,255,0.28)]`}
          >
            {/* Top Earpiece Micro-Slit */}
            <div
              aria-hidden="true"
              className="absolute top-[4px] left-1/2 -translate-x-1/2 w-[52px] h-[3px] rounded-full bg-[#09090b] shadow-inner opacity-85"
            />

            {/* Right Edge Hardware Keys (Power & Volume Rocker — Pixel layout) */}
            <div
              aria-hidden="true"
              title="Power Button"
              className={`absolute -right-[5px] top-[168px] w-[4px] h-[48px] rounded-r-sm ${finishStyle.buttonBg} shadow-sm`}
            />
            <div
              aria-hidden="true"
              title="Volume Rocker"
              className={`absolute -right-[5px] top-[236px] w-[4px] h-[86px] rounded-r-sm ${finishStyle.buttonBg} shadow-sm`}
            />

            {/* Inner Black Glass Display Screen */}
            <div
              className={`relative w-full h-full rounded-[36px] overflow-hidden ${finishStyle.innerBezel} ring-1 ring-black/60 flex flex-col`}
            >
              {/* Android 15 System Status Bar with Centered Pixel Punch-Hole Camera */}
              <div
                className={`relative h-[30px] shrink-0 px-6 flex items-center justify-between text-[11px] font-semibold tracking-tight transition-colors ${
                  statusBarDark
                    ? 'bg-[#121010] text-[#f5f1f0]'
                    : 'bg-white text-[#202020]'
                }`}
              >
                <span className="tabular-nums">{clock}</span>

                {/* Centered Pixel Punch-Hole Front Camera */}
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full bg-[#050507] ring-1 ring-white/15 flex items-center justify-center shadow-inner"
                >
                  <div className="w-[6px] h-[6px] rounded-full bg-gradient-to-tr from-[#13254a] via-[#1b3a70] to-[#638cd8] opacity-90" />
                </div>

                <div className="flex items-center gap-1.5">
                  <Signal className="w-3.5 h-3.5" />
                  <Wifi className="w-3.5 h-3.5" />
                  <div className="flex items-center gap-0.5 text-[11px] tabular-nums">
                    <span>100%</span>
                    <BatteryCharging className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Actual Running Live Application inside 412px Mobile Viewport */}
              <div className="relative flex-1 w-full bg-white overflow-hidden">
                <iframe
                  key={iframeKey}
                  src="/?deviceFrame=1"
                  title="Stylah Designs & Interiors — Live Mobile Application"
                  className="w-full h-full border-0 block"
                  allow="clipboard-read; clipboard-write; payment"
                />
              </div>

              {/* Android Gesture Navigation Pill Home Indicator */}
              <div
                aria-hidden="true"
                className={`h-[14px] shrink-0 flex items-center justify-center transition-colors ${
                  statusBarDark ? 'bg-[#121010]' : 'bg-white'
                }`}
              >
                <div
                  className={`w-[110px] h-[4px] rounded-full ${
                    statusBarDark ? 'bg-white/35' : 'bg-black/25'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {!recordMode && (
        <footer className="pb-3 px-4 text-center text-[11px] opacity-65">
          Press <kbd className="px-1.5 py-0.5 rounded bg-black/10 font-mono">R</kbd> to toggle clean screen-recording mode · Actual app viewport without simulated UI
        </footer>
      )}

      {/* Android Studio Emulator Setup Modal */}
      {showEmulatorGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl bg-white text-[#202020] border border-[#e5e7eb] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Monitor className="w-5 h-5 text-[#a81825]" />
                <h2 className="font-display text-base font-bold">
                  Running Native Android on Android Studio Emulator
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowEmulatorGuide(false)}
                aria-label="Close guide"
                className="p-1.5 rounded hover:bg-[#f5f5f5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-[#5a403f] leading-relaxed max-h-[75vh] overflow-y-auto">
              <p>
                This cloud workspace runs the live React + Vite application on Linux without an Android SDK / KVM virtualizer, so a hardware Android Virtual Device (AVD) cannot boot inside this browser container. The Pixel 9 Pro frame behind this window renders your live running web app at native mobile dimensions for demos and screen recording.
              </p>
              <p className="font-semibold text-[#202020]">
                To run the native Kotlin / Jetpack Compose app in the <code className="px-1 py-0.5 bg-[#f5f5f5] rounded">/android</code> folder on your computer:
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Install <strong>Android Studio (Ladybug or newer)</strong> and open the{' '}
                  <code className="px-1 py-0.5 bg-[#f5f5f5] rounded">/android</code> directory.
                </li>
                <li>
                  Open <strong>Tools &rarr; Device Manager &rarr; Create Device</strong>, choose{' '}
                  <strong>Pixel 8 Pro</strong> or <strong>Pixel 9 Pro</strong>, and download an{' '}
                  <strong>API 34 / API 35 (Google Play)</strong> system image.
                </li>
                <li>
                  Place your Firebase <code className="px-1 py-0.5 bg-[#f5f5f5] rounded">google-services.json</code> inside{' '}
                  <code className="px-1 py-0.5 bg-[#f5f5f5] rounded">android/app/</code>.
                </li>
                <li>
                  Click <strong>Run &apos;app&apos;</strong> to launch the native Android app inside Android Studio&apos;s interactive Pixel emulator with built-in screen recording (<strong>Logcat &rarr; Record Screen</strong>).
                </li>
              </ol>
            </div>
            <div className="px-5 py-3 bg-[#f8f9fa] border-t border-[#e5e7eb] flex justify-end">
              <button
                type="button"
                onClick={() => setShowEmulatorGuide(false)}
                className="min-h-[40px] px-4 rounded bg-[#a81825] text-white text-xs font-semibold hover:bg-[#820014]"
              >
                Back to Pixel Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
