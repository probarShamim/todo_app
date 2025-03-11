// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = 3000;
const USERS_FOLDER = path.join(__dirname, 'users');

// Ensure users folder exists
if (!fs.existsSync(USERS_FOLDER)) {
    fs.mkdirSync(USERS_FOLDER);
}
 
// In-memory session store
const sessions = {};

// Helper functions
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getUserFilePath(userId) {
    return path.join(USERS_FOLDER, userId + '.json');
}

function loadUser(userId) {
    const filePath = getUserFilePath(userId);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
}

function saveUser(user) {
    const filePath = getUserFilePath(user.userId);
    fs.writeFileSync(filePath, JSON.stringify(user, null, 2));
}

// Serve static files
function serveStaticFile(filePath, contentType, response) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            response.writeHead(500);
            response.end('Error loading file');
        } else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content);
        }
    });
}

function getContentType(filePath) {
    const ext = path.extname(filePath);
    switch (ext) {
        case '.html': return 'text/html';
        case '.css': return 'text/css';
        case '.js': return 'text/javascript';
        default: return 'application/octet-stream';
    }
}

// Simple cookie parser
function parseCookies(cookieHeader) {
    const cookies = {};
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            cookies[parts[0].trim()] = parts[1] ? parts[1].trim() : '';
        });
    }
    return cookies;
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    const pathname = parsedUrl.pathname;

    console.log(method, pathname);

    // --- Registration Endpoint ---
    // Expects { name, userId, password, gmail }
    if (method === 'POST' && pathname === '/register') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk; 
        });
        req.on('end', () => {
            try {
                const { name, userId, password, gmail } = JSON.parse(body);
                if (!name || !userId || !password || !gmail) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'All fields are required' }));
                    return;
                }
                const filePath = getUserFilePath(userId);
                if (fs.existsSync(filePath)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'User already exists' }));
                    return;
                }
                const user = {
                    name,
                    userId,
                    password,
                    gmail,
                    tasks: {} // Tasks stored by date (YYYY-MM-DD)
                };
                saveUser(user);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'User registered successfully' }));
            } catch (e) {
                console.error(e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    // --- Login Endpoint ---
    // Expects { userId, password }
    if (method === 'POST' && pathname === '/login') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { userId, password } = JSON.parse(body);
                if (!userId || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'UserId and password required' }));
                    return;
                }
                const user = loadUser(userId);
                if (!user || user.password !== password) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid credentials' }));
                    return;
                }
                // Create session
                const sessionId = crypto.randomBytes(16).toString('hex');
                sessions[sessionId] = userId;
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Set-Cookie': `sessionId=${sessionId}; HttpOnly`
                });
                res.end(JSON.stringify({ message: 'Login successful' }));
            } catch (e) {
                console.error(e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    // --- Protected Routes Middleware ---
    const protectedRoutes = ['/addTask', '/completeTask', '/deleteTask', '/editTask', '/getTasks', '/getAnalysis', '/logout'];
    if (protectedRoutes.includes(pathname)) {
        const cookies = parseCookies(req.headers.cookie);
        const sessionId = cookies['sessionId'];
        if (!sessionId || !sessions[sessionId]) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        req.userId = sessions[sessionId];
    }

    // --- Add Task ---
    // Expects { task }
    if (method === 'POST' && pathname === '/addTask') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { task } = JSON.parse(body);
                if (!task) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Task content required' }));
                    return;
                }
                const user = loadUser(req.userId);
                const today = getTodayDate();
                if (!user.tasks[today]) {
                    user.tasks[today] = [];
                }
                const newTask = {
                    id: Date.now(),
                    text: task,
                    completed: false,
                    date: today
                };
                user.tasks[today].push(newTask);
                saveUser(user);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Task added', task: newTask }));
            } catch (e) {
                console.error(e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    // --- Complete Task ---
    // Expects { taskId }
    if (method === 'POST' && pathname === '/completeTask') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { taskId } = JSON.parse(body);
                if (!taskId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Task ID required' }));
                    return;
                }
                const user = loadUser(req.userId);
                const today = getTodayDate();
                if (!user.tasks[today]) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No tasks for today' }));
                    return;
                }
                const task = user.tasks[today].find(t => t.id == taskId);
                if (!task) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Task not found' }));
                    return;
                }
                task.completed = true;
                saveUser(user);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Task marked as complete' }));
            } catch (e) {
                console.error(e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    // --- Delete Task ---
    // Expects { taskId }
    if (method === 'POST' && pathname === '/deleteTask') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { taskId } = JSON.parse(body);
                if (!taskId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Task ID required' }));
                    return;
                }
                const user = loadUser(req.userId);
                const today = getTodayDate();
                if (!user.tasks[today]) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No tasks for today' }));
                    return;
                }
                user.tasks[today] = user.tasks[today].filter(t => t.id != taskId);
                saveUser(user);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Task deleted' }));
            } catch (e) {
                console.error(e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    // --- Edit Task ---
    // Expects { taskId, newText }
    if (method === 'POST' && pathname === '/editTask') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { taskId, newText } = JSON.parse(body);
                if (!taskId || !newText) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Task ID and new text required' }));
                    return;
                }
                const user = loadUser(req.userId);
                const today = getTodayDate();
                if (!user.tasks[today]) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No tasks for today' }));
                    return;
                }
                const task = user.tasks[today].find(t => t.id == taskId);
                if (!task) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Task not found' }));
                    return;
                }
                task.text = newText;
                saveUser(user);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Task updated' }));
            } catch (e) {
                console.error(e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    // --- Get Tasks ---
    // Returns tasks for today
    if (method === 'GET' && pathname === '/getTasks') {
        try {
            const user = loadUser(req.userId);
            const today = getTodayDate();
            const tasks = user.tasks[today] || [];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ tasks }));
        } catch (e) {
            console.error(e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
        return;
    }

    // --- Get Analysis ---
    // Returns analysis data for the previous 7 days (including today)
    if (method === 'GET' && pathname === '/getAnalysis') {
        try {
            const user = loadUser(req.userId);
            const analysis = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateKey = d.toISOString().split('T')[0];
                const tasks = user.tasks[dateKey] || [];
                const total = tasks.length;
                const completed = tasks.filter(t => t.completed).length;
                analysis.push({
                    date: dateKey,
                    total,
                    completed,
                    tasks
                });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ analysis }));
        } catch (e) {
            console.error(e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
        return;
    }

    // --- Logout Endpoint ---
    if (method === 'GET' && pathname === '/logout') {
        const cookies = parseCookies(req.headers.cookie);
        const sessionId = cookies['sessionId'];
        if (sessionId) {
            delete sessions[sessionId];
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': `sessionId=; Max-Age=0` });
        res.end(JSON.stringify({ message: 'Logged out' }));
        return;
    }

    // --- Static File Serving ---
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    fs.exists(filePath, exists => {
        if (exists) {
            const contentType = getContentType(filePath);
            serveStaticFile(filePath, contentType, res);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
