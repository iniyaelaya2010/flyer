/**
 * Data Module
 * Handles business logic for users, addresses, events, and calculations
 * Acts as a bridge between the database and UI
 */

class DataManager {
    constructor(database) {
        this.db = database;
    }

    /**
     * USERS - Add a new user
     */
    async addUser(name) {
        const trimmedName = name.trim();
        if (!trimmedName) throw new Error('User name cannot be empty');

        // Check for duplicates
        const users = await this.db.getAll('users');
        if (users.some(u => u.name.toLowerCase() === trimmedName.toLowerCase())) {
            throw new Error('User already exists');
        }

        const user = {
            id: this._generateId(),
            name: trimmedName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.db.write('users', user);
        return user;
    }

    /**
     * USERS - Get all users
     */
    async getUsers() {
        return await this.db.getAll('users');
    }

    /**
     * USERS - Get user by ID
     */
    async getUser(userId) {
        return await this.db.read('users', userId);
    }

    /**
     * USERS - Update user
     */
    async updateUser(userId, name) {
        const user = await this.getUser(userId);
        if (!user) throw new Error('User not found');

        const trimmedName = name.trim();
        if (!trimmedName) throw new Error('User name cannot be empty');

        // Check for duplicates (excluding self)
        const users = await this.db.getAll('users');
        if (users.some(u => u.id !== userId && u.name.toLowerCase() === trimmedName.toLowerCase())) {
            throw new Error('User name already exists');
        }

        user.name = trimmedName;
        user.updatedAt = new Date().toISOString();

        await this.db.write('users', user);
        return user;
    }

    /**
     * USERS - Delete user
     */
    async deleteUser(userId) {
        const events = await this.db.getByIndex('deliveryEvents', 'userId', userId);
        const notes = await this.db.getByIndex('notes', 'userId', userId);

        if (events.length > 0 || notes.length > 0) {
            throw new Error('Cannot delete user with delivery history. Please confirm deletion.');
        }

        await this.db.delete('users', userId);
    }

    /**
     * USERS - Get active user from settings
     */
    async getActiveUser() {
        const userId = await this.db.getSetting('activeUserId');
        if (!userId) return null;
        return await this.getUser(userId);
    }

    /**
     * USERS - Set active user
     */
    async setActiveUser(userId) {
        const user = await this.getUser(userId);
        if (!user) throw new Error('User not found');
        await this.db.setSetting('activeUserId', userId);
        return user;
    }

    /**
     * ADDRESSES - Add new address
     */
    async addAddress(addressText) {
        const trimmed = addressText.trim();
        if (!trimmed) throw new Error('Address cannot be empty');

        const addresses = await this.db.getAll('addresses');
        const nextOrder = addresses.length > 0 ? Math.max(...addresses.map(a => a.order)) + 1 : 1;

        const address = {
            id: this._generateId(),
            order: nextOrder,
            address: trimmed,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.db.write('addresses', address);
        return address;
    }

    /**
     * ADDRESSES - Get all addresses sorted by order
     */
    async getAddresses() {
        const addresses = await this.db.getAll('addresses');
        return addresses.filter(a => a.active).sort((a, b) => a.order - b.order);
    }

    /**
     * ADDRESSES - Get all addresses including inactive
     */
    async getAllAddresses() {
        const addresses = await this.db.getAll('addresses');
        return addresses.sort((a, b) => a.order - b.order);
    }

    /**
     * ADDRESSES - Get address by ID
     */
    async getAddress(addressId) {
        return await this.db.read('addresses', addressId);
    }

    /**
     * ADDRESSES - Update address
     */
    async updateAddress(addressId, addressText) {
        const address = await this.getAddress(addressId);
        if (!address) throw new Error('Address not found');

        const trimmed = addressText.trim();
        if (!trimmed) throw new Error('Address cannot be empty');

        address.address = trimmed;
        address.updatedAt = new Date().toISOString();

        await this.db.write('addresses', address);
        return address;
    }

    /**
     * ADDRESSES - Delete address (soft delete - mark as inactive)
     */
    async deleteAddress(addressId) {
        const address = await this.getAddress(addressId);
        if (!address) throw new Error('Address not found');

        address.active = false;
        address.updatedAt = new Date().toISOString();

        await this.db.write('addresses', address);
    }

    /**
     * ADDRESSES - Reorder addresses
     */
    async reorderAddresses(addressIds) {
        for (let i = 0; i < addressIds.length; i++) {
            const address = await this.getAddress(addressIds[i]);
            if (address) {
                address.order = i + 1;
                address.updatedAt = new Date().toISOString();
                await this.db.write('addresses', address);
            }
        }
    }

    /**
     * ADDRESSES - Import addresses from text/CSV
     */
    async importAddresses(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length === 0) throw new Error('No addresses to import');

        const imported = [];
        for (const line of lines) {
            try {
                const address = await this.addAddress(line);
                imported.push(address);
            } catch (error) {
                console.warn('Failed to import address:', line, error);
            }
        }

        return imported;
    }

    /**
     * ADDRESSES - Reset route (clear all addresses)
     */
    async resetRoute() {
        const addresses = await this.getAllAddresses();
        for (const address of addresses) {
            address.active = false;
            address.updatedAt = new Date().toISOString();
            await this.db.write('addresses', address);
        }
    }

    /**
     * DELIVERY EVENTS - Record a delivery
     */
    async recordDelivery(addressId, userId, note = null) {
        const address = await this.getAddress(addressId);
        const user = await this.getUser(userId);

        if (!address) throw new Error('Address not found');
        if (!user) throw new Error('User not found');

        const now = new Date();
        const event = {
            id: this._generateId(),
            addressId: addressId,
            address: address.address, // Snapshot of address text
            userId: userId,
            userName: user.name,
            action: 'delivered',
            timestamp: now.toISOString(),
            dateKey: this._getDateKey(now)
        };

        // Create undo backup
        const undoData = {
            type: 'delivery',
            eventId: event.id,
            timestamp: now.getTime()
        };

        await this.db.write('deliveryEvents', event);

        // Add note if provided
        if (note && note.trim()) {
            await this.addNote(addressId, userId, note);
        }

        // Store undo data
        await this.db.createUndoBackup(undoData);

        return event;
    }

    /**
     * DELIVERY EVENTS - Record a revisit
     */
    async recordRevisit(addressId, userId, note = null) {
        const address = await this.getAddress(addressId);
        const user = await this.getUser(userId);

        if (!address) throw new Error('Address not found');
        if (!user) throw new Error('User not found');

        const now = new Date();
        const event = {
            id: this._generateId(),
            addressId: addressId,
            address: address.address, // Snapshot of address text
            userId: userId,
            userName: user.name,
            action: 'revisit',
            timestamp: now.toISOString(),
            dateKey: this._getDateKey(now)
        };

        // Create undo backup
        const undoData = {
            type: 'revisit',
            eventId: event.id,
            timestamp: now.getTime()
        };

        await this.db.write('deliveryEvents', event);

        // Add note if provided
        if (note && note.trim()) {
            await this.addNote(addressId, userId, note);
        }

        // Store undo data
        await this.db.createUndoBackup(undoData);

        return event;
    }

    /**
     * DELIVERY EVENTS - Undo last action
     */
    async undoLastAction() {
        const backup = await this.db.getAndClearUndoBackup();
        if (!backup) throw new Error('No action to undo');

        const event = await this.db.read('deliveryEvents', backup.eventId);
        if (!event) throw new Error('Event not found');

        // Check if undo window has passed (5 minutes)
        const now = Date.now();
        if (now - backup.timestamp > 5 * 60 * 1000) {
            throw new Error('Undo window has passed');
        }

        // Delete the event
        await this.db.delete('deliveryEvents', backup.eventId);

        // Delete associated notes
        const notes = await this.db.getByIndex('notes', 'addressId', event.addressId);
        const recentNotes = notes.filter(n => Math.abs(this._parseTimestamp(n.timestamp) - this._parseTimestamp(event.timestamp)) < 1000);
        for (const note of recentNotes) {
            await this.db.delete('notes', note.id);
        }
    }

    /**
     * DELIVERY EVENTS - Get all events for a date
     */
    async getEventsForDate(dateKey) {
        return await this.db.getByIndex('deliveryEvents', 'dateKey', dateKey);
    }

    /**
     * DELIVERY EVENTS - Get all events for a date range
     */
    async getEventsForDateRange(startDate, endDate) {
        const events = await this.db.getAll('deliveryEvents');
        return events.filter(event => {
            const eventDate = event.dateKey;
            return eventDate >= startDate && eventDate <= endDate;
        });
    }

    /**
     * NOTES - Add note to address
     */
    async addNote(addressId, userId, text) {
        if (!text || !text.trim()) throw new Error('Note cannot be empty');

        const address = await this.getAddress(addressId);
        const user = await this.getUser(userId);

        if (!address) throw new Error('Address not found');
        if (!user) throw new Error('User not found');

        const note = {
            id: this._generateId(),
            addressId: addressId,
            userId: userId,
            userName: user.name,
            text: text.trim(),
            timestamp: new Date().toISOString()
        };

        await this.db.write('notes', note);
        return note;
    }

    /**
     * NOTES - Get notes for an address
     */
    async getNotesForAddress(addressId) {
        return await this.db.getByIndex('notes', 'addressId', addressId);
    }

    /**
     * PROGRESS - Get progress for today
     */
    async getTodayProgress() {
        const today = this._getToday();
        return this.getProgressForDate(today);
    }

    /**
     * PROGRESS - Get progress for a specific date
     */
    async getProgressForDate(dateKey) {
        const events = await this.getEventsForDate(dateKey);
        const addresses = await this.getAddresses();

        // Get unique addresses that have been delivered
        const deliveredAddressIds = new Set();
        const revisitAddressIds = new Set();

        for (const event of events) {
            if (event.action === 'delivered') {
                deliveredAddressIds.add(event.addressId);
            } else if (event.action === 'revisit') {
                revisitAddressIds.add(event.addressId);
            }
        }

        const deliveredCount = deliveredAddressIds.size;
        const revisitCount = revisitAddressIds.size;
        const totalCount = addresses.length;
        const remainingCount = totalCount - deliveredCount;
        const percentage = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;

        return {
            delivered: deliveredCount,
            revisit: revisitCount,
            remaining: remainingCount,
            total: totalCount,
            percentage: percentage
        };
    }

    /**
     * PROGRESS - Get address status for a date
     */
    async getAddressStatus(addressId, dateKey) {
        const events = await this.getEventsForDate(dateKey);
        const addressEvents = events.filter(e => e.addressId === addressId);

        if (addressEvents.some(e => e.action === 'delivered')) {
            return 'delivered';
        } else if (addressEvents.some(e => e.action === 'revisit')) {
            return 'revisit';
        }
        return 'not-started';
    }

    /**
     * STATISTICS - Get stats for a period
     */
    async getStatisticsForPeriod(startDate, endDate) {
        const events = await this.getEventsForDateRange(startDate, endDate);
        const users = await this.getUsers();

        const stats = {
            startDate,
            endDate,
            totalEvents: events.length,
            totalDelivered: 0,
            totalRevisits: 0,
            uniqueAddressesDelivered: new Set(),
            deliveriesByUser: {},
            deliveriesByDate: {}
        };

        for (const event of events) {
            if (event.action === 'delivered') {
                stats.totalDelivered++;
                stats.uniqueAddressesDelivered.add(event.addressId);
            } else if (event.action === 'revisit') {
                stats.totalRevisits++;
            }

            // By user
            if (!stats.deliveriesByUser[event.userId]) {
                stats.deliveriesByUser[event.userId] = {
                    name: event.userName,
                    delivered: 0,
                    revisits: 0
                };
            }
            if (event.action === 'delivered') {
                stats.deliveriesByUser[event.userId].delivered++;
            } else if (event.action === 'revisit') {
                stats.deliveriesByUser[event.userId].revisits++;
            }

            // By date
            if (!stats.deliveriesByDate[event.dateKey]) {
                stats.deliveriesByDate[event.dateKey] = {
                    delivered: 0,
                    revisits: 0
                };
            }
            if (event.action === 'delivered') {
                stats.deliveriesByDate[event.dateKey].delivered++;
            } else if (event.action === 'revisit') {
                stats.deliveriesByDate[event.dateKey].revisits++;
            }
        }

        stats.uniqueAddressesDeliveredCount = stats.uniqueAddressesDelivered.size;
        stats.percentage = 0;

        const totalAddresses = await this.getAddresses();
        if (totalAddresses.length > 0) {
            stats.percentage = Math.round((stats.uniqueAddressesDeliveredCount / totalAddresses.length) * 100);
        }

        return stats;
    }

    /**
     * HISTORY - Get all events with optional filters
     */
    async getHistory(filters = {}) {
        let events = await this.db.getAll('deliveryEvents');

        // Filter by user
        if (filters.userId) {
            events = events.filter(e => e.userId === filters.userId);
        }

        // Filter by action/status
        if (filters.action) {
            events = events.filter(e => e.action === filters.action);
        }

        // Filter by date range
        if (filters.startDate && filters.endDate) {
            events = events.filter(e => e.dateKey >= filters.startDate && e.dateKey <= filters.endDate);
        } else if (filters.dateKey) {
            events = events.filter(e => e.dateKey === filters.dateKey);
        }

        // Filter by address (search)
        if (filters.addressSearch) {
            const searchLower = filters.addressSearch.toLowerCase();
            events = events.filter(e => e.address.toLowerCase().includes(searchLower));
        }

        // Sort by timestamp descending
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return events;
    }

    /**
     * Helper - Generate unique ID
     */
    _generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Helper - Get date key (YYYY-MM-DD) from date
     */
    _getDateKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Helper - Get today's date key
     */
    _getToday() {
        return this._getDateKey(new Date());
    }

    /**
     * Helper - Parse ISO timestamp
     */
    _parseTimestamp(isoString) {
        return new Date(isoString).getTime();
    }

    /**
     * Helper - Get date range for "this week"
     */
    getThisWeekRange() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek); // Sunday
        
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // Saturday

        return {
            start: this._getDateKey(startDate),
            end: this._getDateKey(endDate)
        };
    }

    /**
     * Helper - Get date range for "this month"
     */
    getThisMonthRange() {
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        return {
            start: this._getDateKey(startDate),
            end: this._getDateKey(endDate)
        };
    }

    /**
     * Helper - Get date range for custom range
     */
    getCustomDateRange(startDate, endDate) {
        return {
            start: startDate,
            end: endDate
        };
    }

    /**
     * Helper - Format date for display
     */
    formatDate(dateKey) {
        const parts = dateKey.split('-');
        const date = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    /**
     * Helper - Format time for display
     */
    formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            meridiem: 'short'
        });
    }

    /**
     * Helper - Format full datetime
     */
    formatDateTime(isoString) {
        const date = new Date(isoString);
        const dateStr = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        const timeStr = date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit'
        });
        return `${dateStr} at ${timeStr}`;
    }
}

// Initialize data manager
const data = new DataManager(db);
