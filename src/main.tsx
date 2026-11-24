import {Component, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import {LanguageProvider} from './utils/i18n.tsx';

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
  });
} else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => undefined);
}

class AppErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = {hasError: false};
  }

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-white text-[#0e1d25] flex flex-col items-center justify-center p-6 text-center space-y-4"
        >
          <h1 className="text-xl font-extrabold text-[#006a46]">مواعظ وعبر</h1>
          <p className="text-sm text-[#3e4a42] max-w-md">
            حدث تعارض مؤقت في عرض الصفحة. اضغط الزر أدناه لاستعادة العرض الطبيعي والعودة للرئيسية.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                window.localStorage.removeItem('mawaedh_theme_v1');
              } catch {
                // ignore
              }
              window.location.href = '/?tab=home';
            }}
            className="min-h-[44px] px-6 py-2.5 rounded-2xl bg-[#006a46] text-white text-sm font-bold"
          >
            إعادة تحميل الصفحة الرئيسية
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </AppErrorBoundary>,
);
