/**
 * UI Module
 * Handles all DOM updates and UI interactions
 */

class UIManager {
    constructor(dataManager) {
        this.data = dataManager;
        this.currentDateKey = null;
        this.undoTimeout = null;
    }

    /**
     * Initialize UI
     */
    async init() {
        this.setupEventListeners();
        await this.updateAll();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.goToPage(page);
            });
        });

        // Route page
        document.getElementById('user-select').addEventListener('change', async (e) => {
            if (e.target.value) {
                await this.data.setActiveUser(e.target.value);
                await this.updateAll();
            }
        });

        document.getElementById('address-search').addEventListener('input', async (e) => {
            await this.updateAddressesList(e.target.value);
        });

        // Users page
        document.getElementById('add-user-btn').addEventListener('click', async () => {
            const input = document.getElementById('new-user-input');
            const name = input.value;
            if (!name.trim()) return;

            try {
                await this.data.addUser(name);
                input.value = '';
                await this.updateAll();
                this.showToast('User added successfully', 'success');
            } catch (error) {
                this.showToast(error.message, 'error');
            }
        });

        // History page filters
        document.getElementById('apply-filters').addEventListener('click', async () => {
            await this.updateHistory();
        });

        document.getElementById('clear-filters').addEventListener('click', async () => {
            document.getElementById('filter-user').value = '';
            document.getElementById('filter-date-range').value = '';
            document.getElementById('filter-status').value = '';
            document.getElementById('filter-address').value = '';
            document.getElementById('filter-start-date').value = '';
            document.getElementById('filter-end-date').value = '';
            document.getElementById('custom-date-range').style.display = 'none';
            await this.updateHistory();
        });

        document.getElementById('filter-date-range').addEventListener('change', (e) => {
            const customRange = document.getElementById('custom-date-range');
            customRange.style.display = e.target.value === 'custom' ? 'grid' : 'none';
        });

        // Statistics page
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.updateStatistics(e.currentTarget.dataset.period);
            });
        });

        // Settings page
        document.getElementById('import-addresses-btn').addEventListener('click', async () => {
            await this.handleAddressImport();
        });

        document.getElementById('view-addresses-btn').addEventListener('click', () => {
            this.openAddressesModal();
        });

        document.getElementById('add-address-btn').addEventListener('click', async () => {
            await this.handleAddAddress();
        });

        document.getElementById('reset-route-btn').addEventListener('click', async () => {
            this.showConfirmation(
                'Reset Route',
                'Delete all addresses and start over?',
                async () => {
                    await this.data.resetRoute();
                    await this.updateAll();
                    this.showToast('Route reset successfully', 'success');
                }
            );
        });

        document.getElementById('backup-btn').addEventListener('click', async () => {
            await this.handleBackup();
        });

        document.getElementById('restore-btn').addEventListener('click', () => {
            document.getElementById('restore-file').click();
        });

        document.getElementById('restore-file').addEventListener('change', async (e) => {
            await this.handleRestore(e);
        });

        document.getElementById('export-csv-btn').addEventListener('click', async () => {
            await this.handleExportCSV();
        });

        document.getElementById('delete-all-btn').addEventListener('click', async () => {
            this.showConfirmation(
                'Delete All Data',
                'This will permanently delete all users, addresses, and delivery history. This cannot be undone.',
                async () => {
                    try {
                        await this.data.db.clearMultiple(['users', 'addresses', 'deliveryEvents', 'notes', 'settings']);
                        await this.updateAll();
                        this.showToast('All data deleted', 'success');
                    } catch (error) {
                        this.showToast('Failed to delete data: ' + error.message, 'error');
                    }
                }
            );
        });

        // Delivery modal
        document.getElementById('modal-close-btn').addEventListener('click', () => {
            this.closeDeliveryModal();
        });

        document.getElementById('modal-delivered-btn').addEventListener('click', async () => {
            await this.handleDeliveryAction('delivered');
        });

        document.getElementById('modal-revisit-btn').addEventListener('click', async () => {
            await this.handleDeliveryAction('revisit');
        });

        // Addresses modal
        document.getElementById('addresses-modal').addEventListener('click', (e) => {
            if (e.target.id === 'addresses-modal') {
                this.closeAddressesModal();
            }
        });
    }

    /**
     * Navigate to page
     */
    goToPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Remove active class from nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected page
        const page = document.getElementById(`page-${pageName}`);
        if (page) {
            page.classList.add('active');
        }

        // Mark nav button as active
        const navBtn = document.querySelector(`.nav-btn[data-page="${pageName}"]`);
        if (navBtn) {
            navBtn.classList.add('active');
        }

        // Update page-specific content
        if (pageName === 'history') {
            this.updateHistory();
        } else if (pageName === 'statistics') {
            this.updateStatistics('today');
        } else if (pageName === 'users') {
            this.updateUsers();
        }
    }

    /**
     * Update everything
     */
    async updateAll() {
        try {
            this.currentDateKey = this.data._getToday();
            await this.updateUserSelector();
            await this.updateProgressSection();
            await this.updateAddressesList();
            await this.updateSettings();
            await this.updateUsers();
        } catch (error) {
            console.error('Error updating UI:', error);
            this.showToast('Failed to update: ' + error.message, 'error');
        }
    }

    /**
     * Update user selector dropdown
     */
    async updateUserSelector() {
        const users = await this.data.getUsers();
        const select = document.getElementById('user-select');
        const activeUser = await this.data.getActiveUser();

        select.innerHTML = '<option value="">-- Select User --</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            select.appendChild(option);
        });

        if (activeUser) {
            select.value = activeUser.id;
        }
    }

    /**
     * Update progress section
     */
    async updateProgressSection() {
        const progress = await this.data.getTodayProgress();

        document.getElementById('delivered-count').textContent = progress.delivered;
        document.getElementById('total-count').textContent = progress.total;
        document.getElementById('progress-fill').style.width = progress.percentage + '%';
        document.getElementById('progress-percentage').textContent = progress.percentage + '%';
        document.getElementById('stat-delivered').textContent = progress.delivered;
        document.getElementById('stat-revisit').textContent = progress.revisit;
        document.getElementById('stat-remaining').textContent = progress.remaining;
    }

    /**
     * Update addresses list
     */
    async updateAddressesList(searchTerm = '') {
        const addresses = await this.data.getAddresses();
        const container = document.getElementById('addresses-container');
        const emptyState = document.getElementById('route-empty-state');

        if (addresses.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        const searchLower = searchTerm.toLowerCase();
        const filtered = addresses.filter(addr => 
            !searchTerm || addr.address.toLowerCase().includes(searchLower)
        );

        container.innerHTML = '';

        for (const address of filtered) {
            const status = await this.data.getAddressStatus(address.id, this.currentDateKey);
            const card = this.createAddressCard(address, status);
            container.appendChild(card);
        }
    }

    /**
     * Create address card element
     */
    createAddressCard(address, status) {
        const card = document.createElement('div');
        card.className = 'address-card';
        card.onclick = () => this.openDeliveryModal(address.id);

        const orderDiv = document.createElement('div');
        orderDiv.className = 'address-order';
        orderDiv.textContent = `#${address.order}`;

        const textDiv = document.createElement('div');
        textDiv.className = 'address-text';
        textDiv.textContent = address.address;

        const statusDiv = document.createElement('div');
        statusDiv.className = `address-status ${status}`;
        statusDiv.textContent = this.getStatusLabel(status);

        card.appendChild(orderDiv);
        card.appendChild(textDiv);
        card.appendChild(statusDiv);

        return card;
    }

    /**
     * Get status label text
     */
    getStatusLabel(status) {
        const labels = {
            'not-started': 'Not Started',
            'delivered': '✓ Delivered',
            'revisit': '↻ Revisit'
        };
        return labels[status] || 'Unknown';
    }

    /**
     * Open delivery modal
     */
    async openDeliveryModal(addressId) {
        const address = await this.data.getAddress(addressId);
        if (!address) return;

        const modal = document.getElementById('delivery-modal');
        document.getElementById('modal-address-order').textContent = `#${address.order}`;
        document.getElementById('modal-address-text').textContent = address.address;

        // Show status and history
        const status = await this.data.getAddressStatus(address.id, this.currentDateKey);
        const events = await this.data.getEventsForDate(this.currentDateKey);
        const addressEvents = events.filter(e => e.addressId === address.id);
        const notes = await this.data.getNotesForAddress(address.id);

        const statusDisplay = document.getElementById('modal-status-display');
        statusDisplay.innerHTML = `<div class="address-status ${status}">${this.getStatusLabel(status)}</div>`;

        const historyDiv = document.getElementById('modal-history');
        historyDiv.innerHTML = '';

        if (addressEvents.length > 0) {
            historyDiv.innerHTML = '<div style="font-weight: 600; margin-bottom: 8px;">Today\'s History:</div>';
            addressEvents.forEach(event => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <div class="history-status">${event.action === 'delivered' ? '✓ Delivered' : '↻ Revisit'}</div>
                    <div class="history-time">${this.data.formatTime(event.timestamp)} by ${event.userName}</div>
                `;
                historyDiv.appendChild(historyItem);
            });
        }

        // Clear note input
        document.getElementById('modal-note-input').value = '';

        // Store current address ID for actions
        modal.dataset.addressId = addressId;
        modal.style.display = 'flex';
    }

    /**
     * Close delivery modal
     */
    closeDeliveryModal() {
        document.getElementById('delivery-modal').style.display = 'none';
    }

    /**
     * Handle delivery action
     */
    async handleDeliveryAction(action) {
        const modal = document.getElementById('delivery-modal');
        const addressId = modal.dataset.addressId;
        const activeUser = await this.data.getActiveUser();

        if (!activeUser) {
            this.showToast('Please select a user first', 'warning');
            return;
        }

        const note = document.getElementById('modal-note-input').value;

        try {
            if (action === 'delivered') {
                await this.data.recordDelivery(addressId, activeUser.id, note);
            } else if (action === 'revisit') {
                await this.data.recordRevisit(addressId, activeUser.id, note);
            }

            this.closeDeliveryModal();
            await this.updateAll();
            
            this.showToast(`Address marked as ${action}`, 'success');
            this.showUndoNotification();
        } catch (error) {
            this.showToast('Failed to record action: ' + error.message, 'error');
        }
    }

    /**
     * Show undo notification
     */
    showUndoNotification() {
        const container = document.getElementById('toast-container');
        const undoDiv = document.createElement('div');
        undoDiv.className = 'undo-notification';
        undoDiv.innerHTML = `
            <span>Action recorded</span>
            <button class="btn btn-small" id="undo-btn-temp">UNDO</button>
        `;
        container.appendChild(undoDiv);

        const undoBtn = undoDiv.querySelector('#undo-btn-temp');
        let timeLeft = 4;
        let canUndo = true;

        const timer = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(timer);
                undoDiv.style.animation = 'slideDown 0.3s ease forwards';
                setTimeout(() => undoDiv.remove(), 300);
                canUndo = false;
            }
        }, 1000);

        undoBtn.addEventListener('click', async () => {
            if (!canUndo) return;
            clearInterval(timer);
            canUndo = false;

            try {
                await this.data.undoLastAction();
                await this.updateAll();
                this.showToast('Action undone', 'success');
                undoDiv.remove();
            } catch (error) {
                this.showToast('Failed to undo: ' + error.message, 'error');
                undoDiv.remove();
            }
        });
    }

    /**
     * Open addresses management modal
     */
    async openAddressesModal() {
        const addresses = await this.data.getAllAddresses();
        const activeAddresses = addresses.filter(a => a.active);

        const list = document.getElementById('addresses-edit-list');
        list.innerHTML = '';

        activeAddresses.forEach(address => {
            const item = document.createElement('div');
            item.className = 'address-item';
            item.style.cssText = `
                background-color: white;
                border: 1px solid #d5dbdb;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            const textDiv = document.createElement('div');
            textDiv.style.cssText = 'flex: 1;';
            textDiv.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px;">
                    #${address.order} - ${address.address}
                </div>
                <input type="text" class="form-input" style="font-size: 13px;" placeholder="Edit address" value="${address.address}" data-address-id="${address.id}" style="margin-bottom: 8px;">
            `;

            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.cssText = 'display: flex; gap: 8px;';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-small btn-primary';
            editBtn.textContent = '✓ Save';
            editBtn.onclick = async () => {
                const input = textDiv.querySelector('input');
                try {
                    await this.data.updateAddress(address.id, input.value);
                    await this.openAddressesModal();
                    this.showToast('Address updated', 'success');
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-small btn-danger';
            deleteBtn.textContent = '✕ Delete';
            deleteBtn.onclick = async () => {
                try {
                    await this.data.deleteAddress(address.id);
                    await this.openAddressesModal();
                    this.showToast('Address deleted', 'success');
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            };

            buttonsDiv.appendChild(editBtn);
            buttonsDiv.appendChild(deleteBtn);

            item.appendChild(textDiv);
            item.appendChild(buttonsDiv);
            list.appendChild(item);
        });

        document.getElementById('addresses-modal').style.display = 'flex';
    }

    /**
     * Close addresses modal
     */
    closeAddressesModal() {
        document.getElementById('addresses-modal').style.display = 'none';
    }

    /**
     * Handle address import
     */
    async handleAddressImport() {
        const fileInput = document.getElementById('import-file');
        const pasteArea = document.getElementById('paste-addresses');

        let text = '';

        if (fileInput.files.length > 0) {
            text = await fileInput.files[0].text();
        } else {
            text = pasteArea.value;
        }

        if (!text.trim()) {
            this.showToast('No addresses to import', 'warning');
            return;
        }

        try {
            const imported = await this.data.importAddresses(text);
            fileInput.value = '';
            pasteArea.value = '';
            await this.updateAll();
            this.showToast(`Imported ${imported.length} addresses`, 'success');
        } catch (error) {
            this.showToast('Failed to import: ' + error.message, 'error');
        }
    }

    /**
     * Handle add address
     */
    async handleAddAddress() {
        const input = document.getElementById('add-address-input');
        const address = input.value;

        if (!address.trim()) {
            this.showToast('Address cannot be empty', 'warning');
            return;
        }

        try {
            await this.data.addAddress(address);
            input.value = '';
            await this.openAddressesModal();
            this.showToast('Address added', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    /**
     * Update history
     */
    async updateHistory() {
        const userFilter = document.getElementById('filter-user').value;
        const dateRangeFilter = document.getElementById('filter-date-range').value;
        const statusFilter = document.getElementById('filter-status').value;
        const addressSearch = document.getElementById('filter-address').value;

        const filters = {};

        if (userFilter) filters.userId = userFilter;
        if (statusFilter) filters.action = statusFilter;
        if (addressSearch) filters.addressSearch = addressSearch;

        // Handle date range
        if (dateRangeFilter === 'today') {
            filters.dateKey = this.data._getToday();
        } else if (dateRangeFilter === 'week') {
            const range = this.data.getThisWeekRange();
            filters.startDate = range.start;
            filters.endDate = range.end;
        } else if (dateRangeFilter === 'month') {
            const range = this.data.getThisMonthRange();
            filters.startDate = range.start;
            filters.endDate = range.end;
        } else if (dateRangeFilter === 'custom') {
            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;
            if (startDate && endDate) {
                filters.startDate = startDate;
                filters.endDate = endDate;
            }
        }

        const events = await this.data.getHistory(filters);
        const container = document.getElementById('history-container');
        const emptyState = document.getElementById('history-empty-state');

        if (events.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = '';

        events.forEach(event => {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'history-event';
            eventDiv.innerHTML = `
                <div class="event-address">${event.address}</div>
                <div class="event-status ${event.action}">${event.action === 'delivered' ? '✓ Delivered' : '↻ Revisit'}</div>
                <div class="event-meta">
                    <span class="event-user">${event.userName}</span>
                    <span>${this.data.formatDateTime(event.timestamp)}</span>
                </div>
            `;
            container.appendChild(eventDiv);
        });

        // Populate filter dropdowns
        this.updateFilterDropdowns();
    }

    /**
     * Update filter dropdowns
     */
    async updateFilterDropdowns() {
        const users = await this.data.getUsers();
        const userSelect = document.getElementById('filter-user');
        const currentValue = userSelect.value;

        userSelect.innerHTML = '<option value="">All Users</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            userSelect.appendChild(option);
        });

        userSelect.value = currentValue;
    }

    /**
     * Update statistics
     */
    async updateStatistics(period) {
        let startDate, endDate;

        if (period === 'today') {
            startDate = this.data._getToday();
            endDate = this.data._getToday();
        } else if (period === 'week') {
            const range = this.data.getThisWeekRange();
            startDate = range.start;
            endDate = range.end;
        } else if (period === 'month') {
            const range = this.data.getThisMonthRange();
            startDate = range.start;
            endDate = range.end;
        }

        const stats = await this.data.getStatisticsForPeriod(startDate, endDate);
        const container = document.getElementById('statistics-container');
        const emptyState = document.getElementById('statistics-empty-state');

        if (stats.uniqueAddressesDeliveredCount === 0 && stats.totalRevisits === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = '';

        // Main stats
        const mainStats = `
            <div class="stat-card">
                <div class="stat-card-title">Delivered</div>
                <div class="stat-card-value">${stats.uniqueAddressesDeliveredCount}</div>
                <div class="stat-card-subtext">${stats.percentage}% Complete</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-title">Revisits</div>
                <div class="stat-card-value">${stats.totalRevisits}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-title">Total Events</div>
                <div class="stat-card-value">${stats.totalEvents}</div>
            </div>
        `;

        container.innerHTML = mainStats;

        // User breakdown
        if (Object.keys(stats.deliveriesByUser).length > 0) {
            const userBreakdown = document.createElement('div');
            userBreakdown.style.cssText = 'margin-top: 20px;';
            userBreakdown.innerHTML = '<h3 style="margin-bottom: 12px; color: var(--primary-color);">Deliveries by User</h3>';
            
            const userGrid = document.createElement('div');
            userGrid.className = 'user-breakdown';

            Object.entries(stats.deliveriesByUser).forEach(([userId, userStats]) => {
                const userCard = document.createElement('div');
                userCard.className = 'user-stat-card';
                userCard.innerHTML = `
                    <div class="user-stat-name">${userStats.name}</div>
                    <div class="user-stat-item">Delivered: <strong>${userStats.delivered}</strong></div>
                    <div class="user-stat-item">Revisits: <strong>${userStats.revisits}</strong></div>
                `;
                userGrid.appendChild(userCard);
            });

            userBreakdown.appendChild(userGrid);
            container.appendChild(userBreakdown);
        }
    }

    /**
     * Update users section
     */
    async updateUsers() {
        const users = await this.data.getUsers();
        const container = document.getElementById('users-container');
        const emptyState = document.getElementById('users-empty-state');

        if (users.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = '';

        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';

            const info = document.createElement('div');
            info.className = 'user-info';
            info.innerHTML = `
                <div class="user-name">${user.name}</div>
                <div style="font-size: 12px; color: var(--medium-gray);">Created: ${this.data.formatDate(user.createdAt.split('T')[0])}</div>
            `;

            const actions = document.createElement('div');
            actions.className = 'user-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-small btn-primary';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => {
                const newName = prompt(`Edit user name:`, user.name);
                if (newName && newName.trim()) {
                    this.data.updateUser(user.id, newName).then(() => {
                        this.updateUsers();
                        this.showToast('User updated', 'success');
                    }).catch(err => this.showToast(err.message, 'error'));
                }
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-small btn-danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = async () => {
                try {
                    await this.data.deleteUser(user.id);
                    await this.updateAll();
                    this.showToast('User deleted', 'success');
                } catch (error) {
                    this.showConfirmation(
                        'Delete User',
                        `This user has delivery history. Are you sure you want to delete "${user.name}"?`,
                        async () => {
                            // Force delete by clearing user history first
                            const events = await this.data.db.getByIndex('deliveryEvents', 'userId', user.id);
                            for (const event of events) {
                                await this.data.db.delete('deliveryEvents', event.id);
                            }
                            const notes = await this.data.db.getByIndex('notes', 'userId', user.id);
                            for (const note of notes) {
                                await this.data.db.delete('notes', note.id);
                            }
                            await this.data.deleteUser(user.id);
                            await this.updateAll();
                            this.showToast('User deleted', 'success');
                        }
                    );
                }
            };

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            userItem.appendChild(info);
            userItem.appendChild(actions);
            container.appendChild(userItem);
        });
    }

    /**
     * Update settings page
     */
    async updateSettings() {
        const addresses = await this.data.getAddresses();
        document.getElementById('route-count').textContent = addresses.length;
    }

    /**
     * Handle backup
     */
    async handleBackup() {
        try {
            const backup = await this.data.db.exportData();
            const json = JSON.stringify(backup, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flyer-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showToast('Backup created successfully', 'success');
        } catch (error) {
            this.showToast('Backup failed: ' + error.message, 'error');
        }
    }

    /**
     * Handle restore
     */
    async handleRestore(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const backup = JSON.parse(text);

            this.showConfirmation(
                'Restore Backup',
                'This will replace all current data with the backup. This cannot be undone.',
                async () => {
                    try {
                        await this.data.db.importData(backup);
                        await this.updateAll();
                        this.showToast('Backup restored successfully', 'success');
                        event.target.value = '';
                    } catch (error) {
                        this.showToast('Restore failed: ' + error.message, 'error');
                    }
                }
            );
        } catch (error) {
            this.showToast('Invalid backup file: ' + error.message, 'error');
        }
    }

    /**
     * Handle CSV export
     */
    async handleExportCSV() {
        try {
            const events = await this.data.getHistory();
            
            let csv = 'Date,Time,User,Address,Status,Note\n';

            for (const event of events) {
                const date = this.data.formatDate(event.dateKey);
                const time = this.data.formatTime(event.timestamp);
                const notes = await this.data.getNotesForAddress(event.addressId);
                const noteText = notes.length > 0 ? notes[0].text : '';

                const row = [
                    date,
                    time,
                    event.userName,
                    `"${event.address.replace(/"/g, '""')}"`,
                    event.action === 'delivered' ? 'Delivered' : 'Revisit',
                    `"${noteText.replace(/"/g, '""')}"`
                ].join(',');

                csv += row + '\n';
            }

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flyer-tracker-history-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            this.showToast('CSV exported successfully', 'success');
        } catch (error) {
            this.showToast('Export failed: ' + error.message, 'error');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Show confirmation dialog
     */
    showConfirmation(title, message, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;

        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-no-btn');

        const handleYes = () => {
            modal.style.display = 'none';
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
            onConfirm();
        };

        const handleNo = () => {
            modal.style.display = 'none';
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
        };

        yesBtn.addEventListener('click', handleYes);
        noBtn.addEventListener('click', handleNo);

        modal.style.display = 'flex';
    }
}

// Initialize UI manager
const ui = new UIManager(data);
