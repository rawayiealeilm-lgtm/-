import {Eye, EyeOff, MessageSquarePlus, ShieldCheck, Star, Trash2} from 'lucide-react';
import {type FormEvent, useMemo, useState} from 'react';
import type {VisitorReviewItem} from '../types';
import {useI18n} from '../utils/i18n';
import {resolveFontFamilyCss, resolveFontSizeSpec, useReadingPrefs} from '../utils/readingPrefs';

export function ReviewsView({
  reviews,
  isAdmin = false,
  authToken,
  onReviewsChange,
  onNotify,
}: {
  reviews: VisitorReviewItem[];
  isAdmin?: boolean;
  authToken?: string | null;
  onReviewsChange: (items: VisitorReviewItem[]) => void;
  onNotify: (msg: string) => void;
}) {
  const {formatNumber} = useI18n();
  const {prefs} = useReadingPrefs();
  const fontSpec = resolveFontSizeSpec(prefs.fontSize);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visibleReviews = useMemo(
    () => (isAdmin ? reviews : reviews.filter((r) => !r.hidden)),
    [isAdmin, reviews],
  );

  const publicReviews = useMemo(() => reviews.filter((r) => !r.hidden), [reviews]);

  const avgRating = useMemo(() => {
    if (publicReviews.length === 0) return '5.0';
    return (publicReviews.reduce((sum, r) => sum + r.rating, 0) / publicReviews.length).toFixed(1);
  }, [publicReviews]);

  const starBreakdown = useMemo(() => {
    const total = publicReviews.length || 1;
    return [5, 4, 3, 2, 1].map((stars) => {
      const count = publicReviews.filter((r) => Math.round(r.rating) === stars).length;
      const pct = Math.round((count / total) * 100);
      return {stars, count, pct};
    });
  }, [publicReviews]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim() || submitting) {
      onNotify('يرجى كتابة الاسم ورأيك حول المنصة');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, role, rating, comment}),
      });
      const data = (await res.json()) as {reviews?: VisitorReviewItem[]; error?: string};
      if (!res.ok || !Array.isArray(data.reviews)) {
        onNotify(data.error || 'تعذر حفظ التقييم حالياً');
        return;
      }
      onReviewsChange(data.reviews);
      setName('');
      setRole('');
      setComment('');
      setRating(5);
      onNotify('شكراً لك! تم نشر تقييمك الكريم بنجاح');
    } catch {
      onNotify('تعذر الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVisibility = async (rev: VisitorReviewItem) => {
    if (!authToken || busyId) return;
    setBusyId(rev.id);
    try {
      const res = await fetch(`/api/admin/reviews/${encodeURIComponent(rev.id)}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({hidden: !rev.hidden}),
      });
      const data = (await res.json()) as {reviews?: VisitorReviewItem[]; error?: string};
      if (!res.ok || !Array.isArray(data.reviews)) {
        onNotify(data.error || 'تعذر تحديث حالة التقييم');
        return;
      }
      onReviewsChange(data.reviews);
      onNotify(rev.hidden ? 'تم إظهار التقييم للزوار' : 'تم إخفاء التقييم عن الزوار');
    } catch {
      onNotify('تعذر الاتصال بالخادم');
    } finally {
      setBusyId(null);
    }
  };

  const deleteReview = async (rev: VisitorReviewItem) => {
    if (!authToken || busyId) return;
    setBusyId(rev.id);
    try {
      const res = await fetch(`/api/admin/reviews/${encodeURIComponent(rev.id)}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${authToken}`},
      });
      const data = (await res.json()) as {reviews?: VisitorReviewItem[]; error?: string};
      if (!res.ok || !Array.isArray(data.reviews)) {
        onNotify(data.error || 'تعذر حذف التقييم');
        return;
      }
      onReviewsChange(data.reviews);
      onNotify('تم حذف التقييم نهائياً');
    } catch {
      onNotify('تعذر الاتصال بالخادم');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c211a] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0e1d25] dark:text-white">
              آراء وتقييمات الزوار الكرام
            </h1>
            <p className="text-sm text-[#3e4a42] dark:text-slate-300 mt-1">
              شهادات الزوار وتوصياتهم لتطوير منصة مواعظ وعبر ونشر الخير
            </p>
            {isAdmin && (
              <p className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6] mt-1.5 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>وضع المشرف مفعل: يمكنك إخفاء أو حذف أي تقييم من القائمة مباشرة</span>
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-[#f3f6f4] dark:bg-white/10 px-5 py-3 text-center">
            <p className="text-xs text-[#6e7a71] dark:text-slate-400">متوسط التقييم العام</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-300 tabular-nums">
              {avgRating} / 5
            </p>
            <p className="text-xs font-bold text-[#3e4a42] dark:text-slate-300 tabular-nums">
              {formatNumber(publicReviews.length)} تقييم منشور
            </p>
          </div>
        </div>

        {/* 5★ - 1★ Rating Distribution Breakdown Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
          {starBreakdown.map((row) => (
            <div
              key={row.stars}
              className="rounded-xl bg-[#f8faf9] dark:bg-[#081712] border border-slate-200/70 dark:border-white/10 px-3 py-2 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs font-bold tabular-nums">
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-300">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{formatNumber(row.stars)}</span>
                </span>
                <span className="text-[#3e4a42] dark:text-slate-300">
                  {formatNumber(row.pct)}% ({formatNumber(row.count)})
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{width: `${row.pct}%`}}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c211a] p-5 sm:p-6 space-y-4 h-fit"
        >
          <h2 className="text-base font-extrabold text-[#0e1d25] dark:text-white flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-[#006a46] dark:text-[#6cdba6]" />
            <span>أضف رأيك وتقييمك</span>
          </h2>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم أو الكنية"
            required
            className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-[#f8faf9] dark:bg-[#081712] px-3.5 py-2.5 text-sm"
          />

          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="الصفة (اختياري، مثل: طالب علم / زائر)"
            className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-[#f8faf9] dark:bg-[#081712] px-3.5 py-2.5 text-sm"
          />

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[#3e4a42] dark:text-slate-300 block">
              التقييم بالنجوم
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(num)}
                  className={`p-1.5 rounded-lg ${
                    num <= rating ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'
                  }`}
                >
                  <Star className={`w-6 h-6 ${num <= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="اكتب انطباعك حول الموقع وأقسامه..."
            required
            className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-[#f8faf9] dark:bg-[#081712] px-3.5 py-2.5 text-sm"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] rounded-xl bg-[#006a46] hover:bg-[#005235] disabled:opacity-60 text-white font-bold text-sm"
          >
            {submitting ? 'جاري النشر...' : 'إرسال التقييم'}
          </button>
        </form>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
          {visibleReviews.map((rev) => (
            <article
              key={rev.id}
              className={`rounded-3xl border p-5 space-y-3 transition-colors ${
                rev.hidden
                  ? 'border-rose-400/50 bg-rose-50/60 dark:bg-rose-950/20'
                  : 'border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c211a]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0e1d25] dark:text-white">{rev.name}</h3>
                  {rev.role && (
                    <p className="text-xs text-[#6e7a71] dark:text-slate-400">{rev.role}</p>
                  )}
                  {rev.hidden && isAdmin && (
                    <span className="inline-block mt-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                      مخفي عن الزوار
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                  {Array.from({length: rev.rating}).map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>

              <p
                style={{fontFamily: resolveFontFamilyCss(prefs.fontFamily)}}
                className={`${fontSpec.bodyClass} text-[#28352e] dark:text-slate-200`}
              >
                {rev.comment}
              </p>

              {isAdmin && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    disabled={busyId === rev.id}
                    onClick={() => void toggleVisibility(rev)}
                    className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold flex items-center gap-1.5 text-[#0e1d25] dark:text-white"
                  >
                    {rev.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{rev.hidden ? 'إظهار' : 'إخفاء'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === rev.id}
                    onClick={() => void deleteReview(rev)}
                    className="min-h-[34px] px-3 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 text-xs font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
