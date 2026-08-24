/**
 * Data Manager
 * Handles users, addresses, events, notes, progress, statistics, history
 */

class DataManager {
    constructor(database) {
        this.db = database;
    }

    /* ---------------- USERS ---------------- */

    async addUser(name) {
        const trimmed = name.trim();
        if (!trimmed) throw new Error("User name cannot be empty");

        const users = await this.db.getAll("users");
        if (users.some(u => u.name.toLowerCase() === trimmed.toLowerCase())) {
            throw new Error("User already exists");
        }

        const user = {
            id: this._id(),
            name: trimmed,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.db.write("users", user);
        return user;
    }

    async getUsers() {
        return await this.db.getAll("users");
    }

    async getUser(id) {
        return await this.db.read("users", id);
    }

    async updateUser(id, name) {
        const user = await this.getUser(id);
        if (!user) throw new Error("User not found");

        const trimmed = name.trim();
        if (!trimmed) throw new Error("User name cannot be empty");

        const users = await this.db.getAll("users");
        if (users.some(u => u.id !== id && u.name.toLowerCase() === trimmed.toLowerCase())) {
            throw new Error("User name already exists");
        }

        user.name = trimmed;
        user.updatedAt = new Date().toISOString();
        await this.db.write("users", user);
        return user;
    }

    async deleteUser(id) {
        const events = await this.db.getByIndex("events", "userId", id);
        const notes = await this.db.getByIndex("notes", "userId", id);

        if (events.length > 0 || notes.length > 0) {
            throw new Error("Cannot delete user with history");
        }

        await this.db.delete("users", id);
    }

    async getActiveUser() {
        const id = await this.db.getSetting("activeUserId");
        if (!id) return null;
        return await this.getUser(id);
    }

    async setActiveUser(id) {
        const user = await this.getUser(id);
        if (!user) throw new Error("User not found");
        await this.db.setSetting("activeUserId", id);
        return user;
    }

    /* ---------------- ADDRESSES ---------------- */

    async addAddress(text) {
        const trimmed = text.trim();
        if (!trimmed) throw new Error("Address cannot be empty");

        const addresses = await this.db.getAll("addresses");
        const nextOrder = addresses.length > 0 ? Math.max(...addresses.map(a => a.order)) + 1 : 1;

        const addr = {
            id: this._id(),
            address: trimmed,
            order: nextOrder,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await this.db.write("addresses", addr);
        return addr;
    }

    async getAddresses() {
        const all = await this.db.getAll("addresses");
        return all.filter(a => a.active).sort((a, b) => a.order - b.order);
    }

    async getAddress(id) {
        return await this.db.read("addresses", id);
    }

    async updateAddress(id, text) {
        const addr = await this.getAddress(id);
        if (!addr) throw new Error("Address not found");

        const trimmed = text.trim();
        if (!trimmed) throw new Error("Address cannot be empty");

        addr.address = trimmed;
        addr.updatedAt = new Date().toISOString();
        await this.db.write("addresses", addr);
        return addr;
    }

    async deleteAddress(id) {
        const addr = await this.getAddress(id);
        if (!addr) throw new Error("Address not found");

        addr.active = false;
        addr.updatedAt = new Date().toISOString();
        await this.db.write("addresses", addr);
    }

    async importAddresses(text) {
        const lines = text.split("\n").map(l => l.trim()).filter(l => l);
        const imported = [];

        for (const line of lines) {
            try {
                const addr = await this.addAddress(line);
                imported.push(addr);
            } catch (e) {
                console.warn("Failed to import:", line);
            }
        }

        return imported;
    }

    /* ---------------- EVENTS ---------------- */

    async recordDelivery(addressId, userId) {
        const addr = await this.getAddress(addressId);
        const user = await this.getUser(userId);

        if (!addr) throw new Error("Address not found");
        if (!user) throw new Error("User not found");

        const now = new Date();
        const event = {
            id: this._id(),
            addressId,
            address: addr.address,
            userId,
            userName: user.name,
            action: "delivered",
            timestamp: now.toISOString(),
            dateKey: this._dateKey(now)
        };

        await this.db.write("events", event);
        await this.db.createUndoBackup({ type: "delivery", eventId: event.id, timestamp: now.getTime() });

        return event;
    }

    async recordRevisit(addressId, userId) {
        const addr = await this.getAddress(addressId);
        const user = await this.getUser(userId);

        if (!addr) throw new Error("Address not found");
        if (!user) throw new Error("User not found");

        const now = new Date();
        const event = {
            id: this._id(),
            addressId,
            address: addr.address,
            userId,
            userName: user.name,
            action: "revisit",
            timestamp: now.toISOString(),
            dateKey: this._dateKey(now)
        };

        await this.db.write("events", event);
        await this.db.createUndoBackup({ type: "revisit", eventId: event.id, timestamp: now.getTime() });

        return event;
    }

    async undoLastAction() {
        const backup = await this.db.getAndClearUndoBackup();
        if (!backup) throw new Error("No action to undo");

        const event = await this.db.read("events", backup.eventId);
        if (!event) throw new Error("Event not found");

        const now = Date.now();
        if (now - backup.timestamp > 5 * 60 * 1000) {
            throw new Error("Undo window expired");
        }

        await this.db.delete("events", backup.eventId);
    }

    /* ---------------- NOTES ---------------- */

    async addNote(addressId, userId, text) {
        const trimmed = text.trim();
        if (!trimmed) throw new Error("Note cannot be empty");

        const addr = await this.getAddress(addressId);
        const user = await this.getUser(userId);

        if (!addr) throw new Error("Address not found");
        if (!user) throw new Error("User not found");

        const note = {
            id: this._id(),
            addressId,
            userId,
            userName: user.name,
            text: trimmed,
            timestamp: new Date().toISOString()
        };

        await this.db.write("notes", note);
        return note;
    }

    /* ---------------- PROGRESS ---------------- */

    async getTodayProgress() {
        const today = this._dateKey(new Date());
        return await this.getProgressForDate(today);
    }

    async getProgressForDate(dateKey) {
        const events = await this.db.getByIndex("events", "dateKey", dateKey);
        const addresses = await this.getAddresses();

        const delivered = new Set();
        const revisit = new Set();

        for (const e of events) {
            if (e.action === "delivered") delivered.add(e.addressId);
            if (e.action === "revisit") revisit.add(e.addressId);
        }

        return {
            delivered: delivered.size,
            revisit: revisit.size,
            remaining: addresses.length - delivered.size,
            total: addresses.length,
            percentage: addresses.length > 0 ? Math.round((delivered.size / addresses.length) * 100) : 0
        };
    }

    /* ---------------- HISTORY ---------------- */

    async getHistory(filters = {}) {
        let events = await this.db.getAll("events");

        if (filters.userId) events = events.filter(e => e.userId === filters.userId);
        if (filters.action) events = events.filter(e => e.action === filters.action);
        if (filters.addressSearch) {
            const s = filters.addressSearch.toLowerCase();
            events = events.filter(e => e.address.toLowerCase().includes(s));
        }

        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return events;
    }

    /* ---------------- STATISTICS ---------------- */

    async getStatisticsForPeriod(start, end) {
        const events = await this.db.getAll("events");
        const filtered = events.filter(e => e.dateKey >= start && e.dateKey <= end);

        const delivered = filtered.filter(e => e.action === "delivered").length;
        const revisit = filtered.filter(e => e.action === "revisit").length;

        const uniqueDelivered = new Set(filtered.filter(e => e.action === "delivered").map(e => e.addressId));

        const addresses = await this.getAddresses();
        const percentage = addresses.length > 0 ? Math.round((uniqueDelivered.size / addresses.length) * 100) : 0;

        return {
            totalDelivered: delivered,
            totalRevisits: revisit,
            uniqueAddressesDeliveredCount: uniqueDelivered.size,
            percentage
        };
    }

    /* ---------------- HELPERS ---------------- */

    _id() {
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    _dateKey(date) {
        return date.toISOString().split("T")[0];
    }

    formatDate(dateKey) {
        const d = new Date(dateKey);
        return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
    }

    formatTime(iso) {
        const d = new Date(iso);
        return d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
    }
}

const data = new DataManager(db);
