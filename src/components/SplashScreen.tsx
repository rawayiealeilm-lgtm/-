import {ArrowLeft, ArrowRight, Globe, Sparkles} from 'lucide-react';
import {useState} from 'react';
import {useI18n} from '../utils/i18n';

export function SplashScreen({onFinish}: {onFinish: () => void}) {
  const {isEn, toggleLang, tr} = useI18n();
  const [exiting, setExiting] = useState(false);

  const handleStart = () => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(() => {
      onFinish();
    }, 420);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-gradient-to-b from-[#062d20] via-[#042117] to-[#063122] text-white flex flex-col items-center justify-between px-5 sm:px-8 pt-[40px] pb-[40px] select-none overflow-y-auto transition-all duration-500 ease-out ${
        exiting ? 'opacity-0 scale-[1.04] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes splashUnfold {
          0% { transform: scale(0.24) rotate(-75deg); opacity: 0; }
          65% { transform: scale(1.04) rotate(6deg); opacity: 0.96; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes splashClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes splashCounter {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes splashTextUp {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .sp-unfold { transform-origin: 250px 190px; animation: splashUnfold 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .sp-pinwheel { transform-origin: 250px 190px; animation: splashClockwise 26s linear infinite; }
        .sp-ring { transform-origin: 250px 190px; animation: splashCounter 36s linear infinite; }
        .sp-title { animation: splashTextUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .sp-unfold, .sp-pinwheel, .sp-ring, .sp-title { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* Top Row: Language Switcher on Welcome Screen */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2 text-xs text-emerald-300/90 font-semibold">
          <Sparkles className="w-4 h-4 text-[#fef08a]" />
          <span>{tr('مرحباً بكم في رحاب العلم والذكر', 'Welcome to Timeless Guidance')}</span>
        </div>

        <button
          type="button"
          onClick={toggleLang}
          aria-label={tr('Switch to English', 'التبديل إلى العربية')}
          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-[#fef08a] flex items-center gap-1.5 transition-colors cursor-pointer backdrop-blur-md"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{isEn ? 'العربية' : 'EN'}</span>
        </button>
      </div>

      {/* Center Emblem + Title */}
      <div className="my-auto flex flex-col items-center justify-center w-full max-w-md py-2">
        <div className="w-full max-w-[340px] sm:max-w-[400px] aspect-[500/490] flex items-center justify-center hero-3d-stage">
          <svg viewBox="0 0 500 500" className="w-full h-full drop-shadow-[0_18px_40px_rgba(16,185,129,0.22)]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="sp_glow" cx="50%" cy="38%" r="55%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                <stop offset="60%" stopColor="#059669" stopOpacity="0.09" />
                <stop offset="100%" stopColor="#050e0c" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="sp_gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="75%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#fef08a" />
              </linearGradient>
              <linearGradient id="sp_emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id="sp_cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="sp_rose" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fecdd3" />
                <stop offset="50%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
              <linearGradient id="sp_warmgold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="60%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            <circle cx="250" cy="190" r="190" fill="url(#sp_glow)" />
            <g className="sp-unfold">
              <g className="sp-ring">
                <circle cx="250" cy="190" r="148" fill="none" stroke="url(#sp_gold)" strokeWidth="1.8" strokeDasharray="6 6" opacity="0.6" />
                <circle cx="250" cy="190" r="158" fill="none" stroke="url(#sp_gold)" strokeWidth="1" opacity="0.35" />
                <circle cx="250" cy="42" r="3.5" fill="#fef08a" />
                <circle cx="355" cy="85" r="2.8" fill="#67e8f9" />
                <circle cx="398" cy="190" r="3.5" fill="#fef08a" />
                <circle cx="355" cy="295" r="2.8" fill="#34d399" />
                <circle cx="250" cy="338" r="3.5" fill="#fef08a" />
                <circle cx="145" cy="295" r="2.8" fill="#fb7185" />
                <circle cx="102" cy="190" r="3.5" fill="#fef08a" />
                <circle cx="145" cy="85" r="2.8" fill="#34d399" />
              </g>
              <g transform="translate(250, 190)">
                <path d="M 0 -105 L 30 -136 L 0 -168 L -30 -136 Z" fill="url(#sp_rose)" opacity="0.9" />
                <path d="M 0 105 L 30 136 L 0 168 L -30 136 Z" fill="url(#sp_rose)" opacity="0.9" />
                <path d="M -105 0 L -136 30 L -168 0 L -136 -30 Z" fill="url(#sp_cyan)" opacity="0.88" />
                <path d="M 105 0 L 136 30 L 170 0 L 136 -30 Z" fill="url(#sp_warmgold)" opacity="0.88" />
              </g>
              <g className="sp-pinwheel">
                <circle cx="250" cy="190" r="130" fill="#041a14" fillOpacity="0.5" stroke="url(#sp_gold)" strokeWidth="4" />
                <circle cx="250" cy="190" r="124" fill="none" stroke="url(#sp_gold)" strokeWidth="1.2" strokeDasharray="3 4" opacity="0.75" />
                <g transform="translate(250, 190)">
                  <path d="M 0 0 C 35 -38, 55 -92, 0 -126 C -55 -92, -35 -38, 0 0 Z" fill="url(#sp_emerald)" />
                  <path d="M 0 0 C 44 -10, 84 -34, 90 -90 C 34 -84, 10 -44, 0 0 Z" fill="url(#sp_warmgold)" opacity="0.95" />
                  <path d="M 0 0 C 38 35, 92 55, 126 0 C 92 -55, 38 -35, 0 0 Z" fill="url(#sp_cyan)" />
                  <path d="M 0 0 C 10 44, 34 84, 90 90 C 84 34, 44 10, 0 0 Z" fill="url(#sp_emerald)" opacity="0.92" />
                  <path d="M 0 0 C -35 38, -55 92, 0 126 C 55 92, 35 38, 0 0 Z" fill="url(#sp_warmgold)" />
                  <path d="M 0 0 C -44 10, -84 34, -90 90 C -34 84, -10 44, 0 0 Z" fill="url(#sp_rose)" opacity="0.95" />
                  <path d="M 0 0 C -38 -35, -92 -55, -126 0 C -92 55, -38 35, 0 0 Z" fill="url(#sp_cyan)" />
                  <path d="M 0 0 C -10 -44, -34 -84, -90 -90 C -84 -34, -44 -10, 0 0 Z" fill="url(#sp_emerald)" opacity="0.94" />
                  <circle cx="0" cy="0" r="28" fill="#042017" stroke="url(#sp_gold)" strokeWidth="2.5" />
                  <circle cx="0" cy="0" r="22" fill="#073024" stroke="url(#sp_gold)" strokeWidth="1" strokeDasharray="2 2" />
                  <path d="M -9 -12 A 15 15 0 1 0 12 8 A 11 11 0 1 1 -9 -12 Z" fill="url(#sp_gold)" />
                  <circle cx="8" cy="-5" r="2.8" fill="#fef08a" />
                </g>
              </g>
            </g>
            <g className="sp-title">
              <text x="250" y="396" textAnchor="middle" fontFamily="'Cairo', 'IBM Plex Sans Arabic', sans-serif" fontSize="42" fontWeight="800" fill="url(#sp_gold)">
                {isEn ? 'Mawaedh & Ibar' : 'مواعظ وعبر'}
              </text>
              <g transform="translate(250, 424)">
                <line x1="-115" y1="0" x2="-22" y2="0" stroke="url(#sp_gold)" strokeWidth="1.5" opacity="0.75" />
                <path d="M 0 -6 L 2.5 -2.5 L 6 0 L 2.5 2.5 L 0 6 L -2.5 2.5 L -6 0 L -2.5 -2.5 Z" fill="url(#sp_gold)" />
                <line x1="22" y1="0" x2="115" y2="0" stroke="url(#sp_gold)" strokeWidth="1.5" opacity="0.75" />
              </g>
              <text x="250" y="456" textAnchor="middle" fontFamily="'IBM Plex Sans Arabic', sans-serif" fontSize="15" fontWeight="600" fill="#34d399">
                {isEn ? 'Timeless Faith Reflections & Authentic Knowledge' : 'نفحات إيمانية وحكم خالدة'}
              </text>
              <text x="250" y="484" textAnchor="middle" fontFamily="'IBM Plex Sans Arabic', sans-serif" fontSize="12" fontWeight="600" fill="#fef08a" opacity="0.88">
                {isEn ? 'Est. 2015 · 1436 AH' : 'منذ عام 2015 م • 1436 هـ'}
              </text>
            </g>
          </svg>
        </div>

        {/* Manual Explicit Start CTA — Stays visible until visitor clicks */}
        <div className="w-full max-w-sm text-center space-y-4 sp-title mt-2">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {tr(
              'المصحف الشريف · الأذكار والأدعية الجامعة · فتاوى أهل العلم · صدى الخير · ومساعدك الدعوي',
              'Noble Quran · Comprehensive Adhkar & Duas · Scholarly Fatawa · Sada Al-Khair · Your Dawah Guide',
            )}
          </p>

          <button
            type="button"
            onClick={handleStart}
            className="group relative w-full sm:w-auto min-w-[230px] min-h-[56px] px-10 py-3.5 rounded-2xl bg-gradient-to-l from-[#006a46] via-[#008559] to-[#009b68] hover:brightness-110 active:scale-[0.98] text-lg font-extrabold text-[#fef08a] border border-[#fef08a]/45 shadow-[0_14px_34px_-8px_rgba(16,185,129,0.55),inset_0_1px_0_rgba(255,255,255,0.3)] inline-flex items-center justify-center gap-3 transition-all duration-300 cursor-pointer"
          >
            <span>{tr('ابدأ', 'Start')}</span>
            {isEn ? (
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            ) : (
              <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
            )}
          </button>

          <p className="text-[11px] text-emerald-300/75 font-medium">
            {tr('مع تحيات أبو تراب · اضغط «ابدأ» للدخول إلى المنصة', 'By Abu Turab · Press "Start" to enter the platform')}
          </p>
        </div>
      </div>

      <div className="h-2 shrink-0" aria-hidden="true" />
    </div>
  );
}
