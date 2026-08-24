// Simple IndexedDB wrapper for Flyer Tracker

const DB_NAME = 'flyer-tracker';
const DB_VERSION = 1;

class Database {
  constructor() {
    this.db = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Users
        if (!db.objectStoreNames.contains('users')) {
          const store = db.createObjectStore('users', { keyPath: 'id' });
        }

        // Addresses
        if (!db.objectStoreNames.contains('addresses')) {
          const store = db.createObjectStore('addresses', { keyPath: 'id' });
          store.createIndex('active', 'active', { unique: false });
        }

        // Sessions
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }

        // Events (delivered / revisit)
        if (!db.objectStoreNames.contains('events')) {
          const store = db.createObjectStore('events', { keyPath: 'id' });
          store.createIndex('dateKey', 'dateKey', { unique: false });
          store.createIndex('addressId', 'addressId', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
        }

        // Notes
        if (!db.objectStoreNames.contains('notes')) {
          const store = db.createObjectStore('notes', { keyPath: 'id' });
          store.createIndex('addressId', 'addressId', { unique: false });
        }

        // Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Undo backup
        if (!db.objectStoreNames.contains('undo')) {
          db.createObjectStore('undo', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  _tx(storeName, mode = 'readonly') {
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }

  write(storeName, value) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, 'readwrite');
      const req = store.put(value);
      req.onsuccess = () => resolve(value);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  read(storeName, key) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, 'readwrite');
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName);
      const index = store.index(indexName);
      const req = index.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Settings helpers
  async setSetting(key, value) {
    await this.write('settings', { key, value });
  }

  async getSetting(key) {
    const s = await this.read('settings', key);
    return s ? s.value : null;
  }

  // Undo helpers
  async createUndoBackup(data) {
    await this.write('undo', { id: 'last', ...data });
  }

  async getAndClearUndoBackup() {
    const backup = await this.read('undo', 'last');
    if (backup) {
      await this.delete('undo', 'last');
    }
    return backup || null;
  }
}

const db = new Database();
