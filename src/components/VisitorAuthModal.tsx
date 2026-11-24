import {LogOut, Mail, ShieldCheck, UserCheck, X} from 'lucide-react';
import {type FormEvent, useState} from 'react';
import type {VisitorProfile} from '../types';

export function VisitorAuthModal({
  open,
  visitor,
  onClose,
  onSignedIn,
  onSignOut,
  onNotify,
}: {
  open: boolean;
  visitor: VisitorProfile | null;
  onClose: () => void;
  onSignedIn: (profile: VisitorProfile) => void;
  onSignOut: () => void;
  onNotify: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const signInWithProvider = async (provider: 'google' | 'facebook' | 'email') => {
    if (busy) return;
    if (provider === 'email' && !name.trim() && !email.trim()) {
      onNotify('يرجى كتابة الاسم أو البريد الإلكتروني للدخول');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/visitor/auth', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          provider,
          name:
            name.trim() ||
            (provider === 'google'
              ? 'زائر عبر Google'
              : provider === 'facebook'
                ? 'زائر عبر Facebook'
                : 'زائر مسجّل'),
          email: email.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {profile?: VisitorProfile; error?: string};
      if (!res.ok || !data.profile) {
        onNotify(data.error || 'تعذر تسجيل الدخول حالياً');
        return;
      }
      onSignedIn(data.profile);
      onNotify(`أهلاً بك ${data.profile.name}! تم ربط مفضلتك وطلباتك بحسابك بنجاح`);
      onClose();
    } catch {
      onNotify('تعذر الاتصال بالخادم');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailForm = (e: FormEvent) => {
    e.preventDefault();
    void signInWithProvider('email');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c211a] border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#006a46] text-white flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#0e1d25] dark:text-white">
                دخول الزوار / حسابي
              </h2>
              <p className="text-xs text-[#6e7a71] dark:text-slate-400">
                دخول اختياري لحفظ أذكارك ومفضلتك وتذاكر طلباتك
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {visitor ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#f3f6f4] dark:bg-white/10 p-4 space-y-1">
              <p className="text-xs font-bold text-[#006a46] dark:text-[#6cdba6] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>الحساب متصل الآن ({visitor.provider})</span>
              </p>
              <p className="text-base font-extrabold text-[#0e1d25] dark:text-white">
                {visitor.name}
              </p>
              {visitor.email && (
                <p className="text-xs text-[#6e7a71] dark:text-slate-300">{visitor.email}</p>
              )}
              {visitor.whatsapp && (
                <p className="text-xs text-[#6e7a71] dark:text-slate-300">
                  رقم متابعة التحديثات: {visitor.whatsapp}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="w-full min-h-[44px] rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-200 font-bold text-sm flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل خروج الزائر</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => signInWithProvider('google')}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-50 font-bold text-xs sm:text-sm text-[#0e1d25] dark:text-white"
              >
                دخول عبر Google
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => signInWithProvider('facebook')}
                className="min-h-[44px] px-3 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#1465d0] text-white font-bold text-xs sm:text-sm"
              >
                دخول عبر Facebook
              </button>
            </div>

            <div className="relative flex items-center justify-center text-xs text-[#6e7a71] dark:text-slate-400">
              <span className="bg-white dark:bg-[#0c211a] px-2">أو الدخول بالاسم والبريد</span>
            </div>

            <form onSubmit={handleEmailForm} className="space-y-2.5">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الكريم"
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-[#f8faf9] dark:bg-[#081712] px-3.5 py-2.5 text-sm"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="البريد الإلكتروني (اختياري)"
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-[#f8faf9] dark:bg-[#081712] px-3.5 py-2.5 text-sm"
              />
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="رقم واتساب لاستلام إشعارات طلباتك فقط (اختياري)"
                className="w-full rounded-xl border border-slate-200 dark:border-white/15 bg-[#f8faf9] dark:bg-[#081712] px-3.5 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[44px] rounded-xl bg-[#006a46] hover:bg-[#005235] text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span>حفظ والدخول إلى حسابي</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
