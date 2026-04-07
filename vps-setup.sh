#!/bin/bash
# ================================================
# BuildPOS — VPS Boshlang'ich Sozlash Skripti
# Ubuntu 24.04 uchun
# primestroy.uz
# ================================================
# ISHLATISH: VPS ga SSH bilan kirgach:
#   chmod +x vps-setup.sh && sudo bash vps-setup.sh
# ================================================

set -e  # Xato bo'lsa to'xta

echo "================================================"
echo "  BuildPOS VPS Setup — primestroy.uz"
echo "================================================"

# --------------------------------
# 1. Tizim yangilash
# --------------------------------
echo ""
echo ">>> 1. Tizim yangilanmoqda..."
apt update && apt upgrade -y

# --------------------------------
# 2. Kerakli dasturlar
# --------------------------------
echo ""
echo ">>> 2. Kerakli dasturlar o'rnatilmoqda..."
apt install -y \
  curl \
  git \
  ufw \
  fail2ban \
  certbot \
  python3-certbot-nginx \
  cron

# --------------------------------
# 3. Docker o'rnatish
# --------------------------------
echo ""
echo ">>> 3. Docker o'rnatilmoqda..."
curl -fsSL https://get.docker.com | bash
systemctl enable docker
systemctl start docker

# Docker Compose plugin tekshirish
docker compose version

# --------------------------------
# 4. UFW Firewall
# --------------------------------
echo ""
echo ">>> 4. Firewall sozlanmoqda..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH (avval standart port)
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw --force enable

echo "Firewall holati:"
ufw status

# --------------------------------
# 5. Fail2ban
# --------------------------------
echo ""
echo ">>> 5. Fail2ban sozlanmoqda..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_log)s

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# --------------------------------
# 6. Loyiha papkasi
# --------------------------------
echo ""
echo ">>> 6. Loyiha papkasi yaratilmoqda..."
mkdir -p /opt/buildpos
mkdir -p /opt/backups

# --------------------------------
# 7. Backup cron job
# --------------------------------
echo ""
echo ">>> 7. Backup cron job sozlanmoqda..."
cat > /etc/cron.d/buildpos-backup << 'EOF'
# Har kuni soat 03:00 da PostgreSQL backup
0 3 * * * root docker exec buildpos-postgres pg_dump -U buildpos_user buildpos_db > /opt/backups/buildpos_$(date +\%Y\%m\%d).sql 2>/dev/null
# 7 kundan eski backuplarni o'chirish
0 4 * * * root find /opt/backups -name "*.sql" -mtime +7 -delete
EOF

# --------------------------------
# Yakuniy xabar
# --------------------------------
echo ""
echo "================================================"
echo "✅ VPS boshlang'ich sozlash tugadi!"
echo ""
echo "Keyingi qadamlar:"
echo ""
echo "1. Domenni VPS IP ga bog'lang (DNS A record)"
echo "   primestroy.uz → $(curl -s ifconfig.me)"
echo ""
echo "2. GitHub dan kodni clone qiling:"
echo "   cd /opt/buildpos"
echo "   git clone https://github.com/USERNAME/buildpos.git ."
echo ""
echo "3. .env fayl yarating:"
echo "   cp .env.example .env"
echo "   nano .env    # qiymatlarni to'ldiring"
echo ""
echo "4. SSL sertifikat oling (DNS tarqalgach):"
echo "   certbot --nginx -d primestroy.uz -d www.primestroy.uz"
echo ""
echo "5. Docker ishga tushiring:"
echo "   docker compose up --build -d"
echo ""
echo "================================================"
