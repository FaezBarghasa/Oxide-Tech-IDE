const Module = require('module');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Global registries
global.commandRegistry = {};
global.extensionRegistry = {};
global.mcpTools = [];

// Intercept events to communicate back to Tauri parent
function sendIPCEvent(event, data) {
    console.log(`[IPC_EVENT] ${JSON.stringify({ event, data })}`);
}

// 1. VS Code API Compatibility Shim Layer
const vscodeShim = {
    window: {
        createWebviewPanel(viewType, title, viewColumn, options) {
            sendIPCEvent('createWebviewPanel', { viewType, title });
            return {
                webview: {
                    html: '',
                    onDidReceiveMessage(callback) {
                        return { dispose() {} };
                    },
                    postMessage(message) {
                        sendIPCEvent('webviewPostMessage', { viewType, message });
                        return Promise.resolve(true);
                    }
                },
                onDidDispose(callback) {
                    return { dispose() {} };
                },
                dispose() {
                    sendIPCEvent('webviewDispose', { viewType });
                }
            };
        },
        showInformationMessage(message, ...items) {
            sendIPCEvent('showInformationMessage', { message, items });
            return Promise.resolve(items[0] || 'OK');
        },
        showErrorMessage(message, ...items) {
            sendIPCEvent('showErrorMessage', { message, items });
            return Promise.resolve(items[0] || 'OK');
        },
        activeTextEditor: undefined,
    },
    commands: {
        registerCommand(commandId, callback) {
            global.commandRegistry[commandId] = callback;
            sendIPCEvent('commandRegistered', { commandId });
            return { dispose() { delete global.commandRegistry[commandId]; } };
        },
        executeCommand(commandId, ...args) {
            if (global.commandRegistry[commandId]) {
                try {
                    return Promise.resolve(global.commandRegistry[commandId](...args));
                } catch (e) {
                    return Promise.reject(e);
                }
            }
            return Promise.reject(new Error(`Command ${commandId} not found`));
        }
    },
    workspace: {
        workspaceFolders: [],
        fs: {
            stat(uri) { return Promise.resolve({ type: 1, size: 0 }); },
            readFile(uri) { return Promise.resolve(new Uint8Array()); }
        }
    }
};

// Override require loader to return vscode shim
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === 'vscode') {
        return vscodeShim;
    }
    return originalRequire.apply(this, arguments);
};

// 2. Local MCP (Model Context Protocol) Discovery client
function discoverLocalMCPTools() {
    // Quietly poll standard local HTTP endpoints or discover tools via local system configurations
    const searchPorts = [8080, 8000, 3000, 3030];
    searchPorts.forEach(port => {
        const req = http.request({
            host: '127.0.0.1',
            port: port,
            path: '/mcp/tools',
            method: 'GET',
            timeout: 1000
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.tools) {
                        global.mcpTools = parsed.tools;
                        sendIPCEvent('mcpDiscovery', { port, tools: parsed.tools });
                    }
                } catch (e) {}
            });
        });
        req.on('error', () => {});
        req.end();
    });
}

// 3. Execution Daemon Server
const server = http.createServer((req, res) => {
    if (req.url === '/load' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const params = JSON.parse(body);
                const { extensionPath } = params;
                const manifestPath = path.join(extensionPath, 'package.json');
                
                if (fs.existsSync(manifestPath)) {
                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    const entryPoint = path.join(extensionPath, manifest.main || 'extension.js');
                    
                    if (fs.existsSync(entryPoint)) {
                        // Dynamically evaluate and load extension entrypoint
                        const extension = require(entryPoint);
                        if (extension && typeof extension.activate === 'function') {
                            const context = { subscriptions: [] };
                            extension.activate(context);
                            global.extensionRegistry[manifest.name] = { extension, context };
                            
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'loaded', name: manifest.name }));
                            return;
                        }
                    }
                }
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Manifest or main entrypoint invalid' }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
    } else if (req.url === '/mcp' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tools: global.mcpTools }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

// Bind to localhost port for internal Tauri bridging
const port = process.env.EXTENSION_HOST_PORT || 8083;
server.listen(port, '127.0.0.1', () => {
    console.log(`[Extension Host] Listening on http://127.0.0.1:${port}`);
    
    // Begin discovery
    discoverLocalMCPTools();
    setInterval(discoverLocalMCPTools, 15000);
});
