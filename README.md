# BruteShield - Security Training Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)

An advanced penetration testing training platform designed for cybersecurity professionals and enthusiasts. Practice brute force attacks, network scanning, SQL injection, and more in a controlled, ethical environment.

## 🎯 Features

- **Authentication System** with brute force protection
- **Multiple Attack Simulations**:
  - Brute Force Attack
  - Network Port Scanning
  - SQL Injection
  - Social Engineering
  - XSS (Cross-Site Scripting)
  - Man-in-the-Middle Attack
  - Privilege Escalation
  - DDoS Simulation

- **Security Features**:
  - Rate limiting
  - Account lockout after failed attempts
  - Attack logging and monitoring
  - JWT-based authentication
  - Bcrypt password hashing

- **User Dashboard**:
  - Track simulation progress
  - View attack logs
  - Monitor statistics
  - Review results

## 🛠️ Tech Stack

### Backend
- Node.js & Express.js
- SQLite3 (Database)
- JWT (Authentication)
- Bcrypt.js (Password Hashing)
- Express Rate Limit (DDoS Protection)

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Modern CSS with custom properties
- Responsive design
- Cybersecurity-themed UI

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Kali Linux (for performing attacks)

## 🚀 Installation

### 1. Clone or Download the Project

```bash
cd brute-force-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Initialize the Database

```bash
npm run init-db
```

This will create the SQLite database with all necessary tables and default simulations.

### 4. Configure Environment Variables

The `.env` file is already created with default values. For production, update these values:

```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h
DB_PATH=./database/security_platform.db
```

### 5. Start the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📖 Usage Guide

### For Regular Users

1. **Registration**
   - Navigate to the landing page
   - Click "Get Started" or "Register"
   - Fill in your details (name, email, password)
   - Password must be at least 8 characters

2. **Login**
   - Click "Sign In"
   - Enter your credentials
   - Note: After 5 failed attempts, your account will be locked for 5 minutes

3. **Dashboard**
   - View your statistics (completed simulations, average score, time spent)
   - Browse available simulations
   - Start a simulation by clicking on it
   - View your results and attack logs

### For Penetration Testers (Kali Linux)

#### Setting Up Attack Environment

1. **Target Information**
   - Target URL: `http://[SERVER-IP]:3000`
   - API Endpoints:
     - Registration: `POST /api/register`
     - Login: `POST /api/login`
     - Protected Routes: Require JWT token

2. **Example: Brute Force Attack with Hydra**

```bash
# Create a password list
cat > passwords.txt << EOF
password123
admin123
test1234
letmein
password
EOF

# Create username list (or use a single email)
cat > users.txt << EOF
test@example.com
admin@test.com
EOF

# Perform brute force attack using Hydra
hydra -L users.txt -P passwords.txt \
  [SERVER-IP] http-post-form \
  "/api/login:email=^USER^&password=^PASS^:Invalid credentials" \
  -V -f
```

3. **Example: Using Python Script**

```python
import requests
import time

BASE_URL = "http://localhost:3000"

# List of passwords to try
passwords = ["password123", "admin123", "test1234", "letmein"]

# Target email
email = "test@example.com"

for password in passwords:
    try:
        response = requests.post(
            f"{BASE_URL}/api/login",
            json={"email": email, "password": password},
            timeout=5
        )
        
        print(f"Tried password: {password}")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print(f"\n[SUCCESS] Password found: {password}")
            print(f"Token: {response.json()['token']}")
            break
        
        # Respect rate limiting
        time.sleep(1)
        
    except Exception as e:
        print(f"Error: {e}")
```

4. **Example: SQL Injection Testing**

```bash
# Test for SQL injection vulnerabilities
sqlmap -u "http://localhost:3000/api/login" \
  --data="email=test@example.com&password=test" \
  --batch --level=5 --risk=3
```

5. **Example: Network Scanning**

```bash
# Scan the server for open ports
nmap -sV -p- localhost

# Check for vulnerabilities
nmap --script vuln localhost
```

## 🔒 Security Features

### Brute Force Protection

- **Rate Limiting**: 20 login attempts per 15 minutes per IP
- **Account Lockout**: 5 failed attempts = 5-minute lockout
- **Attack Logging**: All attempts are logged with IP, timestamp, and details

### Authentication

- **JWT Tokens**: Expire after 24 hours
- **Bcrypt Hashing**: All passwords are hashed with salt rounds of 10
- **Protected Routes**: All simulation and user data routes require valid JWT

### Monitoring

- **Attack Logs**: Track all authentication attempts
- **Real-time Stats**: Monitor success/failure rates
- **User Activity**: Track simulation attempts and results

## 📁 Project Structure

```
brute-force-platform/
├── server.js              # Main server file
├── init-db.js            # Database initialization
├── package.json          # Dependencies
├── .env                  # Environment variables
├── database/
│   └── security_platform.db  # SQLite database
└── public/
    ├── index.html        # Main HTML file
    ├── css/
    │   └── styles.css    # Styling
    └── js/
        └── app.js        # Frontend JavaScript
```

## 🗃️ Database Schema

### Users Table
- `id`, `name`, `email`, `password`, `role`
- `created_at`, `last_login`
- `is_locked`, `failed_attempts`, `locked_until`

### Simulations Table
- `id`, `name`, `description`, `difficulty`
- `category`, `estimated_time`, `created_at`

### Simulation Results Table
- `id`, `user_id`, `simulation_id`
- `status`, `score`, `duration_seconds`
- `started_at`, `completed_at`, `details`

### Attack Logs Table
- `id`, `email`, `ip_address`, `user_agent`
- `attack_type`, `success`, `timestamp`, `details`

## 🎓 Learning Objectives

This platform helps you learn:

1. **Offensive Security**
   - How attackers perform brute force attacks
   - Common attack patterns and techniques
   - Tool usage (Hydra, Metasploit, etc.)

2. **Defensive Security**
   - Implementing rate limiting
   - Account lockout mechanisms
   - Attack detection and logging
   - Secure authentication practices

3. **Best Practices**
   - Password hashing with bcrypt
   - JWT token management
   - Input validation
   - Security headers

## ⚠️ Legal Disclaimer

This platform is for **EDUCATIONAL PURPOSES ONLY**. 

- Only use this tool on systems you own or have explicit permission to test
- Unauthorized access to computer systems is illegal
- The creators are not responsible for misuse of this software
- Always follow ethical hacking guidelines and local laws

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues or questions:
1. Check the logs in the terminal
2. Review the database entries
3. Check browser console for errors
4. Ensure all dependencies are installed

## 🔄 Upcoming Features

- [ ] Multi-factor authentication
- [ ] Advanced attack scenarios
- [ ] Team collaboration features
- [ ] Detailed analytics dashboard
- [ ] Export reports (PDF)
- [ ] Docker containerization
- [ ] API documentation with Swagger

---

**Remember**: With great power comes great responsibility. Use this platform ethically and legally.

Happy Learning! 🚀🔐
