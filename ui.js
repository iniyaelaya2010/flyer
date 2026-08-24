class UI {
  constructor(database, dataManager) {
    this.db = database;
    this.data = dataManager;
    this.currentPage = 'delivery';
    this.currentUserId = null;
    this.currentSessionId = null;
    this.wakeLock = null;
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    await this.loadInitialState();
    this.updateOnlineStatus();
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());
  }

  cacheElements() {
    this.navButtons = document.querySelectorAll('.nav-btn');
    this.pages = document.querySelectorAll('.page');

    this.currentUserNameEl = document.getElementById('current-user-name');
    this.progressDeliveredEl = document.getElementById('progress-delivered');
    this.progressTotalEl = document.getElementById('progress-total');
    this.progressPercentEl = document.getElementById('progress-percent');
    this.progressFillEl = document.getElementById('progress-fill');
    this.statDeliveredEl = document.getElementById('stat-delivered');
    this.statRevisitEl = document.getElementById('stat-revisit');
    this.statRemainingEl = document.getElementById('stat-remaining');

    this.weeklyTimerTextEl = document.getElementById('weekly-timer-text');
    this.deadlineTextEl = document.getElementById('deadline-text');
    this.onlineStatusEl = document.getElementById('online-status');

    this.nextAddressLine1El = document.getElementById('next-address-line-1');
    this.nextAddressLine2El = document.getElementById('next-address-line-2');
    this.nextAddressLine3El = document.getElementById('next-address-line-3');

    this.toastContainer = document.getElementById('toast-container');
    this.undoNotification = document.getElementById('undo-notification');
    this.undoTextEl = document.getElementById('undo-text');
    this.btnUndo = document.getElementById('btn-undo');

    this.btnDelivered = document.getElementById('btn-delivered');
    this.btnRevisit = document.getElementById('btn-revisit');
    this.btnNote = document.getElementById('btn-note');
    this.btnNavigate = document.getElementById('btn-navigate');

    this.noteModal = document.getElementById('note-modal');
    this.noteModalAddressEl = document.getElementById('note-modal-address');
    this.noteTextEl = document.getElementById('note-text');
    this.noteModalClose = document.getElementById('note-modal-close');
    this.noteModalCancel = document.getElementById('note-modal-cancel');
    this.noteModalSave = document.getElementById('note-modal-save');

    this.usersContainer = document.getElementById('users-container');
    this.newUserNameEl = document.getElementById('new-user-name');
    this.btnAddUser = document.getElementById('btn-add-user');

    this.historyContainer = document.getElementById('history-container');
    this.historyPeriodEl = document.getElementById('history-period');
    this.historyUserEl = document.getElementById('history-user');
    this.historyStatusEl = document.getElementById('history-status');
    this.historyAddressSearchEl = document.getElementById('history-address-search');
    this.historyStartDateEl = document.getElementById('history-start-date');
    this.historyEndDateEl = document.getElementById('history-end-date');
    this.customDateRangeEl = document.getElementById('custom-date-range');
    this.btnApplyHistory = document.getElementById('btn-apply-history');
    this.btnClearHistory = document.getElementById('btn-clear-history');

    this.statisticsContainer = document.getElementById('statistics-container');
    this.periodButtons = document.querySelectorAll('.period-btn');

    this.routeSearchInput = document.getElementById('route-search-input');
    this.addressesContainer = document.getElementById('addresses-container');
    this.btnOriginalOrder = document.getElementById('btn-original-order');
    this.btnNearestFirst = document.getElementById('btn-nearest-first');
    this.btnFarthestFirst = document.getElementById('btn-farthest-first');

    this.importTextEl = document.getElementById('import-text');
    this.btnPreviewImport = document.getElementById('btn-preview-import');
    this.importSummaryEl = document.getElementById('import-summary');

    this.weeklyStartEl = document.getElementById('weekly-start');
    this.weeklyEndEl = document.getElementById('weekly-end');
    this.btnSaveWeekly = document.getElementById('btn-save-weekly');

    this.btnExportBackup = document.getElementById('btn-export-backup');
    this.btnImportBackup = document.getElementById('btn-import-backup');
    this.backupFileEl = document.getElementById('backup-file');
    this.btnExportCsv = document.getElementById('btn-export-csv');

    this.btnToggleWakeLock = document.getElementById('btn-toggle-wake-lock');
    this.wakeLockStatusEl = document.getElementById('wake-lock-status');

    this.continueSessionSection = document.getElementById('continue-session-section');
    this.continueSessionTextEl = document.getElementById('continue-session-text');
    this.btnContinueSession = document.getElementById('btn-continue-session');
  }

  bindEvents() {
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        this.goToPage(page);
      });
    });

    this.btnDelivered.addEventListener('click', () => this.handleDelivered());
    this.btnRevisit.addEventListener('click', () => this.handleRevisit());
    this.btnNote.addEventListener('click', () => this.openNoteModal());
    this.btnNavigate.addEventListener('click', () => this.showToast('Navigation screen not implemented yet (no GPS).', 'info'));

    this.noteModalClose.addEventListener('click', () => this.closeNoteModal());
    this.noteModalCancel.addEventListener('click', () => this.closeNoteModal());
    this.noteModalSave.addEventListener('click', () => this.saveNote());

    this.btnAddUser.addEventListener('click', () => this.addUser());

    this.historyPeriodEl.addEventListener('change', () => this.updateCustomDateVisibility());
    this.btnApplyHistory.addEventListener('click', () => this.updateHistory());
    this.btnClearHistory.addEventListener('click', () => this.clearHistoryFilters());

    this.periodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.periodButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateStatistics(btn.dataset.period);
      });
    });

    this.btnOriginalOrder.addEventListener('click', () => this.loadAddresses('original'));
    this.btnNearestFirst.addEventListener('click', () => this.loadAddresses('nearest'));
    this.btnFarthestFirst.addEventListener('click', () => this.loadAddresses('farthest'));

    this.routeSearchInput.addEventListener('input', () => this.loadAddresses());

    this.btnPreviewImport.addEventListener('click', () => this.previewImport());

    this.btnSaveWeekly.addEventListener('click', () => this.saveWeeklyWindow());

    this.btnExportBackup.addEventListener('click', () => this.exportBackup());
    this.btnImportBackup.addEventListener('click', () => this.backupFileEl.click());
    this.backupFileEl.addEventListener('change', (e) => this.importBackup(e));

    this.btnExportCsv.addEventListener('click', () => this.exportCsv());

    this.btnToggleWakeLock.addEventListener('click', () => this.toggleWakeLock());

    this.btnUndo.addEventListener('click', () => this.handleUndo());

    this.btnContinueSession.addEventListener('click', () => this.resumeSession());
  }

  async loadInitialState() {
    // Load users
    const users = await this.data.getUsers();
    this.renderUsers(users);

    // Active user
    const activeUser = await this.data.getActiveUser();
    if (activeUser) {
      this.currentUserId = activeUser.id;
      this.currentUserNameEl.textContent = activeUser.name;
    } else {
      this.currentUserNameEl.textContent = 'No user';
    }

    // Weekly window
    await this.updateWeeklyTimer();

    // Progress + next address
    await this.updateAll();

    // Continue session
    await this.checkContinueSession();
  }

  async updateAll() {
    await this.updateProgress();
    await this.updateNextAddress();
    await this.updateHistory();
    await this.updateStatistics('today');
    await this.loadAddresses();
  }

  goToPage(pageName) {
    this.currentPage = pageName;
    this.pages.forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageName}`).classList.add('active');

    this.navButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-btn[data-page="${pageName}"]`).classList.add('active');
  }

  updateOnlineStatus() {
    if (navigator.onLine) {
      this.onlineStatusEl.textContent = '🟢 Online';
      this.onlineStatusEl.classList.remove('status-offline');
      this.onlineStatusEl.classList.add('status-online');
    } else {
      this.onlineStatusEl.textContent = '🔴 Offline';
      this.onlineStatusEl.classList.remove('status-online');
      this.onlineStatusEl.classList.add('status-offline');
    }
  }

  async updateProgress() {
    const progress = await this.data.getTodayProgress();
    this.progressDeliveredEl.textContent = progress.delivered;
    this.progressTotalEl.textContent = progress.total;
    this.progressPercentEl.textContent = `${progress.percentage}%`;
    this.progressFillEl.style.width = `${progress.percentage}%`;
    this.statDeliveredEl.textContent = progress.delivered;
    this.statRevisitEl.textContent = progress.revisit;
    this.statRemainingEl.textContent = progress.remaining;
  }

  async updateNextAddress() {
    const addresses = await this.data.getAddresses();
    if (addresses.length === 0) {
      this.nextAddressLine1El.textContent = 'No addresses';
      this.nextAddressLine2El.textContent = '';
      this.nextAddressLine3El.textContent = '';
      return;
    }
    const next = addresses[0]; // simple: first in order
    const parts = next.address.split(',');
    this.nextAddressLine1El.textContent = parts[0] || next.address;
    this.nextAddressLine2El.textContent = parts[1] || '';
    this.nextAddressLine3El.textContent = parts.slice(2).join(', ') || '';
  }

  async handleDelivered() {
    if (!this.currentUserId) {
      this.showToast('Select a user first.', 'warning');
      this.goToPage('users');
      return;
    }
    const addresses = await this.data.getAddresses();
    if (addresses.length === 0) {
      this.showToast('No addresses in route.', 'warning');
      return;
    }
    const next = addresses[0];
    const event = await this.data.recordDelivery(next.id, this.currentUserId);
    this.showToast('Delivered recorded.', 'success');
    this.showUndo('Delivered', event);
    await this.updateAll();
  }

  async handleRevisit() {
    if (!this.currentUserId) {
      this.showToast('Select a user first.', 'warning');
      this.goToPage('users');
      return;
    }
    const addresses = await this.data.getAddresses();
    if (addresses.length === 0) {
      this.showToast('No addresses in route.', 'warning');
      return;
    }
    const next = addresses[0];
    const event = await this.data.recordRevisit(next.id, this.currentUserId);
    this.showToast('Revisit recorded.', 'info');
    this.showUndo('Revisit', event);
    await this.updateAll();
  }

  openNoteModal() {
    this.noteModalAddressEl.textContent = this.nextAddressLine1El.textContent;
    this.noteTextEl.value = '';
    this.noteModal.hidden = false;
  }

  closeNoteModal() {
    this.noteModal.hidden = true;
  }

  async saveNote() {
    const text = this.noteTextEl.value.trim();
    if (!text) {
      this.showToast('Note cannot be empty.', 'warning');
      return;
    }
    const addresses = await this.data.getAddresses();
    if (addresses.length === 0) {
      this.showToast('No addresses in route.', 'warning');
      return;
    }
    const next = addresses[0];
    await this.data.addNote(next.id, this.currentUserId, text);
    this.showToast('Note saved.', 'success');
    this.closeNoteModal();
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  showUndo(action, event) {
    this.undoTextEl.textContent = `${action} recorded for ${event.address}.`;
    this.undoNotification.hidden = false;
    setTimeout(() => {
      this.undoNotification.hidden = true;
    }, 4000);
  }

  async handleUndo() {
    try {
      await this.data.undoLastAction();
      this.showToast('Last action undone.', 'success');
      this.undoNotification.hidden = true;
      await this.updateAll();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  async addUser() {
    const name = this.newUserNameEl.value.trim();
    if (!name) {
      this.showToast('User name cannot be empty.', 'warning');
      return;
    }
    try {
      const user = await this.data.addUser(name);
      this.newUserNameEl.value = '';
      await this.renderUsers(await this.data.getUsers());
      await this.data.setActiveUser(user.id);
      this.currentUserId = user.id;
      this.currentUserNameEl.textContent = user.name;
      this.showToast('User added and set active.', 'success');
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  async renderUsers(users) {
    this.usersContainer.innerHTML = '';
    this.historyUserEl.innerHTML = '<option value="">All</option>';
    users.forEach(user => {
      const item = document.createElement('div');
      item.className = 'user-item';
      item.innerHTML = `
        <div class="user-info">
          <div class="user-name">${user.name}</div>
        </div>
        <div class="user-actions">
          <button class="btn btn-secondary btn-small" data-action="set" data-id="${user.id}">Set Active</button>
          <button class="btn btn-danger btn-small" data-action="delete" data-id="${user.id}">Delete</button>
        </div>
      `;
      this.usersContainer.appendChild(item);

      const opt = document.createElement('option');
      opt.value = user.id;
      opt.textContent = user.name;
      this.historyUserEl.appendChild(opt);
    });

    this.usersContainer.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'set') {
          const user = await this.data.setActiveUser(id);
          this.currentUserId = user.id;
          this.currentUserNameEl.textContent = user.name;
          this.showToast('Active user updated.', 'success');
        } else if (action === 'delete') {
          try {
            await this.data.deleteUser(id);
            this.showToast('User deleted.', 'success');
            await this.renderUsers(await this.data.getUsers());
          } catch (e) {
            this.showToast(e.message, 'error');
          }
        }
      });
    });
  }

  updateCustomDateVisibility() {
    const val = this.historyPeriodEl.value;
    this.customDateRangeEl.hidden = val !== 'custom';
  }

  async updateHistory() {
    // For now, simple: get all history via data.getHistory(filters)
    const filters = {};
    const period = this.historyPeriodEl.value;
    const userId = this.historyUserEl.value || null;
    const status = this.historyStatusEl.value || null;
    const addressSearch = this.historyAddressSearchEl.value.trim() || null;

    if (userId) filters.userId = userId;
    if (status) filters.action = status;
    if (addressSearch) filters.addressSearch = addressSearch;

    // Date filters can be added later
    const events = await this.data.getHistory(filters);
    this.historyContainer.innerHTML = '';

    if (events.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-state-icon">📭</div>
        <h2>No history</h2>
        <p>No delivery events match your filters.</p>
      `;
      this.historyContainer.appendChild(empty);
      return;
    }

    events.forEach(ev => {
      const item = document.createElement('div');
      item.className = 'history-event';
      item.innerHTML = `
        <div class="event-address">${ev.address}</div>
        <span class="event-status ${ev.action}">${ev.action === 'delivered' ? 'Delivered' : 'Revisit'}</span>
        <div class="event-meta">
          <span class="event-user">${ev.userName}</span>
          <span>${this.data.formatDate(ev.dateKey)} • ${this.data.formatTime(ev.timestamp)}</span>
        </div>
      `;
      this.historyContainer.appendChild(item);
    });
  }

  clearHistoryFilters() {
    this.historyPeriodEl.value = 'today';
    this.historyUserEl.value = '';
    this.historyStatusEl.value = '';
    this.historyAddressSearchEl.value = '';
    this.updateCustomDateVisibility();
    this.updateHistory();
  }

  async updateStatistics(period) {
    let range;
    if (period === 'today') {
      const today = this.data._getToday();
      range = { start: today, end: today };
    } else if (period === 'week') {
      range = this.data.getThisWeekRange();
    } else {
      range = this.data.getThisMonthRange();
    }
    const stats = await this.data.getStatisticsForPeriod(range.start, range.end);
    this.statisticsContainer.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-card-title">${period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}</div>
      <div class="stat-card-value">${stats.totalDelivered} delivered</div>
      <div class="stat-card-subtext">
        Revisits: ${stats.totalRevisits}<br>
        Unique addresses delivered: ${stats.uniqueAddressesDeliveredCount}<br>
        Completion: ${stats.percentage}%
      </div>
    `;
    this.statisticsContainer.appendChild(card);
  }

  async loadAddresses(orderMode = 'current') {
    let addresses = await this.data.getAddresses();
    const search = this.routeSearchInput.value.trim().toLowerCase();
    if (search) {
      addresses = addresses.filter(a => a.address.toLowerCase().includes(search));
    }

    // For now, ignore distance sorting (no coordinates yet)
    this.addressesContainer.innerHTML = '';
    if (addresses.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-state-icon">📭</div>
        <h2>No addresses</h2>
        <p>Add or import addresses in the route page.</p>
      `;
      this.addressesContainer.appendChild(empty);
      return;
    }

    addresses.forEach((addr, index) => {
      const card = document.createElement('div');
      card.className = 'address-card';
      card.innerHTML = `
        <div class="address-order">#${index + 1}</div>
        <div class="address-text">${addr.address}</div>
        <div class="address-actions">
          <button class="btn btn-secondary btn-small" data-action="edit" data-id="${addr.id}">Edit</button>
          <button class="btn btn-warning btn-small" data-action="deactivate" data-id="${addr.id}">Deactivate</button>
        </div>
      `;
      this.addressesContainer.appendChild(card);
    });

    this.addressesContainer.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'edit') {
          const addr = await this.data.getAddress(id);
          const newText = prompt('Edit address:', addr.address);
          if (newText !== null) {
            await this.data.updateAddress(id, newText);
            this.showToast('Address updated.', 'success');
            await this.loadAddresses();
          }
        } else if (action === 'deactivate') {
          await this.data.deleteAddress(id);
          this.showToast('Address deactivated.', 'success');
          await this.loadAddresses();
        }
      });
    });
  }

  previewImport() {
    const text = this.importTextEl.value;
    if (!text.trim()) {
      this.showToast('Paste addresses first.', 'warning');
      return;
    }
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const unique = new Set(lines);
    const duplicates = lines.length - unique.size;
    this.importSummaryEl.textContent = `${lines.length} addresses found. ${duplicates} possible duplicates.`;
    if (lines.length > 0) {
      this.showToast('Import preview ready. Click to import.', 'info');
      // For now, auto-import
      this.data.importAddresses(text).then(() => {
        this.showToast('Addresses imported.', 'success');
        this.importTextEl.value = '';
        this.loadAddresses();
      }).catch(e => {
        this.showToast(e.message, 'error');
      });
    }
  }

  async saveWeeklyWindow() {
    const start = this.weeklyStartEl.value;
    const end = this.weeklyEndEl.value;
    if (!start || !end) {
      this.showToast('Set both start and end.', 'warning');
      return;
    }
    await this.db.setSetting('weeklyStart', start);
    await this.db.setSetting('weeklyEnd', end);
    this.showToast('Weekly window saved.', 'success');
    await this.updateWeeklyTimer();
  }

  async updateWeeklyTimer() {
    const startStr = await this.db.getSetting('weeklyStart');
    const endStr = await this.db.getSetting('weeklyEnd');
    if (!startStr || !endStr) {
      this.weeklyTimerTextEl.textContent = 'Delivery window not set.';
      this.deadlineTextEl.textContent = '';
      return;
    }
    const tz = 'America/Vancouver';
    const start = new Date(startStr);
    const end = new Date(endStr);
    const now = new Date();

    if (now < start) {
      const diff = start - now;
      this.weeklyTimerTextEl.textContent = `Delivery starts in ${this.formatDuration(diff)}`;
      this.deadlineTextEl.textContent = '';
    } else if (now >= start && now <= end) {
      const diff = end - now;
      this.weeklyTimerTextEl.textContent = `${this.formatDuration(diff)} remaining`;
      this.deadlineTextEl.textContent = 'Delivery window open.';
    } else {
      this.weeklyTimerTextEl.textContent = 'DELIVERY WINDOW CLOSED';
      this.deadlineTextEl.textContent = 'Next period will start at the next configured window.';
    }
  }

  formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    return parts.join(' ') || '0m';
  }

  async exportBackup() {
    const users = await this.db.getAll('users');
    const addresses = await this.db.getAll('addresses');
    const sessions = await this.db.getAll('sessions');
    const events = await this.db.getAll('events');
    const notes = await this.db.getAll('notes');
    const settings = await this.db.getAll('settings');

    const backup = { users, addresses, sessions, events, notes, settings };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flyer-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    const backup = JSON.parse(text);
    if (!confirm('Restore backup? This will overwrite current data.')) return;

    const stores = ['users', 'addresses', 'sessions', 'events', 'notes', 'settings'];
    for (const store of stores) {
      const all = await this.db.getAll(store);
      for (const item of all) {
        await this.db.delete(store, item.id || item.key);
      }
    }

    for (const user of backup.users || []) await this.db.write('users', user);
    for (const addr of backup.addresses || []) await this.db.write('addresses', addr);
    for (const s of backup.sessions || []) await this.db.write('sessions', s);
    for (const e of backup.events || []) await this.db.write('events', e);
    for (const n of backup.notes || []) await this.db.write('notes', n);
    for (const set of backup.settings || []) await this.db.write('settings', set);

    this.showToast('Backup restored.', 'success');
    await this.updateAll();
  }

  async exportCsv() {
    const events = await this.db.getAll('events');
    if (events.length === 0) {
      this.showToast('No events to export.', 'warning');
      return;
    }
    const rows = [
      ['#', 'Address', 'Status', 'Date', 'Time', 'User']
    ];
    events.forEach((ev, i) => {
      const date = this.data.formatDate(ev.dateKey);
      const time = this.data.formatTime(ev.timestamp);
      rows.push([i + 1, ev.address, ev.action === 'delivered' ? 'Delivered' : 'Revisit', date, time, ev.userName]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flyer-week.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async toggleWakeLock() {
    if (!('wakeLock' in navigator)) {
      this.showToast('Wake lock not supported on this browser.', 'warning');
      return;
    }
    try {
      if (this.wakeLock) {
        await this.wakeLock.release();
        this.wakeLock = null;
        this.wakeLockStatusEl.textContent = 'Screen awake: off';
      } else {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLockStatusEl.textContent = 'Screen awake: on';
      }
    } catch (e) {
      this.showToast('Failed to toggle wake lock.', 'error');
    }
  }

  async checkContinueSession() {
    // Simple version: if there are events today, offer "continue"
    const today = this.data._getToday();
    const events = await this.data.getEventsForDate(today);
    if (events.length === 0) {
      this.continueSessionSection.hidden = true;
      return;
    }
    const delivered = events.filter(e => e.action === 'delivered').length;
    const addresses = await this.data.getAddresses();
    this.continueSessionTextEl.textContent = `You have ${delivered} / ${addresses.length} delivered today. Continue?`;
    this.continueSessionSection.hidden = false;
  }

  async resumeSession() {
    this.continueSessionSection.hidden = true;
    this.showToast('Session resumed.', 'success');
    this.goToPage('delivery');
  }
}

const ui = new UI(db, data);
