import html2canvas from 'html2canvas';
import {Copy, Download, MessageCircle, Share2} from 'lucide-react';
import {useMemo, useRef, useState} from 'react';
import {CLASSIC_DAWAH_CARDS} from '../data/dawahCards';
import {useI18n} from '../utils/i18n';
import {getItemDownloadCount, useLiveStats} from '../utils/liveStats';

export function DawahCardsView({onNotify}: {onNotify: (msg: string) => void}) {
  const {formatNumber} = useI18n();
  const {stats, recordDownload} = useLiveStats();
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [busyCardId, setBusyCardId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const categories = useMemo(
    () => ['الكل', ...Array.from(new Set(CLASSIC_DAWAH_CARDS.map((c) => c.category)))],
    [],
  );

  const visibleCards = useMemo(() => {
    if (selectedCategory === 'الكل') return CLASSIC_DAWAH_CARDS;
    return CLASSIC_DAWAH_CARDS.filter((c) => c.category === selectedCategory);
  }, [selectedCategory]);

  const buildPlainText = (card: (typeof CLASSIC_DAWAH_CARDS)[number]) =>
    `${card.speakerLine}\n\n${card.lines.map((l) => l.text).join(' ')}\n\n[${card.source}]\nموقع مواعظ وعبر — جميع الحقوق محفوظة © 2027`;

  const handleDownloadPng = async (card: (typeof CLASSIC_DAWAH_CARDS)[number]) => {
    const el = cardRefs.current[card.id];
    if (!el || busyCardId) return;
    setBusyCardId(card.id);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#F8F9FA',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `mawaedh-${card.id}.png`;
      a.click();
      recordDownload(`card_${card.id}`);
      onNotify('تم حفظ البطاقة الدعوية بصيغة PNG عالية الجودة');
    } catch {
      onNotify('تعذر تصدير الصورة في هذا المتصفح، يرجى المحاولة مرة أخرى');
    } finally {
      setBusyCardId(null);
    }
  };

  const handleCopy = async (card: (typeof CLASSIC_DAWAH_CARDS)[number]) => {
    try {
      await navigator.clipboard.writeText(buildPlainText(card));
      onNotify('تم نسخ نص الأثر كاملاً بالتشكيل');
    } catch {
      onNotify('تعذر النسخ التلقائي');
    }
  };

  const handleWhatsAppShare = (card: (typeof CLASSIC_DAWAH_CARDS)[number]) => {
    const text = encodeURIComponent(buildPlainText(card));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleXShare = (card: (typeof CLASSIC_DAWAH_CARDS)[number]) => {
    const text = encodeURIComponent(buildPlainText(card));
    window.open(`https://x.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c211a] p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0e1d25] dark:text-white">
              البطاقات الدعوية بالتصميم الكلاسيكي الدقيق
            </h1>
            <p className="text-sm text-[#3e4a42] dark:text-slate-300 mt-1">
              بطاقات سلفية نقية بخلفية بيضاء صافية وخطوط عربية واضحة بالتشكيل الكامل جاهزة للتحميل والمشاركة
            </p>
          </div>
          <span className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6] tabular-nums">
            {formatNumber(CLASSIC_DAWAH_CARDS.length)} بطاقات دعوية جاهزة
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#006a46] text-white'
                  : 'bg-[#f3f6f4] dark:bg-white/10 text-[#0e1d25] dark:text-slate-200 hover:bg-[#e7efe9]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleCards.map((card) => {
          const dlCount = getItemDownloadCount(stats, `card_${card.id}`, 18);
          return (
            <div
              key={card.id}
              className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c211a] p-4 shadow-sm space-y-3"
            >
              {/* Pure #F8F9FA Classic Square Card */}
              <div
                ref={(el) => {
                  cardRefs.current[card.id] = el;
                }}
                dir="rtl"
                style={{
                  backgroundColor: '#F8F9FA',
                  fontFamily: '"Cairo", "Tajawal", "Amiri", sans-serif',
                }}
                className="aspect-square w-full rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between text-center select-text"
              >
                {/* Top: Speaker + Tarahhum/Taraddi */}
                <p
                  style={{color: '#111827'}}
                  className="text-base sm:text-xl font-extrabold tracking-normal"
                >
                  {card.speakerLine}
                </p>

                {/* Center: Large Bold Multi-Line Quote with Alternating Sober Colors */}
                <div className="my-auto py-3 space-y-1.5 sm:space-y-2.5 flex flex-col items-center justify-center">
                  {card.lines.map((line, i) => (
                    <p
                      key={`${card.id}_line_${i}`}
                      style={{color: line.color}}
                      className="text-2xl sm:text-[32px] font-extrabold leading-[1.35]"
                    >
                      {line.text}
                    </p>
                  ))}
                </div>

                {/* Bottom Corners: Source & No-Link Copyright */}
                <div className="flex items-end justify-between gap-3 pt-2 border-t border-slate-200/70">
                  <span
                    style={{color: '#111827'}}
                    className="text-xs sm:text-sm font-bold text-right"
                  >
                    {card.source}
                  </span>
                  <span
                    style={{color: '#4B5563'}}
                    className="text-[10px] sm:text-[11px] font-semibold text-left"
                  >
                    موقع مواعظ وعبر — جميع الحقوق محفوظة © 2027
                  </span>
                </div>
              </div>

              {/* Card Actions Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  disabled={busyCardId === card.id}
                  onClick={() => handleDownloadPng(card)}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>تحميل كصورة (PNG)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(card)}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-[#f3f6f4] dark:bg-white/10 hover:bg-[#e4ece7] text-[#0e1d25] dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>نسخ النص</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleWhatsAppShare(card)}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>مشاركة واتساب</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleXShare(card)}
                  className="min-h-[42px] px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 text-sky-900 dark:text-sky-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  <span>مشاركة على منصة X</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6e7a71] dark:text-slate-400 px-1 pt-0.5">
                <span>التصنيف: {card.category}</span>
                <span className="tabular-nums font-semibold">
                  مرات تحميل البطاقة: {formatNumber(dlCount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
