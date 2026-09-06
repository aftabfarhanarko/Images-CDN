# 🚀 Hostinger Deployment Guide for SquadLog CDN (`squadlog-cdn`)

This guide provides step-by-step instructions to deploy **SquadLog CDN** (NestJS + Sharp Image Processing) on **Hostinger**.

---

## 📋 Overview of Deployment Methods

| Deployment Method | Recommended Plan | Description |
| :--- | :--- | :--- |
| **Option A: Hostinger VPS (PM2 + Nginx)** ⭐ | VPS 1 / VPS 2 | **Most Recommended**: Full control, fast Sharp image processing, custom Nginx caching, SSL, auto-restarts via PM2. |
| **Option B: Hostinger VPS (Docker)** ⭐ | VPS 1 / VPS 2 | Isolated containerized deployment using Docker & Docker Compose. |
| **Option C: Hostinger hPanel Node.js App** | Business / Cloud Hosting | Shared Node.js runtime managed by hPanel (CloudLinux / Passenger). |

---

## 🛠️ Method A: Hostinger VPS Setup (PM2 + Nginx + Certbot) - Recommended

### Step 1: Connect to your Hostinger VPS
```bash
ssh root@<YOUR_HOSTINGER_VPS_IP>
```

### Step 2: Install Node.js, PM2 & Nginx
```bash
# Update package list & install tools
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

### Step 3: Clone Project & Build
```bash
# Navigate to web root
cd /var/www

# Clone repository
git clone <YOUR_GIT_REPOSITORY_URL> squadlog-cdn
cd squadlog-cdn

# Install dependencies & build
npm ci
npm run build
```

### Step 4: Configure Environment Variables
Create `.env` file inside `/var/www/squadlog-cdn`:
```bash
nano .env
```
Paste your production configuration:
```env
NODE_ENV=production
PORT=8000
BACKEND_URL=https://cdn.yourdomain.com
ALLOWED_ORIGINS=https://your-frontend.com,https://your-console.com

# Cloudflare R2 (Optional)
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_DOMAIN=https://cdn-assets.yourdomain.com
```

### Step 5: Start Application with PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Step 6: Configure Nginx & SSL
```bash
# Copy nginx config template
sudo cp nginx.conf /etc/nginx/sites-available/squadlog-cdn

# Edit domain name inside the file
sudo nano /etc/nginx/sites-available/squadlog-cdn
# Change server_name to your domain (e.g. cdn.yourdomain.com)

# Enable site & restart Nginx
sudo ln -s /etc/nginx/sites-available/squadlog-cdn /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Generate Free SSL Certificate (HTTPS)
sudo certbot --nginx -d cdn.yourdomain.com
```

---

## 🐳 Method B: Hostinger VPS Setup (Docker)

### Step 1: Install Docker & Docker Compose on VPS
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### Step 2: Build & Run Container
```bash
# Build Docker image
docker build -t squadlog-cdn:latest .

# Run container on port 8000
docker run -d \
  --name squadlog-cdn \
  --restart always \
  -p 8000:8000 \
  -v squadlog_uploads:/app/uploads \
  --env-file .env \
  squadlog-cdn:latest
```

---

## 🌐 Method C: Hostinger Shared / Cloud Hosting (hPanel Node.js Selector)

1. **Log in to Hostinger hPanel**:
   - Go to **Websites** -> **Manage** -> **Setup Node.js App**.
2. **Create Application Settings**:
   - **Node.js version**: `20.x` or `22.x`
   - **Application mode**: `Production`
   - **Application root**: `squadlog-cdn`
   - **Application URL**: `cdn.yourdomain.com`
   - **Application startup file**: `dist/main.js`
3. **Upload Files**:
   - Upload the project files (or git clone via SSH) to `squadlog-cdn`.
4. **Build & Install Dependencies**:
   - Click **Run npm install** in hPanel.
   - Run build command in SSH terminal: `npm run build`.
5. **Environment Variables**:
   - Add variables (`NODE_ENV`, `PORT`, `BACKEND_URL`, etc.) under Environment Variables in hPanel.
6. **Restart Application**:
   - Click **Restart App** in hPanel.

---

## 🔍 Verification & Health Check

After deployment, test your server status:

1. **Health Check Endpoint**:
   ```bash
   curl https://cdn.yourdomain.com/health
   ```
   *Expected Response*:
   ```json
   {
     "status": "ok",
     "service": "squadlog-cdn",
     "timestamp": "2026-09-06T22:18:00.000Z",
     "uptimeSeconds": 120,
     "memoryUsageMB": { "rss": 45, "heapUsed": 25 }
   }
   ```

2. **Test Image Upload API**:
   ```bash
   curl -X POST https://cdn.yourdomain.com/upload/image \
     -F "file=@test-image.jpg"
   ```

---

## 🛠️ Maintenance & Useful Commands

- **Check PM2 Logs**: `pm2 logs squadlog-cdn`
- **Restart PM2 App**: `pm2 restart squadlog-cdn`
- **Check Health Status**: `curl http://localhost:8000/health`
- **Check Nginx Status**: `sudo systemctl status nginx`
