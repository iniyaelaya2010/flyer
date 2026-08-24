class Application {
  constructor() {
    this.db = db;
    this.data = data;
    this.ui = ui;
  }

  async init() {
    try {
      await this.db.init();
      await this.ui.init();
    } catch (e) {
      console.error(e);
      alert('Failed to initialize Flyer Tracker: ' + e.message);
    }
  }
}

let app;
document.addEventListener('DOMContentLoaded', async () => {
  app = new Application();
  await app.init();
});
