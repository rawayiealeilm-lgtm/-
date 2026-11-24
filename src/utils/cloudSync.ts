import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../firebase';
import type {
  CustomAdhkarItem,
  CustomBookItem,
  DeafMuteVideoItem,
  FatwaItem,
  MotherOasisItem,
  PoetryAnecdoteItem,
  Post,
  SiteConfig,
  VisitorReviewItem,
} from '../types';

export const TRUSTED_ADMIN_EMAILS = ['rawayiealeilm@gmail.com', 'ax1ax70@gmail.com'];

export function isTrustedAdminUser(user: User | null): boolean {
  if (!user || !user.email || !user.emailVerified) return false;
  return TRUSTED_ADMIN_EMAILS.includes(user.email.toLowerCase());
}

export async function signInAdminWithGoogle(): Promise<User> {
  const res = await signInWithPopup(auth, googleProvider);
  if (!isTrustedAdminUser(res.user)) {
    await signOut(auth).catch(() => undefined);
    throw new Error('البريد الإلكتروني غير مخوّل لصلاحيات المشرف السحابي.');
  }
  return res.user;
}

export async function signOutFirebaseAdmin(): Promise<void> {
  await signOut(auth);
}

export function observeFirebaseAdminAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

function sanitizeDocId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110);
  if (cleaned.length >= 2) return cleaned;
  return `${fallbackPrefix}_${Date.now().toString(36)}`;
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function isoFromFirestore(val: unknown, fallback = new Date().toISOString()): string {
  if (typeof val === 'string' && val.trim()) return val;
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as {toDate: () => Date}).toDate === 'function') {
    try {
      return (val as {toDate: () => Date}).toDate().toISOString();
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export interface CloudCollectionsPayload {
  posts: Post[];
  fatawa: FatwaItem[];
  motherOasisItems: MotherOasisItem[];
  poetryItems: PoetryAnecdoteItem[];
  deafMuteVideos: DeafMuteVideoItem[];
  customAdhkar: CustomAdhkarItem[];
  customBooks: CustomBookItem[];
  visitorReviews: VisitorReviewItem[];
  siteSettingsPatch?: Partial<SiteConfig> & {maintenanceMode?: boolean};
}

function mapDocToPost(data: Record<string, unknown>, id: string): Post {
  return {
    id: String(data.id || id),
    title: String(data.title || ''),
    excerpt: String(data.excerpt || ''),
    body: String(data.body || ''),
    author: String(data.author || 'مواعظ وعبر'),
    sourceLabel: String(data.sourceLabel || 'سحابة مواعظ وعبر'),
    category: String(data.category || 'إيمانيات'),
    mediaType:
      data.mediaType === 'sada' || data.mediaType === 'video' || data.mediaType === 'audio'
        ? data.mediaType
        : 'quote',
    cardTheme:
      data.cardTheme === 'azure' || data.cardTheme === 'gold' || data.cardTheme === 'midnight'
        ? data.cardTheme
        : 'emerald',
    youtubeUrl: typeof data.youtubeUrl === 'string' ? data.youtubeUrl : undefined,
    publishedAtLabel: String(data.publishedAtLabel || 'تحديث سحابي'),
    likes: typeof data.likes === 'number' ? data.likes : 0,
    commentsCount: typeof data.commentsCount === 'number' ? data.commentsCount : 0,
    comments: [],
    hidden: Boolean(data.hidden),
    createdAt: isoFromFirestore(data.createdAt),
  };
}

function mapDocToFatwa(data: Record<string, unknown>, id: string): FatwaItem {
  const rawScholar = String(data.scholarId || 'hajouri');
  const scholarId: FatwaItem['scholarId'] =
    rawScholar === 'wadaei' ||
    rawScholar === 'binbaz' ||
    rawScholar === 'uthaymeen' ||
    rawScholar === 'albani'
      ? rawScholar
      : 'hajouri';
  return {
    id: String(data.id || id),
    scholarId,
    scholarName: String(data.scholarName || ''),
    category: String(data.category || 'العقيدة'),
    question: String(data.question || ''),
    answer: String(data.answer || ''),
    source: String(data.source || ''),
    featured: scholarId === 'hajouri',
    createdAt: isoFromFirestore(data.createdAt),
  };
}

function mapDocToMotherOasis(data: Record<string, unknown>, id: string): MotherOasisItem {
  const ch = String(data.chapter || 'books');
  const chapter: MotherOasisItem['chapter'] =
    ch === 'lectures' || ch === 'stories' ? ch : 'books';
  return {
    id: String(data.id || id),
    chapter,
    title: String(data.title || ''),
    body: String(data.body || ''),
    signature: String(data.signature || 'بقلم الداعية الفاضلة أمي / الفقيرة إلى الله: أم محمد إكرام عبده علي'),
    createdAt: isoFromFirestore(data.createdAt),
  };
}

function mapDocToPoetry(data: Record<string, unknown>, id: string): PoetryAnecdoteItem {
  return {
    id: String(data.id || id),
    kind: data.kind === 'anecdote' ? 'anecdote' : 'islamic_poetry',
    title: String(data.title || ''),
    author: String(data.author || ''),
    summary: String(data.summary || ''),
    body: String(data.body || ''),
    sourceUrl: typeof data.sourceUrl === 'string' ? data.sourceUrl : undefined,
    createdAt: isoFromFirestore(data.createdAt),
  };
}

function mapDocToDeafMuteVideo(data: Record<string, unknown>, id: string): DeafMuteVideoItem {
  return {
    id: String(data.id || id),
    title: String(data.title || ''),
    description: String(data.description || ''),
    benefitText: typeof data.benefitText === 'string' ? data.benefitText : undefined,
    youtubeUrl: typeof data.youtubeUrl === 'string' ? data.youtubeUrl : undefined,
    status: data.status === 'published' ? 'published' : 'upcoming',
    category: String(data.category || 'دروس عامة'),
    managerName: String(data.managerName || 'المهندس يونس عبدالكريم'),
    createdAt: isoFromFirestore(data.createdAt),
  };
}

function mapDocToCustomAdhkar(data: Record<string, unknown>, id: string): CustomAdhkarItem {
  return {
    id: String(data.id || id),
    chapterId: String(data.chapterId || 'ch1_morning_evening'),
    title: typeof data.title === 'string' ? data.title : undefined,
    text: String(data.text || ''),
    fadl: typeof data.fadl === 'string' ? data.fadl : undefined,
    targetCount: typeof data.targetCount === 'number' && data.targetCount >= 1 ? data.targetCount : 1,
    source: String(data.source || 'الأذكار والأدعية الجامعة'),
    createdAt: isoFromFirestore(data.createdAt),
  };
}

function mapDocToCustomBook(data: Record<string, unknown>, id: string): CustomBookItem {
  const sec = String(data.section || 'hajouri');
  const section: CustomBookItem['section'] =
    sec === 'imams' || sec === 'students' ? sec : 'hajouri';
  return {
    id: String(data.id || id),
    section,
    title: String(data.title || ''),
    author: String(data.author || ''),
    category: String(data.category || 'كتب علمية'),
    summary: typeof data.summary === 'string' ? data.summary : undefined,
    pdfUrl: String(data.pdfUrl || 'coming_soon'),
    pages: typeof data.pages === 'number' ? data.pages : undefined,
    sizeLabel: typeof data.sizeLabel === 'string' ? data.sizeLabel : undefined,
    createdAt: isoFromFirestore(data.createdAt),
  };
}

function mapDocToVisitorReview(data: Record<string, unknown>, id: string): VisitorReviewItem {
  return {
    id: String(data.id || id),
    name: String(data.name || ''),
    rating: typeof data.rating === 'number' ? data.rating : 5,
    comment: String(data.comment || ''),
    role: typeof data.role === 'string' ? data.role : 'زائر الموقع',
    hidden: Boolean(data.hidden),
    createdAt: isoFromFirestore(data.createdAt),
  };
}

export async function fetchAllCloudCollections(isFirebaseAdmin = false): Promise<CloudCollectionsPayload> {
  const postsQuery = isFirebaseAdmin
    ? query(collection(db, 'site_posts'))
    : query(collection(db, 'site_posts'), where('hidden', '==', false));

  const reviewsQuery = isFirebaseAdmin
    ? query(collection(db, 'visitor_reviews'))
    : query(collection(db, 'visitor_reviews'), where('hidden', '==', false));

  const fatawaQuery = query(
    collection(db, 'site_fatawa'),
    where('scholarId', 'in', ['hajouri', 'wadaei', 'binbaz', 'uthaymeen', 'albani']),
  );

  const oasisQuery = query(
    collection(db, 'mother_oasis_items'),
    where('chapter', 'in', ['books', 'lectures', 'stories']),
  );

  const poetryQuery = query(
    collection(db, 'poetry_items'),
    where('kind', 'in', ['islamic_poetry', 'anecdote']),
  );

  const deafMuteQuery = query(
    collection(db, 'deaf_mute_videos'),
    where('status', 'in', ['published', 'upcoming']),
  );

  const customAdhkarQuery = query(
    collection(db, 'custom_adhkar'),
    where('targetCount', '>=', 1),
  );

  const customBooksQuery = query(
    collection(db, 'library_books'),
    where('section', 'in', ['hajouri', 'imams', 'students']),
  );

  const [
    postsSnap,
    fatawaSnap,
    oasisSnap,
    poetrySnap,
    deafMuteSnap,
    adhkarSnap,
    booksSnap,
    reviewsSnap,
    settingsSnap,
  ] = await Promise.all([
    getDocs(postsQuery).catch(() => null),
    getDocs(fatawaQuery).catch(() => null),
    getDocs(oasisQuery).catch(() => null),
    getDocs(poetryQuery).catch(() => null),
    getDocs(deafMuteQuery).catch(() => null),
    getDocs(customAdhkarQuery).catch(() => null),
    getDocs(customBooksQuery).catch(() => null),
    getDocs(reviewsQuery).catch(() => null),
    getDoc(doc(db, 'site_settings', 'main')).catch(() => null),
  ]);

  const siteSettingsPatch: Partial<SiteConfig> & {maintenanceMode?: boolean} = {};
  if (settingsSnap?.exists()) {
    const s = settingsSnap.data();
    if (typeof s.appName === 'string' && s.appName) siteSettingsPatch.appName = s.appName;
    if (typeof s.appTagline === 'string') siteSettingsPatch.appTagline = s.appTagline;
    if (typeof s.heroWisdomText === 'string' && s.heroWisdomText) {
      siteSettingsPatch.heroWisdomText = s.heroWisdomText;
    }
    if (typeof s.heroWisdomAuthor === 'string' && s.heroWisdomAuthor) {
      siteSettingsPatch.heroWisdomAuthor = s.heroWisdomAuthor;
    }
    if (typeof s.motherPrayerText === 'string' && s.motherPrayerText) {
      siteSettingsPatch.motherPrayerText = s.motherPrayerText;
    }
    if (typeof s.maintenanceMode === 'boolean') {
      siteSettingsPatch.maintenanceMode = s.maintenanceMode;
    }
  }

  return {
    posts: postsSnap ? postsSnap.docs.map((d) => mapDocToPost(d.data(), d.id)) : [],
    fatawa: fatawaSnap ? fatawaSnap.docs.map((d) => mapDocToFatwa(d.data(), d.id)) : [],
    motherOasisItems: oasisSnap ? oasisSnap.docs.map((d) => mapDocToMotherOasis(d.data(), d.id)) : [],
    poetryItems: poetrySnap ? poetrySnap.docs.map((d) => mapDocToPoetry(d.data(), d.id)) : [],
    deafMuteVideos: deafMuteSnap
      ? deafMuteSnap.docs.map((d) => mapDocToDeafMuteVideo(d.data(), d.id))
      : [],
    customAdhkar: adhkarSnap
      ? adhkarSnap.docs.map((d) => mapDocToCustomAdhkar(d.data(), d.id))
      : [],
    customBooks: booksSnap ? booksSnap.docs.map((d) => mapDocToCustomBook(d.data(), d.id)) : [],
    visitorReviews: reviewsSnap
      ? reviewsSnap.docs.map((d) => mapDocToVisitorReview(d.data(), d.id))
      : [],
    siteSettingsPatch:
      Object.keys(siteSettingsPatch).length > 0 ? siteSettingsPatch : undefined,
  };
}

export function subscribeCloudCollections(
  isFirebaseAdmin: boolean,
  handlers: {
    onPosts?: (items: Post[]) => void;
    onFatawa?: (items: FatwaItem[]) => void;
    onMotherOasis?: (items: MotherOasisItem[]) => void;
    onDeafMuteVideos?: (items: DeafMuteVideoItem[]) => void;
    onCustomAdhkar?: (items: CustomAdhkarItem[]) => void;
    onCustomBooks?: (items: CustomBookItem[]) => void;
    onReviews?: (items: VisitorReviewItem[]) => void;
  },
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  if (handlers.onPosts) {
    const q = isFirebaseAdmin
      ? query(collection(db, 'site_posts'))
      : query(collection(db, 'site_posts'), where('hidden', '==', false));
    unsubs.push(
      onSnapshot(
        q,
        (snap) => handlers.onPosts?.(snap.docs.map((d) => mapDocToPost(d.data(), d.id))),
        () => undefined,
      ),
    );
  }

  if (handlers.onFatawa) {
    const q = query(
      collection(db, 'site_fatawa'),
      where('scholarId', 'in', ['hajouri', 'wadaei', 'binbaz', 'uthaymeen', 'albani']),
    );
    unsubs.push(
      onSnapshot(
        q,
        (snap) => handlers.onFatawa?.(snap.docs.map((d) => mapDocToFatwa(d.data(), d.id))),
        () => undefined,
      ),
    );
  }

  if (handlers.onMotherOasis) {
    const q = query(
      collection(db, 'mother_oasis_items'),
      where('chapter', 'in', ['books', 'lectures', 'stories']),
    );
    unsubs.push(
      onSnapshot(
        q,
        (snap) =>
          handlers.onMotherOasis?.(snap.docs.map((d) => mapDocToMotherOasis(d.data(), d.id))),
        () => undefined,
      ),
    );
  }

  if (handlers.onDeafMuteVideos) {
    const q = query(
      collection(db, 'deaf_mute_videos'),
      where('status', 'in', ['published', 'upcoming']),
    );
    unsubs.push(
      onSnapshot(
        q,
        (snap) =>
          handlers.onDeafMuteVideos?.(snap.docs.map((d) => mapDocToDeafMuteVideo(d.data(), d.id))),
        () => undefined,
      ),
    );
  }

  if (handlers.onCustomAdhkar) {
    const q = query(collection(db, 'custom_adhkar'), where('targetCount', '>=', 1));
    unsubs.push(
      onSnapshot(
        q,
        (snap) =>
          handlers.onCustomAdhkar?.(snap.docs.map((d) => mapDocToCustomAdhkar(d.data(), d.id))),
        () => undefined,
      ),
    );
  }

  if (handlers.onCustomBooks) {
    const q = query(
      collection(db, 'library_books'),
      where('section', 'in', ['hajouri', 'imams', 'students']),
    );
    unsubs.push(
      onSnapshot(
        q,
        (snap) =>
          handlers.onCustomBooks?.(snap.docs.map((d) => mapDocToCustomBook(d.data(), d.id))),
        () => undefined,
      ),
    );
  }

  if (handlers.onReviews) {
    const q = isFirebaseAdmin
      ? query(collection(db, 'visitor_reviews'))
      : query(collection(db, 'visitor_reviews'), where('hidden', '==', false));
    unsubs.push(
      onSnapshot(
        q,
        (snap) =>
          handlers.onReviews?.(snap.docs.map((d) => mapDocToVisitorReview(d.data(), d.id))),
        () => undefined,
      ),
    );
  }

  return () => {
    for (const u of unsubs) u();
  };
}

export async function cloudUpsertPost(post: Post): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(post.id, 'post');
  const ref = doc(db, 'site_posts', id);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(
        ref,
        omitUndefined({
          id,
          title: post.title.slice(0, 260),
          excerpt: post.excerpt.slice(0, 1200),
          body: post.body.slice(0, 30000),
          author: post.author.slice(0, 160),
          sourceLabel: (post.sourceLabel || 'مواعظ وعبر').slice(0, 160),
          category: post.category.slice(0, 100),
          mediaType: post.mediaType,
          cardTheme: post.cardTheme,
          youtubeUrl: post.youtubeUrl ? post.youtubeUrl.slice(0, 400) : undefined,
          publishedAtLabel: (post.publishedAtLabel || 'اليوم').slice(0, 80),
          likes: Math.max(0, Math.floor(post.likes || 0)),
          commentsCount: Math.max(0, Math.floor(post.commentsCount || 0)),
          hidden: Boolean(post.hidden),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
    } else {
      await updateDoc(
        ref,
        omitUndefined({
          title: post.title.slice(0, 260),
          excerpt: post.excerpt.slice(0, 1200),
          body: post.body.slice(0, 30000),
          author: post.author.slice(0, 160),
          sourceLabel: (post.sourceLabel || 'مواعظ وعبر').slice(0, 160),
          category: post.category.slice(0, 100),
          mediaType: post.mediaType,
          cardTheme: post.cardTheme,
          youtubeUrl: post.youtubeUrl ? post.youtubeUrl.slice(0, 400) : undefined,
          publishedAtLabel: (post.publishedAtLabel || 'اليوم').slice(0, 80),
          hidden: Boolean(post.hidden),
          updatedAt: serverTimestamp(),
        }),
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `site_posts/${id}`);
  }
}

export async function cloudDeletePost(rawId: string): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(rawId, 'post');
  try {
    await deleteDoc(doc(db, 'site_posts', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `site_posts/${id}`);
  }
}

export async function cloudUpsertFatwa(fatwa: FatwaItem): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(fatwa.id, 'fatwa');
  const ref = doc(db, 'site_fatawa', id);
  try {
    const snap = await getDoc(ref);
    const base = {
      scholarId: fatwa.scholarId,
      scholarName: fatwa.scholarName.slice(0, 160),
      category: fatwa.category.slice(0, 100),
      question: fatwa.question.slice(0, 3000),
      answer: fatwa.answer.slice(0, 25000),
      source: fatwa.source.slice(0, 240),
    };
    if (!snap.exists()) {
      await setDoc(ref, {id, ...base, createdAt: serverTimestamp(), updatedAt: serverTimestamp()});
    } else {
      await updateDoc(ref, {...base, updatedAt: serverTimestamp()});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `site_fatawa/${id}`);
  }
}

export async function cloudDeleteFatwa(rawId: string): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(rawId, 'fatwa');
  try {
    await deleteDoc(doc(db, 'site_fatawa', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `site_fatawa/${id}`);
  }
}

export async function cloudUpsertMotherOasis(item: MotherOasisItem): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(item.id, 'mo');
  const ref = doc(db, 'mother_oasis_items', id);
  try {
    const snap = await getDoc(ref);
    const base = {
      chapter: item.chapter,
      title: item.title.slice(0, 260),
      body: item.body.slice(0, 40000),
      signature: item.signature.slice(0, 220),
    };
    if (!snap.exists()) {
      await setDoc(ref, {id, ...base, createdAt: serverTimestamp(), updatedAt: serverTimestamp()});
    } else {
      await updateDoc(ref, {...base, updatedAt: serverTimestamp()});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `mother_oasis_items/${id}`);
  }
}

export async function cloudDeleteMotherOasis(rawId: string): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(rawId, 'mo');
  try {
    await deleteDoc(doc(db, 'mother_oasis_items', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `mother_oasis_items/${id}`);
  }
}

export async function cloudUpsertDeafMuteVideo(item: DeafMuteVideoItem): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(item.id, 'dm');
  const ref = doc(db, 'deaf_mute_videos', id);
  try {
    const snap = await getDoc(ref);
    const base = omitUndefined({
      title: item.title.slice(0, 240),
      description: item.description.slice(0, 3000),
      benefitText: item.benefitText ? item.benefitText.slice(0, 4000) : undefined,
      youtubeUrl: item.youtubeUrl ? item.youtubeUrl.slice(0, 500) : undefined,
      status: item.status,
      category: item.category.slice(0, 100),
      managerName: (item.managerName || 'المهندس يونس عبدالكريم').slice(0, 140),
    });
    if (!snap.exists()) {
      await setDoc(ref, {id, ...base, createdAt: serverTimestamp(), updatedAt: serverTimestamp()});
    } else {
      await updateDoc(ref, {...base, updatedAt: serverTimestamp()});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `deaf_mute_videos/${id}`);
  }
}

export async function cloudDeleteDeafMuteVideo(rawId: string): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(rawId, 'dm');
  try {
    await deleteDoc(doc(db, 'deaf_mute_videos', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `deaf_mute_videos/${id}`);
  }
}

export async function cloudUpsertCustomAdhkar(item: CustomAdhkarItem): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(item.id, 'dhikr');
  const ref = doc(db, 'custom_adhkar', id);
  try {
    const snap = await getDoc(ref);
    const base = omitUndefined({
      chapterId: item.chapterId.slice(0, 80),
      title: item.title ? item.title.slice(0, 200) : undefined,
      text: item.text.slice(0, 6000),
      fadl: item.fadl ? item.fadl.slice(0, 2000) : undefined,
      targetCount: Math.min(1000, Math.max(1, Math.floor(item.targetCount || 1))),
      source: item.source.slice(0, 240),
    });
    if (!snap.exists()) {
      await setDoc(ref, {id, ...base, createdAt: serverTimestamp(), updatedAt: serverTimestamp()});
    } else {
      await updateDoc(ref, {...base, updatedAt: serverTimestamp()});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `custom_adhkar/${id}`);
  }
}

export async function cloudDeleteCustomAdhkar(rawId: string): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(rawId, 'dhikr');
  try {
    await deleteDoc(doc(db, 'custom_adhkar', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `custom_adhkar/${id}`);
  }
}

export async function cloudUpsertCustomBook(book: CustomBookItem): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(book.id, 'book');
  const ref = doc(db, 'library_books', id);
  try {
    const snap = await getDoc(ref);
    const base = omitUndefined({
      section: book.section,
      title: book.title.slice(0, 260),
      author: book.author.slice(0, 180),
      category: book.category.slice(0, 100),
      summary: book.summary ? book.summary.slice(0, 2500) : undefined,
      pdfUrl: (book.pdfUrl || 'coming_soon').slice(0, 600),
      pages: typeof book.pages === 'number' ? Math.max(0, Math.min(10000, Math.floor(book.pages))) : undefined,
      sizeLabel: book.sizeLabel ? book.sizeLabel.slice(0, 60) : undefined,
    });
    if (!snap.exists()) {
      await setDoc(ref, {id, ...base, createdAt: serverTimestamp(), updatedAt: serverTimestamp()});
    } else {
      await updateDoc(ref, {...base, updatedAt: serverTimestamp()});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `library_books/${id}`);
  }
}

export async function cloudDeleteCustomBook(rawId: string): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(rawId, 'book');
  try {
    await deleteDoc(doc(db, 'library_books', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `library_books/${id}`);
  }
}

export async function cloudSaveSiteSettings(
  cfg: SiteConfig,
  brandHandle: string,
  maintenanceMode: boolean,
): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const ref = doc(db, 'site_settings', 'main');
  try {
    await setDoc(ref, {
      appName: cfg.appName.slice(0, 120),
      appTagline: cfg.appTagline.slice(0, 260),
      brandHandle: brandHandle.slice(0, 80),
      heroWisdomText: cfg.heroWisdomText.slice(0, 2000),
      heroWisdomAuthor: cfg.heroWisdomAuthor.slice(0, 160),
      motherPrayerText: cfg.motherPrayerText.slice(0, 2000),
      maintenanceMode: Boolean(maintenanceMode),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'site_settings/main');
  }
}

export async function cloudCreateVisitorReview(review: VisitorReviewItem): Promise<void> {
  const id = sanitizeDocId(review.id, 'rev');
  const ref = doc(db, 'visitor_reviews', id);
  try {
    await setDoc(
      ref,
      omitUndefined({
        id,
        name: review.name.slice(0, 120),
        rating: Math.min(5, Math.max(1, Math.floor(review.rating))),
        comment: review.comment.slice(0, 2000),
        role: review.role ? review.role.slice(0, 120) : undefined,
        hidden: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  } catch {
    // Fallback cleanly if offline/unauthenticated network fails
  }
}

export async function cloudUpdateReviewVisibility(rawId: string, hidden: boolean): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(rawId, 'rev');
  try {
    await updateDoc(doc(db, 'visitor_reviews', id), {
      hidden: Boolean(hidden),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `visitor_reviews/${id}`);
  }
}

export async function cloudDeleteReview(rawId: string): Promise<void> {
  if (!isTrustedAdminUser(auth.currentUser)) return;
  const id = sanitizeDocId(rawId, 'rev');
  try {
    await deleteDoc(doc(db, 'visitor_reviews', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `visitor_reviews/${id}`);
  }
}
