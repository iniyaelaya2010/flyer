/**
 * Main Application Module
 * Orchestrates initialization and provides global API
 */

class Application {
    constructor() {
        this.db = db;
        this.data = data;
        this.ui = ui;
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            console.log('Initializing Flyer Delivery Tracker...');
            
            // Initialize database
            await this.db.init();
            console.log('Database initialized');

            // Initialize UI
            await this.ui.init();
            console.log('UI initialized');

            // Check if this is first run
            const hasUsers = await this.db.getAll('users');
            if (hasUsers.length === 0) {
                this.ui.showToast('Welcome! Add a user and import your address list to get started.', 'info');
                this.ui.goToPage('settings');
            } else {
                this.ui.goToPage('route');
            }

            console.log('Application ready');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.ui.showToast('Failed to initialize: ' + error.message, 'error');
        }
    }

    /**
     * Navigate to page
     */
    goToPage(pageName) {
        this.ui.goToPage(pageName);
    }

    /**
     * Close delivery modal
     */
    closeDeliveryModal() {
        this.ui.closeDeliveryModal();
    }

    /**
     * Close addresses modal
     */
    closeAddressesModal() {
        this.ui.closeAddressesModal();
    }
}

// Initialize application when DOM is ready
let app;

document.addEventListener('DOMContentLoaded', async () => {
    app = new Application();
    await app.init();
});

// Handle visibility change to refresh data
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && app) {
        await app.ui.updateAll();
    }
});
