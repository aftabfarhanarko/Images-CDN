# ⚡ SquadLog CDN (High-Performance Image & Asset CDN Service)

A production-ready NestJS-based **Image Optimization & Asset CDN Service**. It processes, crops, compresses, and converts images on-the-fly using **Sharp**, uploads them to **Cloudflare R2** (or local storage fallback), and delivers them with high-performance HTTP browser caching.

---

## 💡 কীভাবে এই CDN কাজ করে? (How It Works)

```
[ Client App / Frontend ]
          │
          │ 1. Upload File (FormData + Query Params)
          ▼
┌────────────────────────────────────────────────────────┐
│  SquadLog CDN (NestJS Backend @ Port 8000)             │
│                                                        │
│  1. File Validation (Multer: max 15MB, PNG/JPG/WebP..) │
│  2. Sharp Engine Processing:                           │
│     - Resizing (width, height)                         │
│     - Format conversion (WebP, AVIF, JPEG, PNG)        │
│     - Compression & Smart Cropping                     │
│  3. Storage Handler (StorageService):                  │
│     - Cloudflare R2 Object Storage (if configured)     │
│     - Local `/uploads` directory (fallback)            │
└────────────────────────────────────────────────────────┘
          │
          │ 4. Returns Public CDN URL & Optimization Stats
          ▼
[ JSON Response with optimized image URL ]
```

---

## 🔥 Key Features

- 📸 **Automatic Image Optimization**: Converts uploaded images to WebP/AVIF format automatically for up to **70-90% file size reduction**.
- 📐 **Dynamic Resizing & Smart Cropping**: Resize on upload via query parameters (`w`, `h`, `q`, `format`, `crop`).
- ☁️ **Dual Storage Architecture**:
  - **Cloudflare R2 / S3 Storage**: Primary choice for zero-bandwidth cost global CDN delivery.
  - **Local Disk Fallback**: Automatically saves to `./uploads` if Cloudflare R2 credentials are not set.
- ⚡ **Aggressive Browser Caching**: Serves static files with `Cache-Control: public, max-age=31536000, immutable`.
- 🛡️ **Cross-Origin Resource Sharing (CORS)**: Pre-configured for approved domains (`rajseba.in`, `household-services-frontend-lc2h.vercel.app`, `ai-power-admin-console.vercel.app`, `localhost:3000`, etc.) and dynamic `.env` configuration.
- 🏥 **Health Monitoring Endpoint**: `/health` endpoint providing uptime and RSS/Heap memory statistics.

---

## 📡 API Endpoints

### 1. Upload & Optimize Image (`POST /upload/image`)

Upload an image and optionally apply real-time Sharp transformations.

- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Form Field Name**: `file`

#### Optional Query Parameters:
| Parameter | Type | Default | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `w` | number | - | Target width in pixels | `?w=800` |
| `h` | number | - | Target height in pixels | `?h=600` |
| `q` | number | `80` | Compression quality (1-100) | `?q=85` |
| `format` | string | `webp` | Target format (`webp`, `avif`, `jpeg`, `png`) | `?format=webp` |
| `crop` | string | `false` | Smart focal crop to match width & height | `?crop=true` |

#### Example Request (cURL):
```bash
curl -X POST "http://localhost:8000/upload/image?w=800&q=80&format=webp" \
  -F "file=@/path/to/my-photo.png"
```

#### Example Response:
```json
{
  "success": true,
  "message": "File processed & uploaded successfully to AI CDN",
  "url": "https://cdn.yourdomain.com/uploads/1768673800108-386916113.webp",
  "filename": "1768673800108-386916113.webp",
  "originalName": "my-photo.png",
  "size": 42150,
  "mimetype": "image/webp",
  "optimization": {
    "width": 800,
    "height": 600,
    "originalSize": 450200,
    "optimizedSize": 42150,
    "saved": "90.64%"
  }
}
```

---

### 2. Service Health Check (`GET /health`)

Returns uptime and memory usage metrics.

```bash
curl http://localhost:8000/health
```

#### Response:
```json
{
  "status": "ok",
  "service": "squadlog-cdn",
  "timestamp": "2026-09-06T22:21:00.000Z",
  "uptimeSeconds": 1420,
  "memoryUsageMB": {
    "rss": 54,
    "heapUsed": 28
  }
}
```

---

## 🛠️ Usage Examples for Frontend

### JavaScript / React / Next.js

```typescript
const uploadImageToCDN = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  // Optional optimization parameters
  const params = new URLSearchParams({
    w: '1200',
    q: '85',
    format: 'webp',
  });

  const response = await fetch(`https://cdn.yourdomain.com/upload/image?${params}`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  console.log('Optimized CDN Image URL:', data.url);
  return data.url;
};
```

---

## ⚙️ Environment Variables (`.env`)

```env
NODE_ENV=production
PORT=8000

# Base URL for public links
BACKEND_URL=https://cdn.yourdomain.com

# Allowed CORS Origins (comma-separated)
ALLOWED_ORIGINS=https://rajseba.in,https://household-services-frontend-lc2h.vercel.app,https://ai-power-admin-console.vercel.app

# Cloudflare R2 Configuration (Optional)
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_DOMAIN=https://cdn-assets.yourdomain.com
```

---

## 🚀 Hostinger Deployment

For complete instructions on deploying to Hostinger (VPS with PM2 / Docker / Nginx or Hostinger hPanel Node.js Selector), please read [HOSTINGER_DEPLOYMENT.md](file:///home/aftab-farhan/projects/squadlog-cdn/HOSTINGER_DEPLOYMENT.md).

```bash
# Start in production mode using PM2
pm2 start ecosystem.config.js --env production
```
