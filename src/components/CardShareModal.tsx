import html2canvas from 'html2canvas';
import {Copy, Download, MessageCircle, Share2, X} from 'lucide-react';
import {useMemo, useRef, useState} from 'react';
import type {Post} from '../types';
import {useI18n} from '../utils/i18n';
import {getItemDownloadCount, useLiveStats} from '../utils/liveStats';

const LINE_COLORS: Array<'#111827' | '#1E3A8A' | '#991B1B' | '#065F46' | '#B45309'> = [
  '#1E3A8A',
  '#111827',
  '#991B1B',
  '#065F46',
  '#B45309',
];

function splitIntoClassicLines(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 4) return [words.join(' ')];
  const lines: string[] = [];
  const perLine = words.length <= 9 ? 3 : 4;
  for (let i = 0; i < words.length; i += perLine) {
    lines.push(words.slice(i, i + perLine).join(' '));
  }
  return lines.slice(0, 5);
}

export function CardShareModal({
  post,
  onClose,
  onNotify,
}: {
  post: Post | null;
  brandHandle?: string;
  onClose: () => void;
  onNotify: (msg: string) => void;
}) {
  const {tr, formatNumber} = useI18n();
  const {stats, recordDownload} = useLiveStats();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);

  const lines = useMemo(() => {
    if (!post) return [];
    const mainQuote = post.title.length > 22 ? post.title : post.excerpt || post.title;
    return splitIntoClassicLines(mainQuote);
  }, [post]);

  if (!post) return null;

  const dlCount = getItemDownloadCount(stats, `post_${post.id}`, 14);
  const fullPlainText = `${post.author}\n\n${post.title}\n${post.excerpt}\n\n[${post.sourceLabel || post.category}]\nموقع مواعظ وعبر — جميع الحقوق محفوظة © 2027`;

  const handleDownload = async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#F8F9FA',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `mawaedh-${post.id}.png`;
      a.click();
      recordDownload(`post_${post.id}`);
      onNotify(tr('تم حفظ البطاقة الدعوية بصيغة PNG بنجاح', 'Wisdom card saved as PNG'));
    } catch {
      onNotify(tr('تعذر تصدير الصورة حالياً', 'Unable to export PNG'));
    } finally {
      setBusy(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(fullPlainText);
      onNotify(tr('تم نسخ نص البطاقة للمشاركة', 'Card text copied for sharing'));
    } catch {
      onNotify(tr('تعذر النسخ التلقائي', 'Unable to copy automatically'));
    }
  };

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(fullPlainText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleXShare = () => {
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(fullPlainText)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 pt-[40px] pb-[40px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c211a] text-[#0e1d25] dark:text-[#e3f3fe] p-5 shadow-2xl space-y-4 max-h-[calc(100dvh-96px)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{tr('البطاقة الدعوية للمشاركة', 'Classic Dawah Share Card')}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr('إغلاق', 'Close')}
            className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Classic Clean White Square Card */}
        <div
          ref={cardRef}
          dir="rtl"
          style={{
            backgroundColor: '#F8F9FA',
            fontFamily: '"Cairo", "Tajawal", "Amiri", sans-serif',
          }}
          className="aspect-square w-full rounded-2xl border border-slate-200 p-6 flex flex-col justify-between text-center"
        >
          <p style={{color: '#111827'}} className="text-base sm:text-lg font-extrabold">
            {post.author}
          </p>

          <div className="my-auto py-2 space-y-1.5 flex flex-col items-center justify-center">
            {lines.map((ln, idx) => (
              <p
                key={`${post.id}_ln_${idx}`}
                style={{color: LINE_COLORS[idx % LINE_COLORS.length]}}
                className="text-xl sm:text-2xl font-extrabold leading-[1.38]"
              >
                {ln}
              </p>
            ))}
          </div>

          <div className="flex items-end justify-between gap-2 pt-2 border-t border-slate-200/70">
            <span style={{color: '#111827'}} className="text-xs font-bold text-right">
              {post.sourceLabel || post.category}
            </span>
            <span style={{color: '#4B5563'}} className="text-[10px] font-semibold text-left">
              موقع مواعظ وعبر — جميع الحقوق محفوظة © 2027
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={handleDownload}
            className="min-h-[42px] px-3 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تحميل كصورة (PNG)</span>
          </button>
          <button
            type="button"
            onClick={handleCopyText}
            className="min-h-[42px] px-3 py-2 rounded-xl bg-[#f3f6f4] dark:bg-white/10 text-[#0e1d25] dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>نسخ النص</span>
          </button>
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="min-h-[42px] px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>مشاركة واتساب</span>
          </button>
          <button
            type="button"
            onClick={handleXShare}
            className="min-h-[42px] px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-900 dark:text-sky-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>مشاركة على منصة X</span>
          </button>
        </div>

        <p className="text-center text-xs text-[#6e7a71] dark:text-slate-400 tabular-nums">
          عدد تحميلات هذه البطاقة: {formatNumber(dlCount)}
        </p>
      </div>
    </div>
  );
}
