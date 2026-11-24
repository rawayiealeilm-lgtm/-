import {ArrowRight, BookOpen, Clock, HandHeart, Sparkles, Sun} from 'lucide-react';
import type {NavTab} from '../types';

export function DeafMuteView({
  onNavigate,
}: {
  onNavigate: (tab: NavTab) => void;
}) {
  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-amber-500/35 bg-gradient-to-br from-[#f2fbf7] via-[#fffdf7] to-[#eef7fb] dark:from-[#0c241c] dark:via-[#12261e] dark:to-[#0b1f27] p-6 sm:p-9 shadow-sm text-center">
        {/* Heavily blurred, face-obscured atmospheric backdrop behind all foreground copy */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src="/assets/deaf-mute-bg.jpg"
            alt=""
            className="w-full h-full object-cover object-center blur-2xl scale-125 opacity-25 dark:opacity-20 saturate-75 select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-white/85 dark:from-[#071812]/80 dark:via-[#071812]/72 dark:to-[#071812]/88 backdrop-blur-md" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#006a46] text-[#ffdea8] flex items-center justify-center mx-auto shadow-md">
            <HandHeart className="w-8 h-8" />
          </div>

          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-100/95 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-extrabold border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" />
              <span>قريباً بإذن الله..</span>
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0e1d25] dark:text-white leading-snug">
              واحة الصم والبكم
            </h1>

            <p className="text-sm sm:text-base font-bold text-[#006a46] dark:text-[#6cdba6] flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>بإدارة المهندس يونس عبدالكريم</span>
            </p>

            <p className="text-sm sm:text-base text-[#222f28] dark:text-slate-200 font-medium leading-[1.85]">
              قريباً بإذن الله.. يجري الإعداد والتجهيز لإطلاق القسم الخاص بإخواننا وأخواتنا من فئة الصم والبكم؛ لتقريب معاني القرآن الكريم، والأذكار والأدعية الجامعة، والدروس الشرعية المبسطة بلغة الإشارة والوسائل البصرية الميسرة على منهج أهل السنة والجماعة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-start max-w-4xl mx-auto">
            <div className="rounded-2xl bg-white/90 dark:bg-[#081712]/90 border border-slate-200/80 dark:border-white/10 p-4 space-y-1.5 shadow-xs">
              <h2 className="text-sm font-extrabold text-[#006a46] dark:text-[#6cdba6]">
                ١. خطب ودروس بلغة الإشارة
              </h2>
              <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                تجهيز مواد مرئية مصورة ومترجمة بلغة الإشارة لخطب الجمعة والرقائق الإيمانية وأصول العقيدة.
              </p>
            </div>
            <div className="rounded-2xl bg-white/90 dark:bg-[#081712]/90 border border-slate-200/80 dark:border-white/10 p-4 space-y-1.5 shadow-xs">
              <h2 className="text-sm font-extrabold text-[#006a46] dark:text-[#6cdba6]">
                ٢. الأذكار والأدعية الميسّرة
              </h2>
              <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                شروحات بصرية وإشارية واضحة لأذكار الصباح والمساء والطهارة والصلاة بخط واضح ومريح.
              </p>
            </div>
            <div className="rounded-2xl bg-white/90 dark:bg-[#081712]/90 border border-slate-200/80 dark:border-white/10 p-4 space-y-1.5 shadow-xs">
              <h2 className="text-sm font-extrabold text-[#006a46] dark:text-[#6cdba6]">
                ٣. بإدارة م. يونس عبدالكريم
              </h2>
              <p className="text-xs sm:text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">
                إشراف فني وعلمي متكامل لضمان دقة الترجمة الإشارية ووضوح العرض لخدمة هذه الفئة الغالية.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#006a46] hover:bg-[#005235] text-white text-sm font-bold flex items-center gap-2 transition-colors shadow-xs"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة إلى الرئيسية</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('adhkar')}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#e8f6ff] hover:bg-[#d5ecfb] dark:bg-[#133126] text-[#006a46] dark:text-[#6cdba6] text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Sun className="w-4 h-4" />
              <span>الأذكار والأدعية الجامعة</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('library')}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>المكتبة العلمية</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
