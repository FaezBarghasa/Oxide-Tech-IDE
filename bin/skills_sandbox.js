const vm = require('vm');
const fs = require('fs');
const execSync = require('child_process').execSync;
const http = require('http');

// Expose internal helper actions for the sandbox
const gitStatus = () => {
    try {
        return execSync('git status --porcelain', { encoding: 'utf8' });
    } catch (e) {
        return e.message;
    }
};

const gitCommit = (msg) => {
    try {
        return execSync(`git commit -m "${msg}"`, { encoding: 'utf8' });
    } catch (e) {
        return e.message;
    }
};

const gitAdd = (files) => {
    try {
        const fileList = Array.isArray(files) ? files.join(' ') : files;
        return execSync(`git add ${fileList}`, { encoding: 'utf8' });
    } catch (e) {
        return e.message;
    }
};

const callAI = (prompt) => {
    return new Promise((resolve) => {
        // Query local Actix-web agent if available
        const postData = JSON.stringify({ prompt });
        const req = http.request({
            host: '127.0.0.1',
            port: 8080,
            path: '/ai/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.response || parsed.content || data);
                } catch (e) {
                    resolve(data);
                }
            });
        });
        
        req.on('error', () => {
            // Mock fallback response
            resolve(`[AI Mock Response for sandbox prompt]: "${prompt}" -> Executed refactoring sequence.`);
        });
        
        req.write(postData);
        req.end();
    });
};

// Main runner logic
const runSandbox = () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("Error: No script payload or path provided.");
        process.exit(1);
    }

    let scriptContent = '';
    const scriptArg = args[0];
    
    if (fs.existsSync(scriptArg)) {
        scriptContent = fs.readFileSync(scriptArg, 'utf8');
    } else {
        scriptContent = scriptArg;
    }

    const logs = [];
    const customConsole = {
        log: (...msg) => {
            logs.push(`[LOG] ${msg.join(' ')}`);
            console.log(`[LOG] ${msg.join(' ')}`);
        },
        error: (...msg) => {
            logs.push(`[ERROR] ${msg.join(' ')}`);
            console.error(`[ERROR] ${msg.join(' ')}`);
        }
    };

    // Construct the megaIDE abstraction bindings
    const sandboxContext = {
        console: customConsole,
        megaIDE: {
            git: {
                status: gitStatus,
                add: gitAdd,
                commit: gitCommit
            },
            fs: {
                readFile: (filePath) => fs.readFileSync(filePath, 'utf8'),
                writeFile: (filePath, data) => fs.writeFileSync(filePath, data),
                exists: (filePath) => fs.existsSync(filePath),
                readDir: (dirPath) => fs.readdirSync(dirPath)
            },
            ai: {
                prompt: callAI
            }
        },
        process: {
            exit: (code) => {
                console.log(`[EXIT] Process requested exit with code ${code}`);
                process.exit(code);
            }
        },
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval
    };

    const context = vm.createContext(sandboxContext);
    
    console.log("[Sandbox] Starting Skills execution execution context...");
    try {
        const script = new vm.Script(scriptContent);
        // Run sandbox execution
        script.runInContext(context, { timeout: 10000 });
        console.log("[Sandbox] Skills script completed execution.");
    } catch (e) {
        console.error(`[Sandbox Error] ${e.stack}`);
        process.exit(1);
    }
};

runSandbox();
