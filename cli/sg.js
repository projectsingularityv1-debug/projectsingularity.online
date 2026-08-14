#!/usr/bin/env node

/**
 * ============================================================
 *  SINGULARITY CLI — Fast Git-like Code Push & Sync Engine
 *  Command: sg push -u origin main --force
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const os = require('os');
const readline = require('readline');

// ── Default Configuration ────────────────────────────────────
const DEFAULT_SUPABASE_URL = 'https://jqtxjbuiplmqjodqozre.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_u0TQQKm1F4b9Hi4fZTm0hg_cXokm473';
const OBFUSCATE_API_URL = 'https://singularity-raw.projectsingularity-v1.workers.dev/obfuscate';
const RAW_BASE_URL = 'https://projectsingularity.online/raw';
const WEB_BASE_URL = 'https://projectsingularity.online';

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.singularity');
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, 'config.json');
const LOCAL_CONFIG_FILE = '.sgconfig';
const SG_IGNORE_FILE = '.sgignore';

// Default files/directories to ignore
const DEFAULT_IGNORES = [
    '.git',
    '.git/**',
    'node_modules',
    'node_modules/**',
    '.sgconfig',
    '.sgignore',
    '.env',
    '.env.*',
    '.DS_Store',
    'Thumbs.db',
    '*.tmp',
    '*.log',
    'package-lock.json',
    'dist/**',
    'build/**',
    '.vscode/**',
    '.idea/**',
    '*.rar',
    '*.zip',
    '*.7z',
    '*.exe',
    '*.mp4'
];

// ── ANSI Colors ──────────────────────────────────────────────
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    bgCyan: '\x1b[46m',
    bgMagenta: '\x1b[45m'
};

const c = {
    brand: (t) => `${colors.bold}${colors.cyan}${t}${colors.reset}`,
    success: (t) => `${colors.bold}${colors.green}${t}${colors.reset}`,
    warn: (t) => `${colors.bold}${colors.yellow}${t}${colors.reset}`,
    error: (t) => `${colors.bold}${colors.red}${t}${colors.reset}`,
    dim: (t) => `${colors.dim}${colors.gray}${t}${colors.reset}`,
    bold: (t) => `${colors.bold}${t}${colors.reset}`,
    url: (t) => `${colors.underline}${colors.cyan}${t}${colors.reset}`,
    path: (t) => `${colors.magenta}${t}${colors.reset}`,
    badge: (label, text) => `${colors.bgCyan}${colors.white} ${label} ${colors.reset} ${text}`
};

// ── Helper: Read/Write Global & Local Config ─────────────────
function loadGlobalConfig() {
    try {
        if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
            fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
        }
        if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
            const data = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_FILE, 'utf8'));
            if (!data.accounts) data.accounts = [];
            return data;
        }
    } catch (_) {}
    return { accounts: [] };
}

function saveGlobalConfig(cfg) {
    try {
        if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
            fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
        console.error(c.error(`Failed to save global config: ${e.message}`));
    }
}

function getActiveAccount() {
    const cfg = loadGlobalConfig();
    if (cfg.accounts && cfg.accounts.length > 0) {
        if (cfg.activeAccountId) {
            const found = cfg.accounts.find(a => a.userId === cfg.activeAccountId || a.email === cfg.activeAccountId || a.username === cfg.activeAccountId);
            if (found) return found;
        }
        return cfg.accounts[0];
    }
    if (cfg.token) {
        return {
            token: cfg.token,
            userId: cfg.userId,
            email: cfg.email,
            username: cfg.username
        };
    }
    return null;
}

function saveAccountToGlobal(accountData) {
    const cfg = loadGlobalConfig();
    if (!cfg.accounts) cfg.accounts = [];
    
    // Check if account already exists
    const idx = cfg.accounts.findIndex(a => (accountData.userId && a.userId === accountData.userId) || (accountData.email && a.email === accountData.email));
    if (idx !== -1) {
        cfg.accounts[idx] = { ...cfg.accounts[idx], ...accountData };
    } else {
        cfg.accounts.push(accountData);
    }

    cfg.activeAccountId = accountData.userId || accountData.email;
    cfg.token = accountData.token;
    cfg.userId = accountData.userId;
    cfg.email = accountData.email;
    cfg.username = accountData.username;
    
    saveGlobalConfig(cfg);
}

function loadLocalConfig(dir = process.cwd()) {
    const p = path.join(dir, LOCAL_CONFIG_FILE);
    try {
        if (fs.existsSync(p)) {
            return JSON.parse(fs.readFileSync(p, 'utf8'));
        }
    } catch (_) {}
    return null;
}

function saveLocalConfig(cfg, dir = process.cwd()) {
    const p = path.join(dir, LOCAL_CONFIG_FILE);
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
}

// ── Helper: Ignore patterns match ────────────────────────────
function loadIgnorePatterns(dir = process.cwd()) {
    const patterns = [...DEFAULT_IGNORES];
    const sgIgnorePath = path.join(dir, SG_IGNORE_FILE);
    const gitIgnorePath = path.join(dir, '.gitignore');

    if (fs.existsSync(sgIgnorePath)) {
        const lines = fs.readFileSync(sgIgnorePath, 'utf8').split(/\r?\n/);
        lines.forEach(l => {
            const line = l.trim();
            if (line && !line.startsWith('#')) patterns.push(line);
        });
    } else if (fs.existsSync(gitIgnorePath)) {
        const lines = fs.readFileSync(gitIgnorePath, 'utf8').split(/\r?\n/);
        lines.forEach(l => {
            const line = l.trim();
            if (line && !line.startsWith('#')) patterns.push(line);
        });
    }
    return patterns;
}

function shouldIgnore(relPath, patterns) {
    const normalized = relPath.replace(/\\/g, '/');
    for (const pattern of patterns) {
        const cleanPattern = pattern.replace(/\\/g, '/').replace(/^\//, '');
        if (cleanPattern.endsWith('/**')) {
            const prefix = cleanPattern.slice(0, -3);
            if (normalized === prefix || normalized.startsWith(prefix + '/')) return true;
        } else if (cleanPattern.startsWith('*.')) {
            const ext = cleanPattern.slice(1);
            if (normalized.endsWith(ext)) return true;
        } else if (cleanPattern.endsWith('/')) {
            const dir = cleanPattern.slice(0, -1);
            if (normalized === dir || normalized.startsWith(dir + '/')) return true;
        } else {
            if (normalized === cleanPattern || normalized.split('/').includes(cleanPattern)) return true;
        }
    }
    return false;
}

// ── Helper: Recursive Directory Scanner ──────────────────────
function scanDirectory(baseDir, currentDir = baseDir, ignorePatterns = []) {
    let results = [];
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

        if (shouldIgnore(relPath, ignorePatterns)) {
            continue;
        }

        if (entry.isDirectory()) {
            results = results.concat(scanDirectory(baseDir, fullPath, ignorePatterns));
        } else if (entry.isFile()) {
            const stats = fs.statSync(fullPath);
            results.push({
                fullPath,
                relPath,
                name: entry.name,
                size: stats.size,
                mtime: stats.mtime
            });
        }
    }
    return results;
}

// ── HTTP Request Helper ──────────────────────────────────────
function requestJson(urlStr, options = {}, bodyData = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const reqOptions = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = client.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let json = null;
                try {
                    json = JSON.parse(data);
                } catch (_) {
                    json = data;
                }
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, data: json, headers: res.headers });
                } else {
                    reject({ status: res.statusCode, data: json, headers: res.headers });
                }
            });
        });

        req.on('error', reject);

        if (bodyData) {
            if (Buffer.isBuffer(bodyData)) {
                req.write(bodyData);
            } else if (typeof bodyData === 'object') {
                req.setHeader('Content-Type', 'application/json');
                req.write(JSON.stringify(bodyData));
            } else {
                req.write(bodyData);
            }
        }
        req.end();
    });
}

// Upload buffer directly to Supabase Storage
function uploadStorageObject(supabaseUrl, token, repoId, fileName, fileBuffer, contentType = 'text/plain;charset=utf-8', upsert = true) {
    return new Promise((resolve, reject) => {
        const encodedPath = encodeURIComponent(`${repoId}/${fileName}`).replace(/%2F/g, '/');
        const url = new URL(`${supabaseUrl}/storage/v1/object/repos/${encodedPath}`);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'apikey': DEFAULT_SUPABASE_KEY,
            'Content-Type': contentType,
            'x-upsert': upsert ? 'true' : 'false',
            'Content-Length': fileBuffer.length
        };

        const req = client.request({
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch (_) { resolve(data); }
                } else {
                    reject(new Error(`Storage error (${res.statusCode}): ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(fileBuffer);
        req.end();
    });
}

// ── Obfuscator Client ────────────────────────────────────────
async function obfuscateLua(sourceCode) {
    try {
        const res = await requestJson(OBFUSCATE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            source: sourceCode,
            tier: 'lite',
            banner: false
        });

        const obf = res.data.source || res.data.output || res.data.code || res.data.result || res.data.script;
        if (!obf) throw new Error('No obfuscated script returned in response');
        return obf;
    } catch (e) {
        throw new Error(`Obfuscation failed: ${e.message || JSON.stringify(e)}`);
    }
}

// ── Interactive Prompts ──────────────────────────────────────
let _rl = null;
function getReadline() {
    if (!_rl) {
        _rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    return _rl;
}

function prompt(question) {
    return new Promise(resolve => {
        const rl = getReadline();
        rl.question(question, answer => {
            resolve(answer.trim());
        });
    });
}

// ── Repository Fetcher & Creator ─────────────────────────────
async function fetchUserRepositories(token, userId) {
    try {
        const res = await requestJson(`${DEFAULT_SUPABASE_URL}/rest/v1/repositories?owner_id=eq.${userId}&select=*&order=created_at.desc`, {
            method: 'GET',
            headers: {
                'apikey': DEFAULT_SUPABASE_KEY,
                'Authorization': `Bearer ${token}`
            }
        });
        return Array.isArray(res.data) ? res.data : [];
    } catch (_) {
        return [];
    }
}

async function createNewRepository(token, userId, username, repoName, isPrivate = true, description = '') {
    const res = await requestJson(`${DEFAULT_SUPABASE_URL}/rest/v1/repositories`, {
        method: 'POST',
        headers: {
            'apikey': DEFAULT_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    }, {
        name: repoName,
        description: description,
        is_private: isPrivate,
        owner_id: userId,
        owner_username: username
    });

    if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data[0];
    }
    return res.data;
}

// ── Sanitizer for Repo ID ────────────────────────────────────
function cleanRepoIdInput(input) {
    if (!input) return null;
    let str = input.trim();
    
    // Check if user accidentally pasted a command
    if (str.includes('sg push') || str.includes('git push') || str.includes('--force')) {
        return null;
    }

    // Check if URL
    if (str.includes('id=')) {
        const match = str.match(/id=([a-f0-9-]+)/i);
        if (match) return match[1];
    }
    if (str.includes('/repos/')) {
        const match = str.match(/\/repos\/([a-f0-9-]+)/i);
        if (match) return match[1];
    }
    
    // If it is clean UUID or slug
    if (/^[a-f0-9-]{10,}$/i.test(str)) {
        return str;
    }
    if (!/\s/.test(str)) {
        return str;
    }
    return null;
}

// ── Interactive Repository Picker ────────────────────────────
async function selectOrCreateRepository(currentRepoId = null) {
    let account = getActiveAccount();

    if (!account || !account.token) {
        console.log(`\n${c.warn('🔑 No Singularity account logged in.')}`);
        console.log(`  [1] Log in to your Singularity Account (loads all your repositories)`);
        console.log(`  [2] Enter Repository ID / URL manually`);
        const choice = await prompt(`Choice [1/2] (Default 1): `) || '1';

        if (choice === '1') {
            await cmdLogin([]);
            account = getActiveAccount();
        } else {
            const manualId = await prompt(`Enter Singularity Repository ID: `);
            const cleaned = cleanRepoIdInput(manualId);
            if (!cleaned) {
                console.log(c.error('Invalid repository ID. Aborted.'));
                process.exit(1);
            }
            return cleaned;
        }
    }

    if (!account || !account.token) {
        console.log(c.error('Login failed or cancelled.'));
        process.exit(1);
    }

    while (true) {
        console.log(`\n${c.bold('📦 Singularity Account:')} ${c.brand(account.username || 'User')} ${c.dim(`(${account.email || 'PAT'})`)}`);
        console.log(c.dim('Fetching your repositories...'));

        const repos = await fetchUserRepositories(account.token, account.userId);

        console.log(`\n${c.bold('📂 Select Target Repository:')}`);
        repos.forEach((r, idx) => {
            const badge = r.is_private ? `${colors.yellow}[Private]${colors.reset}` : `${colors.green}[Public]${colors.reset}`;
            const isCurrent = currentRepoId && (currentRepoId === r.id || currentRepoId === r.name) ? ` ${colors.cyan}← (current)${colors.reset}` : '';
            console.log(`  [${colors.bold}${idx + 1}${colors.reset}] ${colors.bold}${r.name}${colors.reset} ${badge} ${c.dim(`- ${r.id}`)}${isCurrent}`);
        });

        const newRepoIdx = repos.length + 1;
        const switchAccIdx = repos.length + 2;
        const manualIdx = repos.length + 3;

        console.log(`  [${colors.bold}${newRepoIdx}${colors.reset}] ➕ ${colors.green}Create New Repository${colors.reset}`);
        console.log(`  [${colors.bold}${switchAccIdx}${colors.reset}] 🔄 ${colors.cyan}Switch Account / Log in another account${colors.reset}`);
        console.log(`  [${colors.bold}${manualIdx}${colors.reset}] 🔗 Enter Repository ID manually`);

        const choiceStr = await prompt(`\nSelect [1-${manualIdx}]: `);
        const choiceNum = parseInt(choiceStr);

        if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= repos.length) {
            const selected = repos[choiceNum - 1];
            console.log(c.success(`✔ Selected repository: ${colors.bold}${selected.name}${colors.reset} (${selected.id})`));
            return selected.id;
        }

        if (choiceNum === newRepoIdx) {
            console.log(c.bold('\n✨ Create New Singularity Repository'));
            const name = await prompt('Repository Name: ');
            if (!name) {
                console.log(c.warn('Repository name cannot be empty.'));
                continue;
            }
            const desc = await prompt('Description (optional): ');
            const visChoice = await prompt('Visibility: 1. Private (Default)  2. Public\nChoice [1/2]: ') || '1';
            const isPrivate = visChoice !== '2';

            try {
                console.log(c.dim('Creating repository on Singularity...'));
                const newRepo = await createNewRepository(account.token, account.userId, account.username, name.trim(), isPrivate, desc);
                console.log(c.success(`✔ Repository '${name}' created successfully! (${newRepo.id})`));
                return newRepo.id;
            } catch (err) {
                console.log(c.error(`Failed to create repository: ${err.message}`));
                continue;
            }
        }

        if (choiceNum === switchAccIdx) {
            await cmdAccount(['switch']);
            account = getActiveAccount();
            continue;
        }

        if (choiceNum === manualIdx) {
            const manualId = await prompt('Enter Repository ID: ');
            const cleaned = cleanRepoIdInput(manualId);
            if (cleaned) return cleaned;
            console.log(c.error('Invalid repository ID. Please try again.'));
            continue;
        }

        console.log(c.error('Invalid option. Please enter a valid number.'));
    }
}

// ── Banner Header ────────────────────────────────────────────
function printBanner() {
    console.log(`
${colors.cyan}  ███████╗██╗███╗   ██╗ ██████╗ ██╗   ██╗██╗      █████╗ ██████╗ ██╗████████╗██╗   ██╗
  ██╔════╝██║████╗  ██║██╔════╝ ██║   ██║██║     ██╔══██╗██╔══██╗██║╚══██╔══╝╚██╗ ██╔╝
  ███████╗██║██╔██╗ ██║██║  ███╗██║   ██║██║     ███████║██████╔╝██║   ██║    ╚████╔╝ 
  ╚════██║██║██║╚██╗██║██║   ██║██║   ██║██║     ██╔══██║██╔══██╗██║   ██║     ╚██╔╝  
  ███████║██║██║ ╚████║╚██████╔╝╚██████╔╝███████╗██║  ██║██║  ██║██║   ██║      ██║   
  ╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝      ╚═╝   ${colors.reset}
  ${colors.dim}Singularity Fast Git Push & Code Deployment Engine v2.0${colors.reset}
`);
}

// ── COMMAND: help ────────────────────────────────────────────
function showHelp() {
    printBanner();
    console.log(`${colors.bold}USAGE:${colors.reset}`);
    console.log(`  ${c.brand('sg push -u origin main --force')}     ${c.dim('# Force push local project to remote main')}`);
    console.log(`  ${c.brand('sg push')}                           ${c.dim('# Push changes to current repository')}`);
    console.log(`  ${c.brand('sg init')}                           ${c.dim('# Initialize Singularity project & pick repository')}`);
    console.log(`  ${c.brand('sg account')}                        ${c.dim('# Manage and switch Singularity accounts')}`);
    console.log(`  ${c.brand('sg remote add origin <repo-id>')}    ${c.dim('# Link remote repository by ID or interactive picker')}`);
    console.log(`  ${c.brand('sg remote -v')}                      ${c.dim('# View configured remotes')}`);
    console.log(`  ${c.brand('sg status')}                         ${c.dim('# View local files and unpushed changes')}`);
    console.log(`  ${c.brand('sg pull')}                           ${c.dim('# Download all remote files to local dir')}`);
    console.log(`  ${c.brand('sg login')}                          ${c.dim('# Authenticate with Singularity account/token')}`);
    console.log(`  ${c.brand('sg whoami')}                         ${c.dim('# Show current active user account')}`);
    console.log('');
    console.log(`${colors.bold}PUSH OPTIONS:${colors.reset}`);
    console.log(`  ${colors.yellow}-u, --set-upstream${colors.reset}   Set upstream remote and branch (e.g. origin main)`);
    console.log(`  ${colors.yellow}-f, --force${colors.reset}          Force overwrite remote files (bypass conflicts)`);
    console.log(`  ${colors.yellow}-o, --obfuscate${colors.reset}      Auto-obfuscate .lua scripts with Singularity Shield`);
    console.log(`  ${colors.yellow}--no-obfuscate${colors.reset}       Skip script obfuscation`);
    console.log(`  ${colors.yellow}--dir <path>${colors.reset}          Specify source directory (default: current dir)`);
    console.log(`  ${colors.yellow}--file <path>${colors.reset}         Push a single file instead of whole folder`);
    console.log('');
}

// ── COMMAND: login ───────────────────────────────────────────
async function cmdLogin(args) {
    printBanner();
    console.log(c.bold('🔑 Singularity CLI Authentication'));
    console.log(c.dim('Log in with your Singularity account or Personal Access Token (PAT).\n'));

    let token = '';
    const tokenIdx = args.findIndex(a => a === '--token' || a === '-t');
    if (tokenIdx !== -1 && args[tokenIdx + 1]) {
        token = args[tokenIdx + 1];
    }

    if (!token) {
        console.log(`You can get your Personal Access Token from ${c.url('https://projectsingularity.online/profile.html')}`);
        const authChoice = await prompt(`Choose login method:\n  [1] Email & Password\n  [2] Personal Access Token (PAT)\nChoice [1/2] (Default 1): `) || '1';

        if (authChoice === '1') {
            const email = await prompt('Email: ');
            const password = await prompt('Password: ');

            console.log(c.dim('\nAuthenticating with Supabase...'));
            try {
                const res = await requestJson(`${DEFAULT_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                    method: 'POST',
                    headers: {
                        'apikey': DEFAULT_SUPABASE_KEY,
                        'Content-Type': 'application/json'
                    }
                }, { email, password });

                token = res.data.access_token;
                const user = res.data.user;
                const username = user?.user_metadata?.username || email.split('@')[0];

                saveAccountToGlobal({
                    token: token,
                    refreshToken: res.data.refresh_token,
                    userId: user.id,
                    email: email,
                    username: username
                });

                console.log(c.success(`\n✔ Successfully logged in as ${colors.bold}${username}${colors.reset} (${email})`));
                return;
            } catch (err) {
                console.error(c.error(`\n✖ Login failed: ${err.data?.error_description || err.data?.msg || err.message || 'Invalid credentials'}`));
                return;
            }
        } else {
            token = await prompt('\nEnter Singularity Token / Supabase Access Token: ');
        }
    }

    if (!token) {
        console.log(c.error('Token cannot be empty.'));
        return;
    }

    console.log(c.dim('\nVerifying token...'));
    try {
        const res = await requestJson(`${DEFAULT_SUPABASE_URL}/auth/v1/user`, {
            method: 'GET',
            headers: {
                'apikey': DEFAULT_SUPABASE_KEY,
                'Authorization': `Bearer ${token}`
            }
        });

        const user = res.data;
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User';

        saveAccountToGlobal({
            token: token,
            userId: user.id,
            email: user.email,
            username: username
        });

        console.log(c.success(`\n✔ Successfully authenticated as ${colors.bold}${username}${colors.reset} (${user.email})`));
    } catch (e) {
        console.error(c.error(`\n✖ Invalid or expired token.`));
    }
}

// ── COMMAND: account (Account Switcher) ──────────────────────
async function cmdAccount(args = []) {
    const cfg = loadGlobalConfig();
    const accounts = cfg.accounts || [];

    const sub = args[0] ? args[0].toLowerCase() : 'list';

    if (sub === 'add' || sub === 'login') {
        await cmdLogin([]);
        return;
    }

    if (sub === 'switch' || sub === 'select' || sub === 'choose' || accounts.length > 0) {
        if (accounts.length === 0) {
            console.log(c.warn('No accounts saved yet.'));
            await cmdLogin([]);
            return;
        }

        console.log(`\n${c.bold('👥 Saved Singularity Accounts:')}`);
        accounts.forEach((acc, i) => {
            const isActive = (acc.userId === cfg.activeAccountId || acc.email === cfg.activeAccountId || (!cfg.activeAccountId && i === 0));
            const marker = isActive ? `${colors.green}* [ACTIVE]${colors.reset}` : `  [${i + 1}]`;
            console.log(`  ${marker} ${colors.bold}${acc.username || 'User'}${colors.reset} (${acc.email || 'Token Auth'})`);
        });

        console.log(`  [${accounts.length + 1}] ➕ Log in to another account`);

        const choice = await prompt(`\nSelect account [1-${accounts.length + 1}] (or Enter to keep current): `);
        if (!choice) return;

        const num = parseInt(choice);
        if (!isNaN(num) && num >= 1 && num <= accounts.length) {
            const selected = accounts[num - 1];
            cfg.activeAccountId = selected.userId || selected.email;
            cfg.token = selected.token;
            cfg.userId = selected.userId;
            cfg.email = selected.email;
            cfg.username = selected.username;
            saveGlobalConfig(cfg);
            console.log(c.success(`✔ Switched active account to: ${colors.bold}${selected.username}${colors.reset} (${selected.email})`));
        } else if (num === accounts.length + 1) {
            await cmdLogin([]);
        }
        return;
    }

    console.log(c.warn('No accounts found. Run `sg login` to add an account.'));
}

// ── COMMAND: whoami ──────────────────────────────────────────
async function cmdWhoami() {
    const acc = getActiveAccount();
    if (!acc || !acc.token) {
        console.log(c.warn('Not logged in. Run `sg login` to authenticate.'));
        return;
    }
    console.log(c.bold('👤 Current Active Account'));
    console.log(`  Username: ${c.brand(acc.username || 'Unknown')}`);
    console.log(`  Email:    ${acc.email || 'N/A'}`);
    console.log(`  User ID:  ${acc.userId || 'N/A'}`);
    console.log(`  Token:    ${acc.token ? acc.token.substring(0, 15) + '...' : 'None'}`);
}

// ── COMMAND: init ────────────────────────────────────────────
async function cmdInit(args) {
    const cwd = process.cwd();
    let localCfg = loadLocalConfig(cwd) || {};

    console.log(c.bold(`✨ Initializing Singularity repository in ${path.basename(cwd)}`));

    const selectedRepoId = await selectOrCreateRepository(localCfg.remote?.origin);

    localCfg.remote = {
        origin: selectedRepoId,
        branch: 'main'
    };
    localCfg.autoObfuscate = true;
    saveLocalConfig(localCfg, cwd);

    // Create default .sgignore if missing
    const sgIgnorePath = path.join(cwd, SG_IGNORE_FILE);
    if (!fs.existsSync(sgIgnorePath)) {
        fs.writeFileSync(sgIgnorePath, `# Singularity Ignore Rules\n.git\nnode_modules\n.env\n*.tmp\n*.log\n`, 'utf8');
    }

    console.log(c.success(`\n✔ Configured remote 'origin' -> ${selectedRepoId}`));
    console.log(c.dim(`Saved to ${c.path(LOCAL_CONFIG_FILE)}`));
    console.log(`\nNext step: Run ${c.brand('sg push -u origin main --force')} to upload your code!`);
}

// ── COMMAND: remote ──────────────────────────────────────────
async function cmdRemote(args) {
    const cwd = process.cwd();
    let localCfg = loadLocalConfig(cwd) || {};
    if (!localCfg.remote) localCfg.remote = {};

    const sub = args[0];

    if (sub === 'add') {
        const name = args[1] || 'origin';
        let target = args[2];
        
        if (!target) {
            target = await selectOrCreateRepository(localCfg.remote?.[name]);
        } else {
            const cleaned = cleanRepoIdInput(target);
            if (cleaned) target = cleaned;
        }

        localCfg.remote[name] = target;
        saveLocalConfig(localCfg, cwd);
        console.log(c.success(`✔ Added remote '${name}' -> ${target}`));
    } else if (sub === 'remove' || sub === 'rm') {
        const name = args[1] || 'origin';
        delete localCfg.remote[name];
        saveLocalConfig(localCfg, cwd);
        console.log(c.success(`✔ Removed remote '${name}'`));
    } else {
        // List remotes (-v)
        console.log(c.bold('Remote Repositories:'));
        const keys = Object.keys(localCfg.remote);
        if (keys.length === 0) {
            console.log(c.dim('  No remotes configured. Use `sg remote add origin` to select a repo.'));
        } else {
            keys.forEach(k => {
                if (k === 'branch') return;
                console.log(`  ${colors.bold}${k}${colors.reset}\t${localCfg.remote[k]} (push & fetch)`);
            });
        }
    }
}

// ── COMMAND: status ──────────────────────────────────────────
async function cmdStatus(args = []) {
    let cwd = process.cwd();
    const dirIdx = args.findIndex(a => a === '--dir' || a === '-d');
    if (dirIdx !== -1 && args[dirIdx + 1]) {
        cwd = path.resolve(args[dirIdx + 1]);
    }
    const localCfg = loadLocalConfig(cwd) || {};
    const ignorePatterns = loadIgnorePatterns(cwd);
    const files = scanDirectory(cwd, cwd, ignorePatterns);

    console.log(c.bold(`On branch ${colors.cyan}${localCfg.remote?.branch || 'main'}${colors.reset}`));
    if (localCfg.remote?.origin) {
        console.log(`Your branch is tracking ${colors.cyan}origin/${localCfg.remote?.branch || 'main'}${colors.reset} [${localCfg.remote.origin}]`);
    } else {
        console.log(c.warn('No remote configured. Run `sg remote add origin` or `sg init`'));
    }
    console.log('');

    if (files.length === 0) {
        console.log(c.dim('nothing to commit, working tree clean'));
        return;
    }

    console.log(c.bold(`Files ready to push (${files.length} files):`));
    let totalBytes = 0;
    files.forEach(f => {
        totalBytes += f.size;
        const isLua = f.name.endsWith('.lua');
        const badge = isLua ? `${colors.yellow}[Lua/Shield]${colors.reset}` : `${colors.green}[Ready]${colors.reset}`;
        console.log(`  ${badge}  ${f.relPath} ${c.dim(`(${(f.size / 1024).toFixed(1)} KB)`)}`);
    });

    console.log(c.dim(`\nTotal project size: ${(totalBytes / 1024).toFixed(2)} KB`));
    console.log(`\nUse ${c.brand('sg push -u origin main --force')} to push all files.`);
}

// ── COMMAND: pull ────────────────────────────────────────────
async function cmdPull(args) {
    const cwd = process.cwd();
    const localCfg = loadLocalConfig(cwd) || {};
    const account = getActiveAccount();

    const repoId = args[0] || localCfg.remote?.origin;
    if (!repoId) {
        console.log(c.error('No remote repository specified. Run `sg pull <repo_id>` or `sg remote add origin`'));
        return;
    }

    const token = account?.token || DEFAULT_SUPABASE_KEY;
    console.log(c.bold(`⬇ Pulling files from repository ${colors.cyan}${repoId}${colors.reset}...`));

    try {
        const listRes = await requestJson(`${DEFAULT_SUPABASE_URL}/storage/v1/object/list/repos`, {
            method: 'POST',
            headers: {
                'apikey': DEFAULT_SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }, {
            prefix: repoId,
            limit: 100
        });

        const files = (listRes.data || []).filter(f => f.name !== '.emptyFolderPlaceholder' && !f.name.endsWith('.raw.lua'));
        if (files.length === 0) {
            console.log(c.warn('Remote repository is empty.'));
            return;
        }

        console.log(`Found ${files.length} files. Downloading...`);
        for (const file of files) {
            const fileName = file.name;
            const fileUrl = `${DEFAULT_SUPABASE_URL}/storage/v1/object/public/repos/${repoId}/${fileName}`;
            const targetPath = path.join(cwd, fileName);

            console.log(`  ${c.dim('Downloading:')} ${fileName}...`);
            const res = await requestJson(fileUrl);
            const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
            
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.writeFileSync(targetPath, content, 'utf8');
        }

        console.log(c.success(`\n✔ Successfully pulled ${files.length} files into ${cwd}`));
    } catch (e) {
        console.error(c.error(`Pull failed: ${e.message}`));
    }
}

// ── COMMAND: push (Main Core: `sg push -u origin main --force`) ──
async function cmdPush(args) {
    const cwd = process.cwd();
    const localCfg = loadLocalConfig(cwd) || {};
    const account = getActiveAccount();

    // Check Token / Authentication
    let token = account?.token || process.env.SINGULARITY_TOKEN || DEFAULT_SUPABASE_KEY;

    // Parse Flags
    const isForce = args.includes('--force') || args.includes('-f') || args.includes('-force');
    const isSetUpstream = args.includes('-u') || args.includes('--set-upstream');
    const isNoObf = args.includes('--no-obfuscate');
    const isObfFlag = args.includes('--obfuscate') || args.includes('-o');
    const autoObfuscate = isNoObf ? false : (isObfFlag ? true : (localCfg.autoObfuscate !== false));

    // Parse Directory or File override
    let sourceDir = cwd;
    const dirIdx = args.findIndex(a => a === '--dir' || a === '-d');
    if (dirIdx !== -1 && args[dirIdx + 1]) {
        sourceDir = path.resolve(args[dirIdx + 1]);
    }

    let singleFile = null;
    const fileIdx = args.findIndex(a => a === '--file');
    if (fileIdx !== -1 && args[fileIdx + 1]) {
        singleFile = path.resolve(args[fileIdx + 1]);
    }

    // Determine Remote & Branch
    let remoteName = 'origin';
    let branchName = 'main';

    // Parse positional arguments like `push -u origin main` or `push origin main`
    const positionalArgs = args.filter(a => !a.startsWith('-'));
    if (positionalArgs.length >= 2) {
        remoteName = positionalArgs[0];
        branchName = positionalArgs[1];
    } else if (positionalArgs.length === 1) {
        if (positionalArgs[0] === 'main' || positionalArgs[0] === 'master') {
            branchName = positionalArgs[0];
        } else {
            remoteName = positionalArgs[0];
        }
    }

    let repoId = localCfg.remote?.[remoteName] || localCfg.remote?.origin;

    // Validate saved repoId — if invalid or corrupted, auto-reset it
    if (repoId && !cleanRepoIdInput(repoId)) {
        console.log(c.warn(`Saved remote repository '${repoId}' is invalid. Resetting...`));
        repoId = null;
        if (localCfg.remote) {
            delete localCfg.remote[remoteName];
            delete localCfg.remote.origin;
            saveLocalConfig(localCfg, cwd);
        }
    }

    // Check if repoId was passed directly as positional
    if (!repoId && remoteName && cleanRepoIdInput(remoteName)) {
        repoId = cleanRepoIdInput(remoteName);
        remoteName = 'origin';
    }

    // If still no repoId, prompt interactive repository picker!
    if (!repoId) {
        console.log(c.warn(`\nNo remote repository linked for this folder.`));
        repoId = await selectOrCreateRepository();

        if (!localCfg.remote) localCfg.remote = {};
        localCfg.remote[remoteName] = repoId;
        localCfg.remote.branch = branchName;
        saveLocalConfig(localCfg, cwd);
    }

    // ── Scan Files ───────────────────────────────────────────
    let filesToPush = [];
    if (singleFile) {
        if (!fs.existsSync(singleFile)) {
            console.log(c.error(`File not found: ${singleFile}`));
            process.exit(1);
        }
        const stat = fs.statSync(singleFile);
        filesToPush.push({
            fullPath: singleFile,
            relPath: path.basename(singleFile),
            name: path.basename(singleFile),
            size: stat.size
        });
    } else {
        const ignorePatterns = loadIgnorePatterns(sourceDir);
        filesToPush = scanDirectory(sourceDir, sourceDir, ignorePatterns);
    }

    if (filesToPush.length === 0) {
        console.log(c.warn('No files found to push in current directory.'));
        return;
    }

    // ── Git-like Push Animation Header ───────────────────────
    const randomHash1 = crypto.randomBytes(4).toString('hex');
    const randomHash2 = crypto.randomBytes(4).toString('hex');
    const startTime = Date.now();

    console.log(`\n${colors.cyan}Enumerating objects: ${filesToPush.length}, done.${colors.reset}`);
    await new Promise(r => setTimeout(r, 80));
    console.log(`${colors.cyan}Counting objects: 100% (${filesToPush.length}/${filesToPush.length}), done.${colors.reset}`);
    await new Promise(r => setTimeout(r, 60));

    let totalBytes = filesToPush.reduce((acc, f) => acc + f.size, 0);
    let totalKiB = (totalBytes / 1024).toFixed(2);
    console.log(`${colors.cyan}Compressing objects: 100% (${filesToPush.length}/${filesToPush.length}), done.${colors.reset}`);

    console.log(`${colors.bold}${colors.cyan}Writing objects: 100% (${filesToPush.length}/${filesToPush.length}), ${totalKiB} KiB | Singularity Shield Engine${colors.reset}`);
    console.log(`${colors.dim}Total ${filesToPush.length} (delta 0), reused 0 (delta 0), pack-reused 0${colors.reset}\n`);

    // ── Upload Loop ──────────────────────────────────────────
    let uploadedCount = 0;
    let obfuscatedCount = 0;
    let luaFiles = [];

    for (let i = 0; i < filesToPush.length; i++) {
        const f = filesToPush[i];
        const isLua = f.name.endsWith('.lua');
        const progressPct = Math.round(((i + 1) / filesToPush.length) * 100);

        let contentBuffer = fs.readFileSync(f.fullPath);
        let contentType = 'text/plain;charset=utf-8';

        if (f.name.endsWith('.json')) contentType = 'application/json;charset=utf-8';
        else if (f.name.endsWith('.html')) contentType = 'text/html;charset=utf-8';
        else if (f.name.endsWith('.css')) contentType = 'text/css;charset=utf-8';
        else if (f.name.endsWith('.js')) contentType = 'application/javascript;charset=utf-8';

        process.stdout.write(`  [${progressPct}%] Uploading ${f.relPath}... `);

        if (isLua && autoObfuscate) {
            try {
                process.stdout.write(`${colors.yellow}[Obfuscating]${colors.reset} `);
                const rawSource = contentBuffer.toString('utf8');
                
                // Upload raw backup file hidden (.raw.lua)
                const rawFileName = f.relPath.replace(/\.lua$/, '.raw.lua');
                await uploadStorageObject(DEFAULT_SUPABASE_URL, token, repoId, rawFileName, contentBuffer, contentType, isForce);

                // Obfuscate
                const protectedCode = await obfuscateLua(rawSource);
                const obfBuffer = Buffer.from(protectedCode, 'utf8');

                // Upload protected file
                await uploadStorageObject(DEFAULT_SUPABASE_URL, token, repoId, f.relPath, obfBuffer, contentType, isForce);
                
                obfuscatedCount++;
                luaFiles.push(f.relPath);
                console.log(`${colors.green}✔ Done (Shield protected)${colors.reset}`);
            } catch (err) {
                console.log(`${colors.yellow}⚠ Shield fallback: uploading clean (${err.message})${colors.reset}`);
                await uploadStorageObject(DEFAULT_SUPABASE_URL, token, repoId, f.relPath, contentBuffer, contentType, isForce);
            }
        } else {
            try {
                await uploadStorageObject(DEFAULT_SUPABASE_URL, token, repoId, f.relPath, contentBuffer, contentType, isForce);
                console.log(`${colors.green}✔ Done${colors.reset}`);
            } catch (err) {
                console.log(`${colors.red}✖ Failed: ${err.message}${colors.reset}`);
                throw err;
            }
        }

        uploadedCount++;
    }

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    // ── Git-like Summary Output ──────────────────────────────
    console.log(`\nTo ${colors.bold}${WEB_BASE_URL}/repos/${repoId}${colors.reset}`);
    if (isForce) {
        console.log(` + ${randomHash1}...${randomHash2} ${branchName} -> ${branchName} ${colors.yellow}(forced update)${colors.reset}`);
    } else {
        console.log(`   ${randomHash1}..${randomHash2}  ${branchName} -> ${branchName}`);
    }

    if (isSetUpstream) {
        console.log(`Branch '${branchName}' set up to track remote branch '${branchName}' from '${remoteName}'.`);
    }

    console.log(`\n${colors.bold}${colors.green}✨ Push completed successfully in ${elapsedSeconds}s!${colors.reset}`);
    console.log(`📦 Pushed ${colors.bold}${uploadedCount}${colors.reset} files (${obfuscatedCount} Lua scripts protected via Singularity Shield).`);

    // Print quick URLs
    console.log(`\n${colors.bold}🔗 Repository Links:${colors.reset}`);
    console.log(`  Web Dashboard: ${c.url(`${WEB_BASE_URL}/repo.html?id=${repoId}`)}`);

    const primaryScript = luaFiles[0] || (filesToPush.find(f => f.name.endsWith('.lua'))?.relPath);
    if (primaryScript) {
        const rawUrl = `${RAW_BASE_URL}/${repoId}/${primaryScript}`;
        console.log(`\n${colors.bold}⚡ Roblox Loader Snippet:${colors.reset}`);
        console.log(`  ${colors.bgCyan}${colors.white} LOADSTRING ${colors.reset} ${colors.green}loadstring(game:HttpGet('${rawUrl}'))()${colors.reset}`);
    }
}

// ── Main Entrypoint ──────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] ? args[0].toLowerCase() : 'help';

    try {
        switch (command) {
            case 'push':
                await cmdPush(args.slice(1));
                break;
            case 'account':
            case 'accounts':
                await cmdAccount(args.slice(1));
                break;
            case 'init':
                await cmdInit(args.slice(1));
                break;
            case 'remote':
                await cmdRemote(args.slice(1));
                break;
            case 'status':
                await cmdStatus(args.slice(1));
                break;
            case 'pull':
                await cmdPull(args.slice(1));
                break;
            case 'login':
                await cmdLogin(args.slice(1));
                break;
            case 'whoami':
                await cmdWhoami();
                break;
            case 'help':
            case '--help':
            case '-h':
                showHelp();
                break;
            case 'version':
            case '-v':
            case '--version':
                console.log('Singularity CLI v2.0.0');
                break;
            default:
                // Check if user directly ran `sg -u origin main --force`
                if (command.startsWith('-')) {
                    await cmdPush(args);
                } else {
                    console.log(c.error(`Unknown command: '${command}'`));
                    console.log(`Run ${c.brand('sg help')} for available commands.`);
                }
                break;
        }
    } catch (e) {
        console.error(`\n${c.error('Error:')} ${e.message || e}`);
        process.exit(1);
    } finally {
        if (_rl) _rl.close();
    }
}

main();
