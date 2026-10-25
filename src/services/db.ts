import { Track, Playlist, AppSettings, TrackAnalysis } from '../types/music';

const DB_NAME = 'MyMusicDB';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Tracks Metadata Store
      if (!db.objectStoreNames.contains('tracks')) {
        const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
        trackStore.createIndex('title', 'title', { unique: false });
        trackStore.createIndex('artist', 'artist', { unique: false });
        trackStore.createIndex('album', 'album', { unique: false });
        trackStore.createIndex('downloadDate', 'downloadDate', { unique: false });
        trackStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        trackStore.createIndex('lastPlayedAt', 'lastPlayedAt', { unique: false });
      }

      // 2. Audio Blobs Store (Separated from metadata to ensure snappy UI queries)
      if (!db.objectStoreNames.contains('audioBlobs')) {
        db.createObjectStore('audioBlobs', { keyPath: 'id' });
      }

      // 3. Playlists Store
      if (!db.objectStoreNames.contains('playlists')) {
        const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
        playlistStore.createIndex('name', 'name', { unique: false });
        playlistStore.createIndex('sourceType', 'sourceType', { unique: false });
      }

      // 4. App Settings & Sync state
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // 5. Synced Telegram File Hashes / IDs to prevent re-download
      if (!db.objectStoreNames.contains('syncHistory')) {
        db.createObjectStore('syncHistory', { keyPath: 'fileIdentifier' });
      }

      // 6. Btt Smart Mix Track Audio Analysis Store (Additive Migration)
      if (!db.objectStoreNames.contains('trackAnalysis')) {
        const analysisStore = db.createObjectStore('trackAnalysis', { keyPath: 'trackId' });
        analysisStore.createIndex('analyzedAt', 'analyzedAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

// ---------------- TRACKS ----------------

export async function getAllTracks(): Promise<Track[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readonly');
    const store = tx.objectStore('tracks');
    const request = store.getAll();

    request.onsuccess = () => {
      const tracks = (request.result as Track[]) || [];
      // Sort newest downloads first by default
      tracks.sort((a, b) => b.downloadDate - a.downloadDate);
      resolve(tracks);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getTrack(id: string): Promise<Track | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readonly');
    const store = tx.objectStore('tracks');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as Track | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTrack(track: Track, audioBlob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tracks', 'audioBlobs', 'syncHistory'], 'readwrite');

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));

    // Save track metadata
    tx.objectStore('tracks').put(track);

    // Save binary audio blob
    tx.objectStore('audioBlobs').put({ id: track.id, blob: audioBlob });

    // Record sync history identifier if available
    const identifier = track.telegramSource?.fileId || track.fileHash || track.fileName;
    if (identifier) {
      tx.objectStore('syncHistory').put({
        fileIdentifier: identifier,
        trackId: track.id,
        savedAt: Date.now(),
      });
    }
  });
}

export async function updateTrackMetadata(track: Track): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    const request = store.put(track);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const stores: string[] = ['tracks', 'audioBlobs', 'playlists'];
    if (db.objectStoreNames.contains('trackAnalysis')) stores.push('trackAnalysis');
    const tx = db.transaction(stores, 'readwrite');

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);

    // 1. Delete track metadata
    tx.objectStore('tracks').delete(id);

    // 2. Delete audio binary blob
    tx.objectStore('audioBlobs').delete(id);

    // 3. Delete analysis record if available
    if (db.objectStoreNames.contains('trackAnalysis')) {
      tx.objectStore('trackAnalysis').delete(id);
    }

    // 4. Remove track ID from all playlists
    const playlistStore = tx.objectStore('playlists');
    const req = playlistStore.getAll();
    req.onsuccess = () => {
      const playlists = req.result as Playlist[];
      for (const pl of playlists) {
        if (pl.trackIds.includes(id)) {
          pl.trackIds = pl.trackIds.filter((tId) => tId !== id);
          pl.updatedAt = Date.now();
          playlistStore.put(pl);
        }
      }
    };
  });
}

export async function deleteTracks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tracks', 'audioBlobs', 'playlists'], 'readwrite');

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);

    const trackStore = tx.objectStore('tracks');
    const blobStore = tx.objectStore('audioBlobs');

    for (const id of ids) {
      trackStore.delete(id);
      blobStore.delete(id);
    }

    const playlistStore = tx.objectStore('playlists');
    const req = playlistStore.getAll();
    req.onsuccess = () => {
      const playlists = req.result as Playlist[];
      const idSet = new Set(ids);
      for (const pl of playlists) {
        const originalLen = pl.trackIds.length;
        pl.trackIds = pl.trackIds.filter((tId) => !idSet.has(tId));
        if (pl.trackIds.length !== originalLen) {
          pl.updatedAt = Date.now();
          playlistStore.put(pl);
        }
      }
    };
  });
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audioBlobs', 'readonly');
    const store = tx.objectStore('audioBlobs');
    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result && request.result.blob) {
        resolve(request.result.blob as Blob);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ---------------- PLAYLISTS ----------------

export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readonly');
    const store = tx.objectStore('playlists');
    const request = store.getAll();

    request.onsuccess = () => {
      const list = (request.result as Playlist[]) || [];
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.objectStore('playlists');
    const request = store.put(playlist);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.objectStore('playlists');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---------------- SETTINGS ----------------

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDB();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result !== undefined && request.result.value !== undefined) {
          resolve(request.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };
      request.onerror = () => resolve(defaultValue);
    } catch {
      resolve(defaultValue);
    }
  });
}

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ---------------- SYNC HISTORY ----------------

export async function isIdentifierImported(identifier?: string): Promise<boolean> {
  if (!identifier || typeof identifier !== 'string' || identifier.trim() === '') {
    return false;
  }
  const cleanId = identifier.trim();
  const db = await getDB();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(['syncHistory', 'tracks'], 'readonly');
      const syncStore = tx.objectStore('syncHistory');
      const trackStore = tx.objectStore('tracks');
      const request = syncStore.get(cleanId);

      request.onsuccess = () => {
        const syncRecord = request.result;
        if (!syncRecord || !syncRecord.trackId) {
          resolve(false);
          return;
        }

        // Verify that the track ACTUALLY exists in tracks object store
        const trackReq = trackStore.get(syncRecord.trackId);
        trackReq.onsuccess = () => {
          resolve(!!trackReq.result);
        };
        trackReq.onerror = () => resolve(false);
      };
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function isTrackInLibrary(fileId?: string, fileUniqueId?: string, fileName?: string): Promise<boolean> {
  try {
    const tracks = await getAllTracks();
    return tracks.some((t) => {
      if (fileUniqueId && (t.fileHash === fileUniqueId || t.telegramSource?.fileId === fileUniqueId)) {
        return true;
      }
      if (fileId && (t.telegramSource?.fileId === fileId || t.fileHash === fileId)) {
        return true;
      }
      if (fileName && t.fileName === fileName) {
        return true;
      }
      return false;
    });
  } catch {
    return false;
  }
}

// ---------------- STORAGE & BACKUP ----------------

export async function getStorageEstimate(): Promise<{
  quotaBytes: number;
  usedBytes: number;
  trackCount: number;
  trackBytes: number;
}> {
  let quota = 0;
  let usage = 0;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quota = estimate.quota || 0;
      usage = estimate.usage || 0;
    } catch {
      // ignore
    }
  }

  const tracks = await getAllTracks();
  const trackBytes = tracks.reduce((acc, t) => acc + (t.fileSize || 0), 0);

  return {
    quotaBytes: quota,
    usedBytes: Math.max(usage, trackBytes),
    trackCount: tracks.length,
    trackBytes,
  };
}

export async function exportLibraryBackup(): Promise<string> {
  const tracks = await getAllTracks();
  const playlists = await getAllPlaylists();

  // Export metadata only (excluding large blobs)
  const backup = {
    appName: 'MyMusic',
    version: 1,
    exportedAt: new Date().toISOString(),
    tracks: tracks.map((t) => ({ ...t, artworkUrl: undefined })), // strip heavy base64 for compact backup
    playlists,
  };

  return JSON.stringify(backup, null, 2);
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const stores: string[] = ['tracks', 'audioBlobs', 'playlists', 'settings', 'syncHistory'];
    if (db.objectStoreNames.contains('trackAnalysis')) stores.push('trackAnalysis');
    const tx = db.transaction(stores, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);

    tx.objectStore('tracks').clear();
    tx.objectStore('audioBlobs').clear();
    tx.objectStore('playlists').clear();
    tx.objectStore('settings').clear();
    tx.objectStore('syncHistory').clear();
    if (db.objectStoreNames.contains('trackAnalysis')) {
      tx.objectStore('trackAnalysis').clear();
    }
  });
}

// ---------------- BTT SMART MIX TRACK ANALYSIS ----------------

export async function getTrackAnalysis(trackId: string): Promise<TrackAnalysis | undefined> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('trackAnalysis')) return undefined;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('trackAnalysis', 'readonly');
      const store = tx.objectStore('trackAnalysis');
      const request = store.get(trackId);
      request.onsuccess = () => resolve(request.result as TrackAnalysis | undefined);
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function getAllTrackAnalyses(): Promise<Record<string, TrackAnalysis>> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('trackAnalysis')) return {};
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('trackAnalysis', 'readonly');
      const store = tx.objectStore('trackAnalysis');
      const request = store.getAll();
      request.onsuccess = () => {
        const list = (request.result as TrackAnalysis[]) || [];
        const map: Record<string, TrackAnalysis> = {};
        for (const item of list) {
          map[item.trackId] = item;
        }
        resolve(map);
      };
      request.onerror = () => resolve({});
    } catch {
      resolve({});
    }
  });
}

export async function saveTrackAnalysis(analysis: TrackAnalysis): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('trackAnalysis')) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('trackAnalysis', 'readwrite');
    const store = tx.objectStore('trackAnalysis');
    const request = store.put(analysis);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTrackAnalysis(trackId: string): Promise<void> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('trackAnalysis')) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('trackAnalysis', 'readwrite');
    const store = tx.objectStore('trackAnalysis');
    const request = store.delete(trackId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
