require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const DB_PATH = process.env.DB_PATH || './database/security_platform.db';

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Promisify database methods for cleaner async/await usage
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(express.static('public'));

// Rate limiting for brute force protection
const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { message: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiter for login endpoint
const strictLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100000, // Limit each IP to 20 login requests per window
    skipSuccessfulRequests: true,
});

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Helper function to log attack attempts
async function logAttack(email, ipAddress, userAgent, attackType, success, details = '') {
    try {
        await dbRun(
            `INSERT INTO attack_logs (email, ip_address, user_agent, attack_type, success, details)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [email, ipAddress, userAgent, attackType, success ? 1 : 0, details]
        );
    } catch (error) {
        console.error('Error logging attack:', error);
    }
}

// Helper function to check if account is locked
async function checkAccountLock(email) {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) return { locked: false };
    
    if (user.is_locked && user.locked_until) {
        const lockExpiry = new Date(user.locked_until);
        if (new Date() < lockExpiry) {
            return { 
                locked: true, 
                message: `Account locked due to too many failed attempts. Try again after ${lockExpiry.toLocaleString()}`
            };
        } else {
            // Unlock account if lock period has expired
            await dbRun(
                'UPDATE users SET is_locked = 0, failed_attempts = 0, locked_until = NULL WHERE email = ?',
                [email]
            );
            return { locked: false };
        }
    }
    
    return { locked: false };
}

// Routes
// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        // Check if user already exists
        const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const result = await dbRun(
            `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: result.id, name, email }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Login endpoint with brute force protection
app.post('/api/login', async (req, res) => {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if account is locked
        const lockCheck = await checkAccountLock(email);
        if (lockCheck.locked) {
            await logAttack(email, ipAddress, userAgent, 'brute_force', false, 'Account locked');
            return res.status(423).json({ message: lockCheck.message });
        }

        // Find user
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!user) {
            await logAttack(email, ipAddress, userAgent, 'brute_force', false, 'User not found');
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            // Increment failed attempts
            const failedAttempts = (user.failed_attempts || 0) + 1;
            const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 1000;
            
            if (failedAttempts >= maxAttempts) {
                // Lock account
                const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MS) || 5 * 60 * 1000;
                const lockedUntil = new Date(Date.now() + lockoutDuration);
                
                await dbRun(
                    `UPDATE users SET failed_attempts = ?, is_locked = 1, locked_until = ? WHERE email = ?`,
                    [failedAttempts, lockedUntil.toISOString(), email]
                );
                
                await logAttack(email, ipAddress, userAgent, 'brute_force', false, `Account locked after ${failedAttempts} attempts`);
                
                return res.status(423).json({ 
                    message: `Account locked due to too many failed attempts. Try again after ${lockedUntil.toLocaleString()}`
                });
            } else {
                await dbRun(
                    'UPDATE users SET failed_attempts = ? WHERE email = ?',
                    [failedAttempts, email]
                );
                
                await logAttack(email, ipAddress, userAgent, 'brute_force', false, `Failed attempt ${failedAttempts}/${maxAttempts}`);
                
                return res.status(400).json({ 
                    message: `Invalid credentials. ${maxAttempts - failedAttempts} attempts remaining.`
                });
            }
        }

        // Successful login - reset failed attempts
        await dbRun(
            'UPDATE users SET failed_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE email = ?',
            [email]
        );

        await logAttack(email, ipAddress, userAgent, 'brute_force', true, 'Successful login');

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION || '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email,
                role: user.role 
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        await logAttack(req.body.email, ipAddress, userAgent, 'brute_force', false, 'Server error');
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get user profile
app.get('/api/user-profile', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet(
            'SELECT id, name, email, role, created_at, last_login FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all simulations
app.get('/api/simulations', authenticateToken, async (req, res) => {
    try {
        const simulations = await dbAll('SELECT * FROM simulations ORDER BY category, difficulty');
        res.json(simulations);
    } catch (error) {
        console.error('Error fetching simulations:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get simulation by ID
app.get('/api/simulations/:id', authenticateToken, async (req, res) => {
    try {
        const simulation = await dbGet(
            'SELECT * FROM simulations WHERE id = ?',
            [req.params.id]
        );

        if (!simulation) {
            return res.status(404).json({ message: 'Simulation not found' });
        }

        res.json(simulation);
    } catch (error) {
        console.error('Error fetching simulation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Start a simulation
app.post('/api/simulations/:id/start', authenticateToken, async (req, res) => {
    try {
        const simulationId = parseInt(req.params.id);
        const userId = req.user.id;

        // Check if simulation exists
        const simulation = await dbGet('SELECT * FROM simulations WHERE id = ?', [simulationId]);
        if (!simulation) {
            return res.status(404).json({ message: 'Simulation not found' });
        }

        // Create simulation result record
        const result = await dbRun(
            `INSERT INTO simulation_results (user_id, simulation_id, status)
             VALUES (?, ?, 'running')`,
            [userId, simulationId]
        );

        res.json({
            message: 'Simulation started successfully',
            resultId: result.id,
            simulation: simulation,
            status: 'running',
            startTime: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error starting simulation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Complete a simulation
app.post('/api/simulations/:id/complete', authenticateToken, async (req, res) => {
    try {
        const { resultId, score, details } = req.body;
        const userId = req.user.id;

        // Find the result and verify ownership
        const result = await dbGet(
            'SELECT * FROM simulation_results WHERE id = ? AND user_id = ?',
            [resultId, userId]
        );

        if (!result) {
            return res.status(404).json({ message: 'Simulation result not found' });
        }

        // Calculate duration
        const startTime = new Date(result.started_at);
        const endTime = new Date();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        // Update result
        await dbRun(
            `UPDATE simulation_results 
             SET status = 'completed', score = ?, duration_seconds = ?, completed_at = CURRENT_TIMESTAMP, details = ?
             WHERE id = ?`,
            [score || 0, durationSeconds, details || '', resultId]
        );

        res.json({
            message: 'Simulation completed',
            score,
            duration: durationSeconds
        });
    } catch (error) {
        console.error('Error completing simulation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get user's simulation results
app.get('/api/results', authenticateToken, async (req, res) => {
    try {
        const results = await dbAll(
            `SELECT 
                sr.id,
                sr.status,
                sr.score,
                sr.duration_seconds,
                sr.started_at,
                sr.completed_at,
                s.name as simulation_name,
                s.difficulty,
                s.category
             FROM simulation_results sr
             JOIN simulations s ON sr.simulation_id = s.id
             WHERE sr.user_id = ?
             ORDER BY sr.started_at DESC
             LIMIT 500`,
            [req.user.id]
        );

        res.json(results);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get attack logs (admin only or for the user's own attempts)
app.get('/api/attack-logs', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
        
        let logs;
        if (user.role === 'admin') {
            // Admin can see all logs
            logs = await dbAll(
                'SELECT * FROM attack_logs ORDER BY timestamp DESC LIMIT 100'
            );
        } else {
            // Users can see their own logs
            logs = await dbAll(
                'SELECT * FROM attack_logs WHERE email = ? ORDER BY timestamp DESC LIMIT 50',
                [user.email]
            );
        }

        res.json(logs);
    } catch (error) {
        console.error('Error fetching attack logs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Dashboard statistics
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get total simulations completed
        const completedCount = await dbGet(
            'SELECT COUNT(*) as count FROM simulation_results WHERE user_id = ? AND status = "completed"',
            [userId]
        );

        // Get average score
        const avgScore = await dbGet(
            'SELECT AVG(score) as average FROM simulation_results WHERE user_id = ? AND status = "completed"',
            [userId]
        );

        // Get total time spent
        const totalTime = await dbGet(
            'SELECT SUM(duration_seconds) as total FROM simulation_results WHERE user_id = ? AND status = "completed"',
            [userId]
        );

        // Get recent activity
        const recentActivity = await dbAll(
            `SELECT 
                sr.id,
                s.name,
                sr.status,
                sr.score,
                sr.started_at
             FROM simulation_results sr
             JOIN simulations s ON sr.simulation_id = s.id
             WHERE sr.user_id = ?
             ORDER BY sr.started_at DESC
             LIMIT 1000`,
            [userId]
        );

        res.json({
            completedSimulations: completedCount.count || 0,
            averageScore: Math.round(avgScore.average || 0),
            totalTimeSpent: totalTime.total || 0,
            recentActivity
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        }
        console.log('\nDatabase connection closed');
        process.exit(0);
    });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║   Security Training Platform - Brute Force Simulation     ║
╚═══════════════════════════════════════════════════════════╝

Server running on: http://0.0.0.0:${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
Database: ${DB_PATH}

Ready to accept connections...
    `);
});

