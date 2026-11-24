import {Clock, PlusCircle, Sparkles} from 'lucide-react';
import {useI18n} from '../utils/i18n';

export function ComingSoonState({
  title,
  description,
  badgeText,
  encouragementText,
  signature,
  isAdmin = false,
  onAdminQuickAdd,
  adminAddLabel,
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  badgeText?: string;
  encouragementText?: string;
  signature?: string;
  isAdmin?: boolean;
  onAdminQuickAdd?: () => void;
  adminAddLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const {tr} = useI18n();

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#fffdf8] via-white to-[#f2faf6] dark:from-[#0f221b] dark:via-[#0c211a] dark:to-[#12261e] border border-amber-500/30 dark:border-amber-400/20 p-7 sm:p-10 text-center space-y-4 shadow-xs">
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-100/95 dark:bg-amber-900/45 text-amber-900 dark:text-amber-200 text-xs font-extrabold border border-amber-500/30">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>{badgeText || tr('قريباً بإذن الله', 'Coming Soon InshaAllah')}</span>
      </div>

      <div className="space-y-2 max-w-2xl mx-auto">
        <h3 className="text-base sm:text-lg font-extrabold text-[#0e1d25] dark:text-white">
          {title || tr('المحتوى قيد الإعداد والمراجعة العلمية — قريباً بإذن الله', 'Content Under Preparation — Coming Soon')}
        </h3>
        <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
          {description ||
            tr(
              'نعمل حالياً على تجهيز وتنقيح المواد الموثقة في هذا الباب لتظهر هنا قريباً جداً بتنظيم يليق بطلاب العلم والقرّاء الكرام.',
              'We are carefully preparing verified content for this section to launch very soon.',
            )}
        </p>
        {encouragementText && (
          <p className="text-xs font-semibold text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center gap-1.5 pt-1">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{encouragementText}</span>
          </p>
        )}
        {signature && (
          <p className="text-xs sm:text-sm font-extrabold text-amber-800 dark:text-amber-300 pt-2">
            {signature}
          </p>
        )}
      </div>

      {(actionLabel && onAction) || (isAdmin && onAdminQuickAdd) ? (
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#e8f6ff] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-xs font-bold hover:brightness-95 transition-colors"
            >
              {actionLabel}
            </button>
          )}
          {isAdmin && onAdminQuickAdd && (
            <button
              type="button"
              onClick={onAdminQuickAdd}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>{adminAddLabel || tr('إضافة مادة الآن (للمشرف)', 'Add Content Now (Admin)')}</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
