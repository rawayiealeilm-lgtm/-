import {
  Award,
  Bookmark,
  BookOpen,
  Compass,
  Globe,
  Hash,
  Headphones,
  Heart,
  HeartHandshake,
  Home,
  Info,
  MessageCircle,
  Mic,
  Moon,
  PlayCircle,
  Radio,
  Scale,
  Send,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Video,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import type {ColorScheme, EmblemVariant} from '../types';

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  home: Home,
  share2: Share2,
  playCircle: PlayCircle,
  bookmark: Bookmark,
  info: Info,
  heartHandshake: HeartHandshake,
  sparkles: Sparkles,
  heart: Heart,
  send: Send,
  hash: Hash,
  youtube: Youtube,
  messageCircle: MessageCircle,
  video: Video,
  headphones: Headphones,
  globe: Globe,
  radio: Radio,
  mic: Mic,
  bookOpen: BookOpen,
  compass: Compass,
  moon: Moon,
  sun: Sun,
  star: Star,
  award: Award,
  shield: Shield,
  shieldCheck: ShieldCheck,
  scale: Scale,
};

export const ICON_OPTIONS: Array<{id: string; label: string}> = [
  {id: 'home', label: 'الرئيسية'},
  {id: 'share2', label: 'مشاركة'},
  {id: 'playCircle', label: 'تشغيل'},
  {id: 'bookmark', label: 'حفظ'},
  {id: 'info', label: 'تعريف'},
  {id: 'heartHandshake', label: 'تعاون'},
  {id: 'sparkles', label: 'نفحات'},
  {id: 'heart', label: 'قلب'},
  {id: 'send', label: 'تيليجرام'},
  {id: 'hash', label: 'منصة X'},
  {id: 'youtube', label: 'يوتيوب'},
  {id: 'messageCircle', label: 'واتساب'},
  {id: 'video', label: 'مرئيات'},
  {id: 'headphones', label: 'صوتيات'},
  {id: 'globe', label: 'موقع ويب'},
  {id: 'radio', label: 'إذاعة'},
  {id: 'mic', label: 'خطابة'},
  {id: 'bookOpen', label: 'مصحف/كتاب'},
  {id: 'compass', label: 'قبلة/بوصلة'},
  {id: 'moon', label: 'هلال'},
  {id: 'sun', label: 'إشراقة'},
  {id: 'star', label: 'نجمة'},
  {id: 'award', label: 'وسام'},
  {id: 'shield', label: 'حصانة'},
  {id: 'shieldCheck', label: 'الأذكار والأدعية الجامعة'},
  {id: 'scale', label: 'ميزان الفتوى'},
];

export const EMBLEM_OPTIONS: Array<{id: EmblemVariant; label: string}> = [
  {id: 'pinwheel', label: 'الزخرفة الدوارة (٢٠١٥)'},
  {id: 'crescent', label: 'الهلال الذهبي'},
  {id: 'dome', label: 'المحراب والقبة'},
  {id: 'star', label: 'النجمة الثمانية'},
  {id: 'book', label: 'المصحف والموعظة'},
];

export const COLOR_SCHEME_STYLES: Record<ColorScheme, {label: string; badgeClass: string}> = {
  sky: {
    label: 'سماوي',
    badgeClass: 'bg-[#c5e7ff] text-[#004c6b] dark:bg-sky-950/60 dark:text-sky-300',
  },
  slate: {
    label: 'داكن رسمي',
    badgeClass: 'bg-[#d5e5f0] text-[#0e1d25] dark:bg-slate-800 dark:text-slate-200',
  },
  rose: {
    label: 'قرمزي',
    badgeClass: 'bg-[#ffdad6] text-[#93000a] dark:bg-rose-950/60 dark:text-rose-300',
  },
  emerald: {
    label: 'زمردي',
    badgeClass: 'bg-[#89f8c1] text-[#002113] dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  amber: {
    label: 'ذهبي',
    badgeClass: 'bg-[#ffdea8] text-[#5e4200] dark:bg-amber-950/60 dark:text-amber-300',
  },
  cyan: {
    label: 'فيروزي',
    badgeClass: 'bg-[#e0f0fb] text-[#006389] dark:bg-cyan-950/60 dark:text-cyan-300',
  },
};

export function resolveIcon(iconId?: string, fallback = 'sparkles'): LucideIcon {
  if (iconId && iconId in ICON_REGISTRY) {
    return ICON_REGISTRY[iconId];
  }
  return ICON_REGISTRY[fallback] || Sparkles;
}

export function BrandEmblem({
  className = 'w-7 h-7',
  variant = 'pinwheel',
}: {
  className?: string;
  variant?: EmblemVariant;
}) {
  if (variant === 'crescent') {
    return (
      <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="ml_cr_bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#008559" />
            <stop offset="100%" stopColor="#004c6b" />
          </linearGradient>
          <linearGradient id="ml_cr_gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="56" fill="url(#ml_cr_bg)" stroke="url(#ml_cr_gold)" strokeWidth="4" />
        <path d="M 48 28 A 30 30 0 1 0 88 76 A 23 23 0 1 1 48 28 Z" fill="url(#ml_cr_gold)" />
        <path d="M 78 36 L 81 44 L 89 47 L 81 50 L 78 58 L 75 50 L 67 47 L 75 44 Z" fill="#fef08a" />
      </svg>
    );
  }

  if (variant === 'dome') {
    return (
      <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="ml_dm_bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#006a46" />
            <stop offset="100%" stopColor="#042017" />
          </linearGradient>
          <linearGradient id="ml_dm_gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#ml_dm_bg)" stroke="url(#ml_dm_gold)" strokeWidth="3.5" />
        <path d="M 32 94 L 32 62 Q 32 34 60 24 Q 88 34 88 62 L 88 94 Z" fill="none" stroke="url(#ml_dm_gold)" strokeWidth="5" />
        <circle cx="60" cy="58" r="10" fill="#34d399" />
        <path d="M 60 15 L 60 24" stroke="#fef08a" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'star') {
    return (
      <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="ml_st_bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#006a46" />
            <stop offset="100%" stopColor="#006389" />
          </linearGradient>
          <linearGradient id="ml_st_gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="56" fill="url(#ml_st_bg)" />
        <rect x="26" y="26" width="68" height="68" rx="6" fill="none" stroke="url(#ml_st_gold)" strokeWidth="5" />
        <rect x="26" y="26" width="68" height="68" rx="6" transform="rotate(45 60 60)" fill="none" stroke="#6ee7b7" strokeWidth="4.5" />
        <circle cx="60" cy="60" r="14" fill="url(#ml_st_gold)" />
      </svg>
    );
  }

  if (variant === 'book') {
    return (
      <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="ml_bk_bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#006a46" />
            <stop offset="100%" stopColor="#003824" />
          </linearGradient>
          <linearGradient id="ml_bk_gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="108" height="108" rx="28" fill="url(#ml_bk_bg)" stroke="url(#ml_bk_gold)" strokeWidth="3.5" />
        <path
          d="M 24 42 Q 42 32 60 44 Q 78 32 96 42 L 96 86 Q 78 76 60 88 Q 42 76 24 86 Z"
          fill="#fef08a"
          fillOpacity="0.18"
          stroke="url(#ml_bk_gold)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <line x1="60" y1="44" x2="60" y2="88" stroke="url(#ml_bk_gold)" strokeWidth="3.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="ml_emerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#006a46" />
        </linearGradient>
        <linearGradient id="ml_cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#006389" />
        </linearGradient>
        <linearGradient id="ml_gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="ml_rose" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fecdd3" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="#041a14" stroke="url(#ml_gold)" strokeWidth="3" />
      <g transform="translate(60, 60) scale(0.9)">
        <path d="M 0 0 C 16 -18, 25 -42, 0 -52 C -25 -42, -16 -18, 0 0 Z" fill="url(#ml_emerald)" />
        <path d="M 0 0 C 20 -4, 38 -15, 40 -40 C 15 -38, 4 -20, 0 0 Z" fill="url(#ml_gold)" opacity="0.95" />
        <path d="M 0 0 C 18 16, 42 25, 52 0 C 42 -25, 18 -16, 0 0 Z" fill="url(#ml_cyan)" />
        <path d="M 0 0 C 4 20, 15 38, 40 40 C 38 15, 20 4, 0 0 Z" fill="url(#ml_emerald)" opacity="0.92" />
        <path d="M 0 0 C -16 18, -25 42, 0 52 C 25 42, 16 18, 0 0 Z" fill="url(#ml_gold)" />
        <path d="M 0 0 C -20 4, -38 15, -40 40 C -15 38, -4 20, 0 0 Z" fill="url(#ml_rose)" opacity="0.92" />
        <path d="M 0 0 C -18 -16, -42 -25, -52 0 C -42 25, -18 16, 0 0 Z" fill="url(#ml_cyan)" />
        <path d="M 0 0 C -4 -20, -15 -38, -40 -40 C -38 -15, -20 -4, 0 0 Z" fill="url(#ml_emerald)" opacity="0.92" />
        <circle cx="0" cy="0" r="13" fill="#042017" stroke="url(#ml_gold)" strokeWidth="2.2" />
        <path d="M -4 -6 A 7 7 0 1 0 6 4 A 5 5 0 1 1 -4 -6 Z" fill="url(#ml_gold)" />
      </g>
    </svg>
  );
}
