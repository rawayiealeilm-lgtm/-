import {Shield} from 'lucide-react';

export function SiteFooter({onAdminTrigger}: {onAdminTrigger?: () => void}) {
  return (
    <footer className="mt-8 border-t border-slate-200/80 dark:border-white/10 bg-[#f8faf9] dark:bg-[#081712] text-[#28352e] dark:text-slate-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-3 text-center">
        <p className="text-xs sm:text-sm leading-relaxed text-[#3e4a42] dark:text-slate-300 max-w-3xl mx-auto">
          تنويه علمي: المحتوى المُولّد عبر المساعد الذكي هو أداة تقنية مساعدة لتقريب الفوائد وتيسير البحث؛ نرجو دائماً الرجوع إلى الكتب والمصادر العلمية الأصلية الموثوقة قبل الاعتماد والنقل.
        </p>
        <div className="h-px max-w-md mx-auto bg-slate-200/80 dark:bg-white/10" />
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs sm:text-[13px] font-bold text-[#006a46] dark:text-[#6cdba6]">
            جميع الحقوق محفوظة © 2027 — موقع مواعظ وعبر (نفحات إيمانية وحكم خالدة)
          </p>
          {onAdminTrigger && (
            <button
              type="button"
              onClick={onAdminTrigger}
              aria-label="بوابة الإدارة"
              className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[#006a46]/55 hover:text-[#006a46] dark:text-[#6cdba6]/55 dark:hover:text-[#6cdba6] hover:bg-emerald-500/10 transition-colors shrink-0"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
