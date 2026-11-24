import type {IndexedPdfBookMeta} from '../types';

const DB_NAME = 'mawaedh_pdf_library_db';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';

export interface StoredIndexedPdfRecord extends IndexedPdfBookMeta {
  blob: Blob;
}

function openPdfDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {keyPath: 'id'});
        store.createIndex('section', 'section', {unique: false});
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open PDF IndexedDB'));
  });
}

export async function addPdfBooksToIndexedDb(
  section: IndexedPdfBookMeta['section'],
  files: FileList | File[],
  customAuthor?: string,
): Promise<IndexedPdfBookMeta[]> {
  const db = await openPdfDatabase();
  const fileArr = Array.from(files);
  const created: IndexedPdfBookMeta[] = [];

  for (const file of fileArr) {
    const cleanTitle = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() || 'كتاب علمي';
    const record: StoredIndexedPdfRecord = {
      id: `idb_pdf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      section,
      title: cleanTitle,
      author:
        customAuthor?.trim() ||
        (section === 'hajouri'
          ? 'الشيخ يحيى بن علي الحجوري حفظه الله'
          : section === 'imams'
            ? 'أئمة السنة والحديث'
            : 'مشايخ وطلاب دار الحديث'),
      fileName: file.name,
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
      blob: file,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });

    const {blob: _blob, ...meta} = record;
    created.push(meta);
  }

  db.close();
  return created;
}

export async function listPdfBooksFromIndexedDb(
  section?: IndexedPdfBookMeta['section'],
): Promise<IndexedPdfBookMeta[]> {
  try {
    const db = await openPdfDatabase();
    return await new Promise<IndexedPdfBookMeta[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = section ? store.index('section').getAll(section) : store.getAll();
      req.onsuccess = () => {
        const list = (req.result as StoredIndexedPdfRecord[]).map(({blob: _b, ...meta}) => meta);
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        db.close();
        resolve(list);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

export async function getPdfBlobFromIndexedDb(id: string): Promise<StoredIndexedPdfRecord | null> {
  try {
    const db = await openPdfDatabase();
    return await new Promise<StoredIndexedPdfRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as StoredIndexedPdfRecord) || null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return null;
  }
}

export async function deletePdfBookFromIndexedDb(id: string): Promise<void> {
  const db = await openPdfDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

export async function getAllPdfRecordsForSection(
  section: IndexedPdfBookMeta['section'],
): Promise<StoredIndexedPdfRecord[]> {
  try {
    const db = await openPdfDatabase();
    return await new Promise<StoredIndexedPdfRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).index('section').getAll(section);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as StoredIndexedPdfRecord[]) || []);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}
