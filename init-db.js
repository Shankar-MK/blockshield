const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'database');
const dbPath = path.join(dbDir, 'security_platform.db');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Create tables
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            is_locked INTEGER DEFAULT 0,
            failed_attempts INTEGER DEFAULT 0,
            locked_until DATETIME
        )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('✓ Users table created/verified');
        }
    });

    // Simulations table
    db.run(`
        CREATE TABLE IF NOT EXISTS simulations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            difficulty TEXT,
            category TEXT,
            estimated_time TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating simulations table:', err.message);
        } else {
            console.log('✓ Simulations table created/verified');
        }
    });

    // User simulation results table
    db.run(`
        CREATE TABLE IF NOT EXISTS simulation_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            simulation_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            score INTEGER,
            duration_seconds INTEGER,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            details TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (simulation_id) REFERENCES simulations(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error creating simulation_results table:', err.message);
        } else {
            console.log('✓ Simulation results table created/verified');
        }
    });

    // Attack logs table (for monitoring brute force attempts)
    db.run(`
        CREATE TABLE IF NOT EXISTS attack_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            ip_address TEXT,
            user_agent TEXT,
            attack_type TEXT,
            success INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            details TEXT
        )
    `, (err) => {
        if (err) {
            console.error('Error creating attack_logs table:', err.message);
        } else {
            console.log('✓ Attack logs table created/verified');
        }
    });

    // Insert default simulations
    const insertSimulation = db.prepare(`
        INSERT OR IGNORE INTO simulations (id, name, description, difficulty, category, estimated_time)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const simulations = [
        [1, 'Brute Force Attack', 'Simulate password cracking using dictionary and brute force techniques', 'Medium', 'Authentication', '2-4 hours'],
        [2, 'Network Port Scanning', 'Discover open ports and services on target systems', 'Easy', 'Network', '30 minutes'],
        [3, 'SQL Injection', 'Exploit database vulnerabilities through malicious SQL queries', 'Medium', 'Web Application', '1-2 hours'],
        [4, 'Social Engineering', 'Test human factors in security through phishing simulations', 'Hard', 'Social', '3-5 hours'],
        [5, 'XSS (Cross-Site Scripting)', 'Inject malicious scripts into web applications', 'Medium', 'Web Application', '1-2 hours'],
        [6, 'Man-in-the-Middle Attack', 'Intercept and analyze network communications', 'Hard', 'Network', '2-3 hours'],
        [7, 'Privilege Escalation', 'Gain unauthorized elevated access to system resources', 'Hard', 'System', '3-4 hours'],
        [8, 'DDoS Simulation', 'Understand distributed denial of service attack patterns', 'Medium', 'Network', '1-2 hours']
    ];

    simulations.forEach(sim => {
        insertSimulation.run(sim, (err) => {
            if (err && !err.message.includes('UNIQUE constraint')) {
                console.error('Error inserting simulation:', err.message);
            }
        });
    });

    insertSimulation.finalize();
    console.log('✓ Default simulations inserted/verified');
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('\n✓ Database initialized successfully!');
        console.log('Database location:', dbPath);
    }
});
