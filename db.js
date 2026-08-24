/**
 * Database Module
 * Handles all IndexedDB operations for Flyer Delivery Tracker
 * Ensures data persistence and safe transactions
 */

class Database {
    constructor() {
        this.dbName = 'FlyerDeliveryTracker';
        this.version = 1;
        this.db = null;
    }

    /**
     * Initialize the database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database failed to open:', request.error);
                reject(new Error('Database failed to open: ' + request.error));
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this._createStores(this.db);
                console.log('Database schema created');
            };
        });
    }

    /**
     * Create all object stores
     */
    _createStores(db) {
        // Users store
        if (!db.objectStoreNames.contains('users')) {
            const userStore = db.createObjectStore('users', { keyPath: 'id' });
            userStore.createIndex('name', 'name', { unique: false });
        }

        // Addresses store
        if (!db.objectStoreNames.contains('addresses')) {
            const addressStore = db.createObjectStore('addresses', { keyPath: 'id' });
            addressStore.createIndex('order', 'order', { unique: false });
            addressStore.createIndex('active', 'active', { unique: false });
        }

        // Delivery events store
        if (!db.objectStoreNames.contains('deliveryEvents')) {
            const eventStore = db.createObjectStore('deliveryEvents', { keyPath: 'id' });
            eventStore.createIndex('addressId', 'addressId', { unique: false });
            eventStore.createIndex('userId', 'userId', { unique: false });
            eventStore.createIndex('timestamp', 'timestamp', { unique: false });
            eventStore.createIndex('dateKey', 'dateKey', { unique: false });
            eventStore.createIndex('action', 'action', { unique: false });
        }

        // Notes store
        if (!db.objectStoreNames.contains('notes')) {
            const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
            noteStore.createIndex('addressId', 'addressId', { unique: false });
            noteStore.createIndex('userId', 'userId', { unique: false });
            noteStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
        }
    }

    /**
     * Generic read operation
     */
    async read(storeName, key) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic write operation
     */
    async write(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic delete operation
     */
    async delete(storeName, key) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all records from a store
     */
    async getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get records by index value
     */
    async getByIndex(storeName, indexName, value) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all records from a store
     */
    async clear(storeName) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all records from multiple stores in a transaction
     */
    async getMultiple(storeNames) {
        const transaction = this.db.transaction(storeNames, 'readonly');
        const results = {};
        
        return new Promise((resolve, reject) => {
            const promises = storeNames.map(storeName => {
                return new Promise((res) => {
                    const store = transaction.objectStore(storeName);
                    const request = store.getAll();
                    request.onsuccess = () => {
                        results[storeName] = request.result || [];
                        res();
                    };
                });
            });

            Promise.all(promises).then(() => resolve(results));
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Clear multiple stores
     */
    async clearMultiple(storeNames) {
        const transaction = this.db.transaction(storeNames, 'readwrite');
        
        return new Promise((resolve, reject) => {
            storeNames.forEach(storeName => {
                const store = transaction.objectStore(storeName);
                store.clear();
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Bulk write multiple records
     */
    async bulkWrite(storeName, records) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            records.forEach(record => {
                store.put(record);
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Export all data as JSON
     */
    async exportData() {
        const storeNames = ['users', 'addresses', 'deliveryEvents', 'notes', 'settings'];
        const data = await this.getMultiple(storeNames);
        
        return {
            version: this.version,
            exportDate: new Date().toISOString(),
            data: data
        };
    }

    /**
     * Import data from JSON
     * Validates before importing
     */
    async importData(backup) {
        // Validate backup structure
        if (!backup.data || typeof backup.data !== 'object') {
            throw new Error('Invalid backup format: missing data object');
        }

        const requiredStores = ['users', 'addresses', 'deliveryEvents', 'notes', 'settings'];
        for (const store of requiredStores) {
            if (!(store in backup.data)) {
                throw new Error(`Invalid backup format: missing ${store} store`);
            }
            if (!Array.isArray(backup.data[store])) {
                throw new Error(`Invalid backup format: ${store} is not an array`);
            }
        }

        // Import data
        const storeNames = ['users', 'addresses', 'deliveryEvents', 'notes', 'settings'];
        await this.clearMultiple(storeNames);

        for (const storeName of storeNames) {
            const records = backup.data[storeName];
            if (records.length > 0) {
                await this.bulkWrite(storeName, records);
            }
        }
    }

    /**
     * Get setting value
     */
    async getSetting(key, defaultValue = null) {
        const setting = await this.read('settings', key);
        return setting ? setting.value : defaultValue;
    }

    /**
     * Set setting value
     */
    async setSetting(key, value) {
        return this.write('settings', { key, value });
    }

    /**
     * Create a backup for undo functionality
     * Stores the last action for quick undo
     */
    async createUndoBackup(undoData) {
        return this.setSetting('_lastUndoData', undoData);
    }

    /**
     * Get and clear undo backup
     */
    async getAndClearUndoBackup() {
        const backup = await this.getSetting('_lastUndoData');
        if (backup) {
            await this.setSetting('_lastUndoData', null);
        }
        return backup;
    }
}

// Initialize database
const db = new Database();
