import {Download, Share, Share2, Smartphone, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useI18n} from '../utils/i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'; platform: string}>;
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as {standalone?: boolean}).standalone === true;
    setIsInstalled(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function PWAInstallButton({
  compact = false,
  variant = 'button',
  onNotify,
  onShareAppLink,
  onAfterAction,
}: {
  compact?: boolean;
  variant?: 'button' | 'box' | 'sidebar';
  onNotify?: (msg: string) => void;
  onShareAppLink?: () => void;
  onAfterAction?: () => void;
}) {
  const {tr} = useI18n();
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled && !onShareAppLink) return null;

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        onNotify?.(
          tr(
            'تم تثبيت تطبيق مواعظ وعبر على جهازك بنجاح',
            'Mawaedh & Ibar has been installed on your device',
          ),
        );
      }
      onAfterAction?.();
      return;
    }
    setShowGuide(true);
  };

  const handleShare = () => {
    onAfterAction?.();
    onShareAppLink?.();
  };

  const buttonClassName = compact
    ? 'min-h-[40px] px-3 py-1.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors'
    : 'min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors';

  return (
    <>
      {variant === 'box' ? (
        <div className="w-full rounded-2xl bg-[#eefaf3] dark:bg-[#112921] border border-[#006a46]/25 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2.5 text-sm font-bold text-[#006a46] dark:text-[#6cdba6]">
              <Download className="w-4.5 h-4.5 shrink-0" />
              <span>{tr('تثبيت التطبيق ومشاركة الرابط', 'Install App & Share Link')}</span>
            </span>
          </div>
          <div className={`grid gap-2 ${!isInstalled && onShareAppLink ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {!isInstalled && (
              <button
                type="button"
                onClick={handleClick}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('تثبيت التطبيق', 'Install App')}</span>
              </button>
            )}
            {onShareAppLink && (
              <button
                type="button"
                onClick={handleShare}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-[#0a1914] border border-[#006a46]/30 hover:border-[#006a46] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('مشاركة الرابط', 'Share Link')}</span>
              </button>
            )}
          </div>
        </div>
      ) : variant === 'sidebar' ? (
        <div className="rounded-xl bg-[#eefaf3] dark:bg-[#112921] border border-[#006a46]/20 p-2 space-y-1.5">
          {!isInstalled && (
            <button
              type="button"
              onClick={handleClick}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-[#006a46] hover:bg-[#005235] text-white text-xs font-bold flex items-center gap-2.5 transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{tr('تثبيت التطبيق', 'Install App')}</span>
            </button>
          )}
          {onShareAppLink && (
            <button
              type="button"
              onClick={handleShare}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0a1914] border border-[#006a46]/25 text-[#006a46] dark:text-[#6cdba6] text-xs font-bold flex items-center gap-2.5 transition-colors whitespace-nowrap"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>{tr('مشاركة الرابط', 'Share Link')}</span>
            </button>
          )}
        </div>
      ) : (
        <button type="button" onClick={handleClick} className={buttonClassName}>
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>{tr('تثبيت التطبيق', 'Install App')}</span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pt-[40px] pb-[40px]"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0c211a] text-[#0e1d25] dark:text-[#e3f3fe] p-6 shadow-2xl space-y-4 max-h-[calc(100dvh-96px)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#006a46]/10 text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold">{tr('تثبيت تطبيق مواعظ وعبر', 'Install Mawaedh & Ibar')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label={tr('إغلاق', 'Close')}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="rounded-2xl bg-[#e8f6ff] dark:bg-[#112921] p-4 space-y-2 text-sm leading-relaxed">
                <p className="font-bold text-[#006a46] dark:text-[#6cdba6]">
                  {tr('التثبيت على iPhone و iPad:', 'Install on iPhone & iPad:')}
                </p>
                <p className="flex items-center gap-1.5">
                  {tr('١. اضغط على زر المشاركة (Share)', '1. Tap the Share button')} <Share className="w-4 h-4 inline" />{' '}
                  {tr('أسفل متصفح Safari.', 'at the bottom of Safari.')}
                </p>
                <p>
                  {tr('٢. اختر إضافة إلى الشاشة الرئيسية (Add to Home Screen).', '2. Select Add to Home Screen.')}
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-sm leading-relaxed">
                <div className="rounded-2xl bg-[#e8f6ff] dark:bg-[#112921] p-4 space-y-1.5">
                  <p className="font-bold text-[#006a46] dark:text-[#6cdba6]">
                    {tr('خطوات التثبيت في Chrome:', 'How to install in Chrome:')}
                  </p>
                  <p className="text-xs text-[#3e4a42] dark:text-slate-300">
                    {tr(
                      'افتح قائمة المتصفح (⋮) في الأعلى ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» ليصبح متاحاً للعمل بدون إنترنت.',
                      'Open the browser menu (⋮) and choose “Install app” or “Add to Home screen” to use the Quran & Adhkar offline.',
                    )}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-sm font-bold transition-colors"
            >
              {tr('فهمت ذلك', 'Got it')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
