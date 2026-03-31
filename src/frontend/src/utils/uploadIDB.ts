export interface UploadSession {
  videoId: string;
  title: string;
  ownerId: string;
  ownerName?: string;
  uploadedBytes: number;
  lastChunkIndex: number;
  status: "uploading" | "processing" | "tombstone";
  createdAt: number;
  thumbnailDataUrl?: string;
  fileName?: string;
  fileSize?: number;
}

const DB_NAME = "upload-sessions";
const STORE_NAME = "sessions";
const FILES_STORE = "files";
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "videoId" });
      }
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE);
      }
      // Migrate: if upgrading from v1, the sessions store already exists
      void event;
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSession(session: UploadSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(session);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getSession(
  videoId: string,
): Promise<UploadSession | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(videoId);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as UploadSession) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function deleteSession(videoId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(videoId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getAllSessions(): Promise<UploadSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      const all = (req.result as UploadSession[]) ?? [];
      resolve(all.filter((s) => s.status !== "tombstone"));
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function tombstoneSession(videoId: string): Promise<void> {
  try {
    const existing = await getSession(videoId);
    if (existing) {
      await saveSession({ ...existing, status: "tombstone" });
    } else {
      await saveSession({
        videoId,
        title: "",
        ownerId: "",
        uploadedBytes: 0,
        lastChunkIndex: 0,
        status: "tombstone",
        createdAt: Date.now(),
      });
    }
  } catch {
    // Non-critical
  }
}

export async function saveFileBlobToIDB(
  uploadId: string,
  file: File,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, "readwrite");
    const store = tx.objectStore(FILES_STORE);
    store.put(file, uploadId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getFileBlobFromIDB(
  uploadId: string,
): Promise<File | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, "readonly");
    const store = tx.objectStore(FILES_STORE);
    const req = store.get(uploadId);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as File) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function deleteFileBlobFromIDB(uploadId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, "readwrite");
    const store = tx.objectStore(FILES_STORE);
    store.delete(uploadId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
