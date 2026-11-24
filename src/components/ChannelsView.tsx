import {CheckCircle2, Copy, ExternalLink, MessageCircle, Settings, ShieldAlert} from 'lucide-react';
import {WHATSAPP_GROUP_RULES} from '../data/seed';
import type {SiteConfig, SocialLink} from '../types';
import {useI18n} from '../utils/i18n';
import {COLOR_SCHEME_STYLES, resolveIcon} from './BrandEmblem';

export function ChannelsView({
  socialLinks,
  siteConfig,
  onOpenAdminLinks,
  onNotify,
}: {
  socialLinks: SocialLink[];
  siteConfig: SiteConfig;
  onOpenAdminLinks?: () => void;
  onNotify: (msg: string) => void;
}) {
  const {isEn, tr, formatNumber} = useI18n();
  const activeLinks = socialLinks.filter((l) => l.enabled);

  const copyHandle = async (handle: string) => {
    try {
      await navigator.clipboard.writeText(handle);
      onNotify(tr(`تم نسخ المعرّف ${handle}`, `Copied handle ${handle}`));
    } catch {
      onNotify(tr(`المعرّف: ${handle}`, `Handle: ${handle}`));
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-2xl bg-gradient-to-br from-[#006a46] via-[#008559] to-[#006389] p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#ffdea8]">
            {tr('الشبكة الرقمية الموثقة', 'Verified Digital Network')}
          </span>
          <h1 className="text-2xl font-bold mt-1">
            {isEn ? 'Official Channels & Scholarly Portals' : siteConfig.channelsTitle}
          </h1>
          <p className="text-sm text-white/90 mt-1.5 max-w-2xl leading-relaxed">
            {isEn
              ? 'Follow verified Mawaedh & Ibar accounts across X, Telegram, YouTube, WhatsApp, plus sh-yahia.net and alilmia.com.'
              : siteConfig.channelsSubtitle}
          </p>
        </div>

        {onOpenAdminLinks && (
          <button
            type="button"
            onClick={onOpenAdminLinks}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Settings className="w-4 h-4" />
            <span>{tr('تعديل الروابط والأيقونات', 'Edit Links & Icons')}</span>
          </button>
        )}
      </section>

      {/* WhatsApp Group Rules & Direct Join */}
      <section className="rounded-2xl bg-[#fffbf2] dark:bg-[#14221c] border border-[#f2be5e]/45 dark:border-[#f2be5e]/20 p-5 sm:p-6 card-3d space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#006a46] text-white flex items-center justify-center shrink-0 icon-3d">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0e1d25] dark:text-white">
                {tr('شروط مجموعات الواتساب الرسمية (مواعظ وعبر)', 'Official WhatsApp Groups Guidelines')}
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                {tr(
                  'نرجو الالتزام بهذه الضوابط قبل الانضمام حفاظاً على نقاء المجموعة ومنهجها',
                  'Please observe these principles to preserve group purity and focus',
                )}
              </p>
            </div>
          </div>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {WHATSAPP_GROUP_RULES.map((rule, idx) => (
            <li
              key={idx}
              className="rounded-xl bg-white dark:bg-[#0c1b15] border border-slate-200/70 dark:border-white/10 p-3.5 text-xs sm:text-sm text-[#3e4a42] dark:text-slate-200 leading-relaxed flex items-start gap-2.5"
            >
              <span className="w-6 h-6 rounded-full bg-[#ffdad6] dark:bg-rose-950/60 text-[#93000a] dark:text-rose-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                {formatNumber(idx + 1)}
              </span>
              <div className="space-y-1">
                <span dir="rtl">{rule.text}</span>
                {rule.allowed && (
                  <span dir="rtl" className="block text-xs font-semibold text-[#006a46] dark:text-[#6cdba6]">
                    ✓ {rule.allowed}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href="https://chat.whatsapp.com/Cf4JLeFGA5x8Om04SUkosv"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{tr('انضمام لمجموعة واتساب (١)', 'Join WhatsApp Group (1)')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://chat.whatsapp.com/BuqxhKKGH2zCKOwg8LXMzg"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#008559] hover:bg-[#006a46] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{tr('انضمام لمجموعة واتساب (٢)', 'Join WhatsApp Group (2)')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {activeLinks.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200 dark:border-white/10 p-10 text-center space-y-3">
          <p className="text-base font-bold text-[#0e1d25] dark:text-white">
            {tr('لا توجد قنوات مفعّلة حالياً', 'No active channels configured')}
          </p>
          {onOpenAdminLinks && (
            <button
              type="button"
              onClick={onOpenAdminLinks}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#006a46] text-white text-sm font-semibold"
            >
              {tr('إضافة روابط التواصل', 'Add Social Links')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeLinks.map((ch) => {
            const Icon = resolveIcon(ch.iconId, 'globe');
            const colorStyle = COLOR_SCHEME_STYLES[ch.colorScheme] || COLOR_SCHEME_STYLES.emerald;
            return (
              <article
                key={ch.id}
                className="rounded-2xl bg-white dark:bg-[#0d211a] border border-slate-200/80 dark:border-white/10 p-5 card-3d flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 icon-3d ${colorStyle.badgeClass}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-bold text-[#0e1d25] dark:text-white truncate">{ch.name}</h2>
                      <CheckCircle2 className="w-4 h-4 text-[#006a46] dark:text-[#6cdba6] shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#6e7a71] dark:text-slate-400 mt-1 flex-wrap">
                      {ch.handle && (
                        <span dir="ltr" className="font-medium text-[#006389] dark:text-[#80cfff]">
                          {ch.handle}
                        </span>
                      )}
                      {ch.handle && ch.followers && <span aria-hidden="true">·</span>}
                      {ch.followers && <span className="tabular-nums">{ch.followers}</span>}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[#3e4a42] dark:text-slate-300 leading-relaxed">{ch.description}</p>

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={ch.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!ch.url) {
                        e.preventDefault();
                        onNotify(tr('لم يتم تعيين رابط لهذه القناة بعد', 'URL not yet configured'));
                      }
                    }}
                    className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-[#006a46] hover:bg-[#005235] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>{tr('زيارة القناة', 'Open Channel')}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {ch.handle && (
                    <button
                      type="button"
                      onClick={() => void copyHandle(ch.handle)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#e8f6ff] dark:bg-white/10 text-[#0e1d25] dark:text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-[#d5e5f0] dark:hover:bg-white/15 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{tr('نسخ', 'Copy')}</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
