#!/usr/bin/env bash
# =============================================================
# HerdSync V2 — Server Hardening Script
# Run once as root on the Lesotho Government Data Center server
# after initial OS installation and before deploying containers.
# Tested on Ubuntu 22.04 LTS.
# =============================================================
set -euo pipefail

echo "=== HerdSync V2 Server Hardening ==="

# ── System updates ────────────────────────────────────────────
apt-get update -y && apt-get upgrade -y
apt-get install -y ufw fail2ban unattended-upgrades

# ── UFW firewall ──────────────────────────────────────────────
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw allow 443/tcp   # HTTPS
# Internal-only: allow Ministry network to reach Kong and Studio directly
# Adjust 196.3.0.0/16 to the actual GoL internal IP range
ufw allow from 196.3.0.0/16 to any port 8000
ufw allow from 196.3.0.0/16 to any port 3000
ufw --force enable
echo "[OK] UFW firewall configured"

# ── Fail2ban ──────────────────────────────────────────────────
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
EOF
systemctl enable fail2ban && systemctl restart fail2ban
echo "[OK] Fail2ban configured"

# ── Disable root SSH login ────────────────────────────────────
sed -i 's/^PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
echo "[OK] SSH hardened (root login and password auth disabled)"

# ── Automatic security updates ────────────────────────────────
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
echo "[OK] Automatic security updates enabled"

# ── Docker socket permissions ─────────────────────────────────
# Only add the herdsync service user — never add generic users
if id herdsync &>/dev/null; then
  usermod -aG docker herdsync
  echo "[OK] herdsync user added to docker group"
fi

# ── Log rotation for HerdSync ────────────────────────────────
cat > /etc/logrotate.d/herdsync <<'EOF'
/var/log/herdsync*.log /var/log/nginx/herdsync*.log {
    daily
    rotate 30
    compress
    missingok
    notifempty
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
EOF
echo "[OK] Log rotation configured"

# ── Backup directory ─────────────────────────────────────────
mkdir -p /var/backups/herdsync
chmod 700 /var/backups/herdsync
echo "[OK] Backup directory created"

echo ""
echo "=== Hardening complete. Reboot recommended. ==="
