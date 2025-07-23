const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let flaskProcess = null;

// Auto-start Flask backend
function startFlaskServer() {
    try {
        console.log('🚀 Starting Flask backend...');
        
        let flaskExecutable;
        let flaskArgs = [];
        let flaskCwd;
        
        // Check if running in development or production
        if (app.isPackaged) {
            // Production mode - use bundled executable
            const resourcesPath = process.resourcesPath;
            flaskExecutable = path.join(resourcesPath, 'backend', 'gplast-factory-backend.exe');
            flaskCwd = path.join(resourcesPath, 'backend');
            console.log('� Production mode - using bundled backend:', flaskExecutable);
        } else {
            // Development mode - use Python script
            const flaskPath = path.join(__dirname, '..', 'back', 'app.py');
            flaskExecutable = 'python';
            flaskArgs = [flaskPath];
            flaskCwd = path.join(__dirname, '..', 'back');
            console.log('🔧 Development mode - using Python script:', flaskPath);
        }
        
        // Start the Flask process
        flaskProcess = spawn(flaskExecutable, flaskArgs, {
            cwd: flaskCwd,
            stdio: 'pipe', // Changed to pipe to capture output
            detached: false
        });
        
        // Log backend output for debugging
        if (flaskProcess.stdout) {
            flaskProcess.stdout.on('data', (data) => {
                console.log('Backend stdout:', data.toString());
            });
        }
        
        if (flaskProcess.stderr) {
            flaskProcess.stderr.on('data', (data) => {
                console.error('Backend stderr:', data.toString());
            });
        }
        
        flaskProcess.on('error', (error) => {
            console.error('❌ Failed to start Flask server:', error);
        });
        
        flaskProcess.on('exit', (code) => {
            console.log(`🔄 Flask server exited with code ${code}`);
        });
        
        console.log('✅ Flask backend started successfully');
    } catch (error) {
        console.error('❌ Error starting Flask backend:', error);
    }
}

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        fullscreen: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets', 'images', 'logo.png'),
        title: 'GPLAST Factory Management',
        show: false,
        frame: true,
        titleBarStyle: 'default'
    });

    // Load the index.html file
    mainWindow.loadFile('index.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Start Flask backend after window is ready
        setTimeout(() => {
            startFlaskServer();
        }, 1000);
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
        
        // Kill Flask process when window closes
        if (flaskProcess) {
            flaskProcess.kill();
            flaskProcess = null;
        }
    });

    // Prevent external links from opening in Electron
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// Create custom menu
function createMenu() {
    const template = [
        {
            label: 'GPLAST',
            submenu: [
                {
                    label: 'About GPLAST Factory Management',
                    click: () => {
                        // Show about dialog
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
    createWindow();
    createMenu();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Kill Flask process
    if (flaskProcess) {
        flaskProcess.kill();
        flaskProcess = null;
    }
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    // Cleanup Flask process
    if (flaskProcess) {
        flaskProcess.kill();
        flaskProcess = null;
    }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}
