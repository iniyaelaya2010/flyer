# Flyer Delivery Tracker

A mobile-first, offline-capable web application for tracking home deliveries of flyers. No servers, no backend, no internet required.

## Features

### Core Tracking
- **Simple User System**: Add and select users by name only (no passwords, no email)
- **Address Management**: Import, add, edit, delete, and reorder delivery addresses
- **Delivery Tracking**: Mark addresses as delivered or revisited with automatic timestamp
- **Progress Tracking**: Real-time progress bar and statistics
- **Address History**: Complete audit trail of all delivery events
- **Notes**: Optional notes on addresses (gate locked, left at door, etc.)
- **Undo**: Quick undo functionality (5-minute window)

### History & Reporting
- **Complete History**: All delivery events are permanently stored
- **Advanced Filters**: Filter by user, date, week, month, status, address, and time range
- **Statistics**: Daily, weekly, and monthly breakdowns with user statistics
- **CSV Export**: Export history to CSV for spreadsheet analysis
- **Data Preservation**: History is preserved when addresses are edited or re-delivered

### Data Management
- **Backup & Restore**: Export all data to JSON and restore from backup
- **Offline Support**: Works completely offline using IndexedDB and Service Worker
- **PWA Support**: Installable as a standalone app on mobile devices
- **No Cloud Dependency**: All data stays on your device

## How It Works

### Storage
- **IndexedDB**: All data is stored locally in your browser's IndexedDB database
- **No Internet Required**: After the initial app load, the app works completely offline
- **Service Worker**: Caches all application files for offline access
- **PWA Ready**: Can be installed as an app on your home screen

### Data Structure
The app maintains a clear separation between:
- **Master Route**: One list of addresses with stable order
- **Delivery Events**: Historical record of all deliveries (never deleted)
- **Users**: Simple name-based user profiles
- **Notes**: Optional additional information

### Progress Calculation
Progress is calculated from actual delivery events, not from visual state:
- An address counts as "delivered" only if it has a delivery event for that date
- Multiple events on the same address are all preserved
- Revisits don't count toward completion unless the address is also delivered
- Progress resets daily but history is permanent

## Getting Started

### First Run

1. **Add a User**
   - Go to Users page
   - Enter your name (or any identifier)
   - Click "Add User"

2. **Load Your Address List**
   - Go to Settings → Address Management → Import Addresses
   - Choose one of two methods:
     - **File Upload**: Select a CSV or text file
     - **Paste**: Paste addresses directly, one per line
   - Click "Import Addresses"

3. **Start Delivering**
   - Select your user from the dropdown
   - Navigate to Route page
   - Tap addresses to mark delivered or revisited

### Adding Addresses

**Manual Entry**:
1. Settings → View & Edit Addresses
2. Enter address and click "Add"

**Import**:
1. Settings → Import Addresses
2. Upload CSV/text file or paste addresses
3. Each line becomes one address

**Format**: Any text format is fine. Examples:
```
101 Oak Street
105 Oak Street, Apt 2
109 Oak Street
```

### Recording Deliveries

1. Make sure a user is selected in the dropdown
2. Tap an address card to open the delivery screen
3. Click "✓ DELIVERED" to mark delivered with automatic timestamp
4. Or click "↻ REVISIT" if the house needs a revisit
5. Optionally add a note (gate locked, etc.)
6. Click "UNDO" within 5 minutes to undo the action

### Viewing History

1. Go to History page
2. Use filters to narrow down events:
   - **User**: See deliveries by specific user
   - **Date Range**: Today, this week, this month, or custom
   - **Status**: Delivered or revisit
   - **Address**: Search by address
3. History shows all events with timestamp, user, and status

### Statistics

1. Go to Statistics page
2. Choose period: Today, This Week, or This Month
3. View:
   - Total addresses delivered
   - Completion percentage
   - Number of revisits
   - Breakdown by user

### Managing Data

**Backup**:
1. Settings → Data Management → Backup All Data
2. A JSON file will download
3. Store securely (USB drive, cloud storage, email, etc.)

**Restore**:
1. Settings → Data Management → Restore from Backup
2. Select your backup JSON file
3. Confirm the restore
4. All data will be replaced with the backup

**Export CSV**:
1. Settings → Data Management → Export CSV
2. A CSV file will download with all delivery history
3. Open in Excel, Google Sheets, etc.

**Reset Route**:
1. Settings → Address Management → Reset Route
2. Confirm deletion
3. All addresses will be removed (history preserved)

## Mobile-First Design

The app is optimized for one-handed use while walking:
- Large touch targets (recommended outdoor use)
- High contrast colors
- Minimal animations
- Fast navigation
- No typing required for deliveries

Works on:
- iOS Safari (iPhone, iPad)
- Android Chrome
- Any modern mobile browser
- Tablets
- Desktops

## Offline Operation

### Initial Setup
1. Visit the app URL in your browser
2. The app loads and caches all files
3. You can now use it offline

### Offline Use
- All deliveries are recorded to IndexedDB
- No internet connection required
- Changes sync to browser storage immediately
- Backup and restore work offline

### Going Online
- When internet returns, the app continues to work normally
- No special sync needed
- All data remains local to your device

## Advanced Features

### Address Search
- Real-time search on the Route page
- Search by address number or street name
- Filters visible addresses instantly

### Filters
The History page has powerful filtering:
- **User Filter**: See one person's deliveries
- **Date Filter**: Today, week, month, or custom range
- **Status Filter**: Delivered or revisit
- **Address Search**: Find deliveries for specific address
- **Time Range**: Custom start and end dates

### Undo Feature
- After marking delivered or revisit, click UNDO
- Removes the event and any associated notes
- Window: 5 minutes
- No confirmation required during the window

### Notes
- Optional note field when marking delivery
- Examples: "Gate locked", "Left at door", "No mailbox"
- Notes are preserved in history
- Exported in CSV

## Deployment to GitHub Pages

### Prerequisites
- GitHub account
- Repository created (e.g., `username/flyer-tracker`)

### Steps

1. **Clone/Fork the Repository**
   ```bash
   git clone https://github.com/username/flyer-tracker.git
   cd flyer-tracker
   ```

2. **Ensure Files Are in Root**
   - `index.html`
   - `styles.css`
   - `app.js`
   - `db.js`
   - `data.js`
   - `ui.js`
   - `service-worker.js`
   - `manifest.json`
   - `README.md`

3. **Enable GitHub Pages**
   - Go to repository Settings
   - Navigate to Pages
   - Set "Source" to "Deploy from a branch"
   - Select "main" branch and root folder "/"
   - Click Save

4. **Your app will be live at**
   ```
   https://username.github.io/flyer-tracker/
   ```

5. **Install as App**
   - On mobile: Visit URL, tap Share/Menu, "Add to Home Screen"
   - On desktop: Visit URL, click install icon in address bar

### Updating the App

1. Make changes locally
2. Commit and push to GitHub
3. Changes appear on GitHub Pages automatically (may take a minute)

## Important Notes

### Data Backup
**IMPORTANT**: Browser storage can be cleared by:
- Manual cache clearing
- Browser updates
- Storage quota limits
- Device factory reset

**Recommendations**:
- Export backup JSON regularly
- Store backups on secure cloud storage (Google Drive, Dropbox, iCloud)
- Backup before major phone updates
- Export CSV weekly for permanent record

### Privacy & Security
- **All data stays local**: No data sent to any server
- **No analytics**: No tracking of your activities
- **No accounts**: No login required
- **No passwords**: Simple name-based users
- **Complete privacy**: Your delivery information never leaves your device

### Browser Compatibility

**Full Support**:
- iOS Safari 12+
- Chrome/Edge 40+
- Firefox 45+
- Samsung Internet 5+

**Features Used**:
- IndexedDB (for storage)
- Service Worker (for offline)
- ES6+ JavaScript
- Fetch API
- Local Storage

### Troubleshooting

**App won't load?**
- Clear browser cache and refresh
- Try different browser
- Check internet connection

**Lost data?**
- Browser storage was cleared
- Restore from backup if available
- Sorry, local data cannot be recovered once cleared

**Slow performance?**
- Close other tabs
- Restart browser
- IndexedDB performance varies by device

**Service Worker not updating?**
- Restart the app
- Clear browser cache
- Uninstall and reinstall PWA

## Technical Details

### Architecture
- **Single-page application** (SPA)
- **No framework dependencies** (vanilla JavaScript)
- **Modular design** with separate concerns
- **Client-side only** (no server)

### File Structure
```
index.html          - Main HTML page
styles.css          - All styling
app.js              - Application orchestration
db.js               - IndexedDB operations
data.js             - Business logic
ui.js               - DOM management
service-worker.js   - Offline caching
manifest.json       - PWA configuration
README.md           - Documentation
```

### Technologies
- **Storage**: IndexedDB (NoSQL database in browser)
- **Offline**: Service Worker + Web App Cache
- **Platform**: Progressive Web App (PWA)
- **Language**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 with flexbox/grid

### Database Schema

**users**
```javascript
{
  id,                 // Unique ID
  name,               // User name
  createdAt,          // ISO timestamp
  updatedAt           // ISO timestamp
}
```

**addresses**
```javascript
{
  id,                 // Unique ID
  order,              // Position in route (1, 2, 3...)
  address,            // Full address text
  active,             // Boolean (soft delete)
  createdAt,          // ISO timestamp
  updatedAt           // ISO timestamp
}
```

**deliveryEvents**
```javascript
{
  id,                 // Unique ID
  addressId,          // Reference to address
  address,            // Snapshot of address text
  userId,             // Reference to user
  userName,           // Snapshot of user name
  action,             // "delivered" or "revisit"
  timestamp,          // ISO timestamp
  dateKey             // "YYYY-MM-DD" for filtering
}
```

**notes**
```javascript
{
  id,                 // Unique ID
  addressId,          // Reference to address
  userId,             // Reference to user
  userName,           // User name
  text,               // Note text
  timestamp           // ISO timestamp
}
```

## Version History

### v1.0.0 (Initial Release)
- Full delivery tracking
- User management
- Address management
- History and filtering
- Statistics
- Backup/restore
- CSV export
- PWA support
- Offline support
- Service worker caching

## License

This application is provided as-is for personal use.

## Support

For issues, questions, or feature requests, please check:
1. This README
2. Application built-in help
3. Error messages in the app

---

**Happy Delivering!** 🏠📋

Built for simple, fast, offline flyer delivery tracking.
