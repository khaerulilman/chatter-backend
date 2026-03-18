---
applyTo: "**"
---

# Skill: Create a New API Endpoint (Chatter Project)

Panduan lengkap step-by-step untuk membuat API endpoint baru di project Chatter.
Gunakan contoh **Likes API** sebagai referensi implementasi.

---

## Overview Alur Pembuatan API Baru

```
1. Migration (jika butuh tabel baru)
2. Repository (data access layer)
3. Use Case (business logic)
4. Controller (request handler)
5. Route (endpoint definition)
6. Register di container.js (dependency injection)
7. Register route di routes/index.js
8. Middleware (jika perlu auth/rate-limit)
9. Notification (jika perlu kirim notifikasi)
10. Postman Collection (untuk testing)
11. Frontend API (implementasi di api.ts)
```

---

## Step 1: Database Migration (jika diperlukan)

Buat file migration baru di `backend-clean/migrations/`. Nama file harus diawali timestamp.

### Format Nama File

```
{timestamp}_{deskripsi}.js
```

### Contoh: Migration tabel `likes`

**File:** `backend-clean/migrations/1771343691612_create-likes-table.js`

```javascript
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable("likes", {
    id: {
      type: "uuid",
      primaryKey: true,
      notNull: true,
    },
    user_id: {
      type: "varchar(21)",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    post_id: {
      type: "varchar(21)",
      notNull: true,
      references: "posts(id)",
      onDelete: "CASCADE",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  // Unique constraint untuk mencegah duplikasi
  pgm.createConstraint("likes", "unique_user_post_like", {
    unique: ["user_id", "post_id"],
  });

  // Index untuk performa query
  pgm.createIndex("likes", "user_id");
  pgm.createIndex("likes", "post_id");
};

export const down = (pgm) => {
  pgm.dropTable("likes");
};
```

### Catatan Migration:

- Selalu sediakan fungsi `down` untuk rollback
- Gunakan `uuid` untuk primary key, atau `varchar(21)` jika pakai nanoid
- Tambahkan foreign key references ke tabel terkait dengan `onDelete: "CASCADE"`
- Tambahkan index pada kolom yang sering di-query
- Tambahkan unique constraint jika diperlukan untuk prevent duplikasi
- `created_at` selalu default `pgm.func("current_timestamp")`

---

## Step 2: Repository (Data Access Layer)

Buat file repository baru di `backend-clean/src/adapters/repositories/`.

### Format Nama File

```
{feature}.repository.js
```

### Contoh: `likes.repository.js`

**File:** `backend-clean/src/adapters/repositories/likes.repository.js`

```javascript
import db from "../../frameworks/database/db.js";
import * as cacheService from "../services/cache.service.js";

const CACHE_TTL = 120; // dalam detik

// Helper untuk invalidasi cache terkait
const invalidateLikeCaches = async (userId, postId) => {
  await cacheService.del(`likes:liked:${userId}:${postId}`);
  await cacheService.del(`likes:count:${postId}`);
  await cacheService.del(`posts:detail:${postId}`);
  await cacheService.delByPattern("posts:all:*");
  await cacheService.delByPattern("posts:user:*");
};

const findUserById = async (userId) => {
  const result = await db`SELECT * FROM users WHERE id = ${userId}`;
  return result.length > 0 ? result[0] : null;
};

const findPostById = async (postId) => {
  const result = await db`SELECT * FROM posts WHERE id = ${postId}`;
  return result.length > 0 ? result[0] : null;
};

const findLike = async (userId, postId) => {
  const result = await db`
    SELECT * FROM likes WHERE user_id = ${userId} AND post_id = ${postId}
  `;
  return result.length > 0 ? result[0] : null;
};

const deleteLike = async (userId, postId) => {
  await db`DELETE FROM likes WHERE user_id = ${userId} AND post_id = ${postId}`;
  await invalidateLikeCaches(userId, postId);
};

const createLike = async (likeData) => {
  const { id, user_id, post_id, created_at } = likeData;
  const result = await db`
    INSERT INTO likes (id, user_id, post_id, created_at)
    VALUES (${id}, ${user_id}, ${post_id}, ${created_at})
    RETURNING *
  `;
  await invalidateLikeCaches(user_id, post_id);
  return result;
};

const countLikesByPostId = async (postId) => {
  const cacheKey = `likes:count:${postId}`;
  const cached = await cacheService.get(cacheKey);
  if (cached !== null) return cached;

  const result = await db`
    SELECT COUNT(*) as count FROM likes WHERE post_id = ${postId}
  `;
  const count = parseInt(result[0].count);
  await cacheService.set(cacheKey, count, CACHE_TTL);
  return count;
};

const isPostLikedByUser = async (userId, postId) => {
  const cacheKey = `likes:liked:${userId}:${postId}`;
  const cached = await cacheService.get(cacheKey);
  if (cached !== null) return cached;

  const result = await db`
    SELECT 1 FROM likes WHERE user_id = ${userId} AND post_id = ${postId} LIMIT 1
  `;
  const isLiked = result.length > 0;
  await cacheService.set(cacheKey, isLiked, CACHE_TTL);
  return isLiked;
};

export {
  findUserById,
  findPostById,
  findLike,
  deleteLike,
  createLike,
  countLikesByPostId,
  isPostLikedByUser,
};
```

### Catatan Repository:

- Gunakan `postgres` tagged template literal untuk query (bukan raw string) — ini otomatis parameterized dan aman dari SQL injection
- Implementasikan Redis caching untuk query yang sering dipanggil
- Selalu invalidasi cache yang relevan saat data berubah (create/update/delete)
- Pattern cache key: `{feature}:{action}:{id}` contoh: `likes:count:{postId}`
- Export semua fungsi secara individual (named exports)

---

## Step 3: Use Case (Business Logic)

Buat folder dan file use case di `backend-clean/src/use-cases/{feature}/`.

### Format

```
src/use-cases/{feature}/{feature}.use-case.js
```

### Contoh: `likes.use-case.js`

**File:** `backend-clean/src/use-cases/likes/likes.use-case.js`

```javascript
export const makeLikeUseCases = ({
  idService,
  likeRepository,
  notifyService,
}) => {
  const toggleLikeService = async (userId, postId) => {
    const user = await likeRepository.findUserById(userId);
    if (!user) throw new Error("User not found.");

    const post = await likeRepository.findPostById(postId);
    if (!post) throw new Error("Post not found.");

    const existingLike = await likeRepository.findLike(userId, postId);

    if (existingLike) {
      await likeRepository.deleteLike(userId, postId);
      const likeCount = await likeRepository.countLikesByPostId(postId);
      return {
        liked: false,
        message: "Like removed successfully.",
        likeCount,
        isLiked: false,
      };
    }

    const newLike = {
      id: idService.generateUUID(),
      user_id: userId,
      post_id: postId,
      created_at: new Date().toISOString(),
    };

    await likeRepository.createLike(newLike);
    const likeCount = await likeRepository.countLikesByPostId(postId);

    // Kirim notifikasi ke pemilik post
    await notifyService.createNotificationService({
      recipient_id: post.user_id,
      actor_id: userId,
      type: "like",
      entity_id: postId,
    });

    return {
      liked: true,
      message: "Post liked successfully.",
      like: newLike,
      likeCount,
      isLiked: true,
    };
  };

  const getLikeStatusService = async (userId, postId) => {
    const user = await likeRepository.findUserById(userId);
    if (!user) throw new Error("User not found.");

    const post = await likeRepository.findPostById(postId);
    if (!post) throw new Error("Post not found.");

    const isLiked = await likeRepository.isPostLikedByUser(userId, postId);
    const likeCount = await likeRepository.countLikesByPostId(postId);
    return { isLiked, likeCount };
  };

  const getLikeCountService = async (postId) => {
    const post = await likeRepository.findPostById(postId);
    if (!post) throw new Error("Post not found.");

    const likeCount = await likeRepository.countLikesByPostId(postId);
    return { likeCount };
  };

  return {
    toggleLikeService,
    getLikeStatusService,
    getLikeCountService,
  };
};
```

### Catatan Use Case:

- Gunakan **factory function** pattern: `export const make{Feature}UseCases = ({ dependencies }) => { ... }`
- Dependencies di-inject melalui parameter object (BUKAN import langsung)
- Dependencies yang umum digunakan:
  - `idService` — generate ID (nanoid/UUID)
  - `{feature}Repository` — data access
  - `notifyService` — kirim notifikasi (opsional, lihat Step 9)
  - `imageService` — upload gambar (opsional)
  - `walletRepository` — operasi wallet (opsional)
- Return object berisi semua service functions
- Validasi entitas (user exists, post exists, dll) dilakukan di use case, BUKAN di controller

---

## Step 4: Controller (Request Handler)

Buat file controller di `backend-clean/src/adapters/controllers/`.

### Format Nama File

```
{feature}.controller.js
```

### Contoh: `likes.controller.js`

**File:** `backend-clean/src/adapters/controllers/likes.controller.js`

```javascript
import { likeUseCases } from "../../container.js";

const { toggleLikeService, getLikeStatusService, getLikeCountService } =
  likeUseCases;

const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId)
      return res.status(400).json({ message: "Post ID is required." });

    const userId = req.user.id;
    const result = await toggleLikeService(userId, postId);

    if (result.liked) {
      return res.status(201).json({
        message: result.message,
        like: result.like,
        likeCount: result.likeCount,
        isLiked: result.isLiked,
      });
    }
    return res.status(200).json({
      message: result.message,
      likeCount: result.likeCount,
      isLiked: result.isLiked,
    });
  } catch (error) {
    console.error("Error liking post:", error);

    if (
      error.message === "User not found." ||
      error.message === "Post not found."
    ) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

const getLikeStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId)
      return res.status(400).json({ message: "Post ID is required." });

    const userId = req.user.id;
    const result = await getLikeStatusService(userId, postId);
    res
      .status(200)
      .json({ isLiked: result.isLiked, likeCount: result.likeCount });
  } catch (error) {
    console.error("Error getting like status:", error);
    if (
      error.message === "User not found." ||
      error.message === "Post not found."
    ) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

const getLikeCount = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId)
      return res.status(400).json({ message: "Post ID is required." });

    const result = await getLikeCountService(postId);
    res.status(200).json({ likeCount: result.likeCount });
  } catch (error) {
    console.error("Error getting like count:", error);
    if (error.message === "Post not found.") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

export { likePost, getLikeStatus, getLikeCount };
```

### Catatan Controller:

- Import use cases dari `../../container.js`
- Destructure service functions yang dibutuhkan
- `req.user.id` tersedia setelah melewati middleware `verifyToken`
- Parameter dari URL diambil via `req.params`
- Body request diambil via `req.body`
- Query params diambil via `req.query`
- Error handling: tangkap error spesifik (not found = 404, validation = 400), sisanya 500
- Selalu `return` di setiap response untuk menghindari "headers already sent"

---

## Step 5: Route (Endpoint Definition)

Buat atau tambahkan route di `backend-clean/src/adapters/routes/`.

### Opsi A: Tambah ke route yang sudah ada

Jika fitur baru terkait resource yang sudah ada (misal: likes → posts), tambahkan ke route file yang sudah ada.

### Opsi B: Buat route file baru

Jika fitur baru adalah resource independen.

### Format Nama File

```
{feature}.routes.js
```

### Contoh: Likes ditambahkan ke `posts.routes.js`

**File:** `backend-clean/src/adapters/routes/posts.routes.js`

```javascript
import express from "express";
import { verifyToken, optionalAuth } from "../middleware/auth.middleware.js";
import {
  likePost,
  getLikeStatus,
  getLikeCount,
} from "../controllers/likes.controller.js";

const router = express.Router();

// ____________ LIKES ROUTES ____________
router.patch("/:postId/likes", verifyToken, likePost); // Toggle like (auth required)
router.get("/:postId/likes", verifyToken, getLikeStatus); // Get like status (auth required)
router.get("/:postId/likes/count", getLikeCount); // Get like count (public)

export default router;
```

### Catatan Route:

- **HTTP Methods yang digunakan di project ini:**
  - `GET` — baca data
  - `POST` — buat data baru
  - `PUT` — update data (full replace)
  - `PATCH` — update data (partial) atau toggle action (like, follow, save)
  - `DELETE` — hapus data
- **Middleware:**
  - `verifyToken` — wajib login, set `req.user.id`
  - `optionalAuth` — opsional login, set `req.user.id` jika ada token valid
- Untuk upload file, gunakan `multer`:
  ```javascript
  import multer from "multer";
  const storage = multer.memoryStorage();
  const upload = multer({ storage });
  router.post(
    "/",
    verifyToken,
    upload.fields([{ name: "media", maxCount: 30 }]),
    createPost,
  );
  ```

---

## Step 6: Register di `container.js`

Tambahkan wiring dependency injection di `backend-clean/src/container.js`.

### Ada 3 bagian yang perlu ditambahkan:

#### 6a. Import Repository

```javascript
// ── Repositories (data-access adapters) ───────────────────────────
import * as likeRepository from "./adapters/repositories/likes.repository.js";
```

#### 6b. Import Use-Case Factory

```javascript
// ── Use-Case Factories ────────────────────────────────────────────
import { makeLikeUseCases } from "./use-cases/likes/likes.use-case.js";
```

#### 6c. Wire Dependencies

```javascript
// ── Wire Dependencies ─────────────────────────────────────────────
export const likeUseCases = makeLikeUseCases({
  idService,
  likeRepository,
  notifyService: notificationUseCases, // Jika butuh notifikasi
});
```

### Catatan Container:

- `notificationUseCases` harus dideklarasikan SEBELUM use case yang membutuhkannya
- Pattern penamaan export: `{feature}UseCases`
- Services yang tersedia untuk di-inject:
  - `idService` — generate ID/UUID/OTP
  - `hashService` — hash/compare password
  - `tokenService` — generate/verify JWT
  - `imageService` — upload/delete gambar (ImageKit)
  - `emailService` — kirim email
  - `midtransService` — payment gateway
- Jika butuh notifikasi, inject `notifyService: notificationUseCases`

---

## Step 7: Register Route di `routes/index.js`

Jika membuat route file baru (bukan menambahkan ke yang sudah ada), register di `backend-clean/src/adapters/routes/index.js`:

```javascript
import {feature}Routes from "./{feature}.routes.js";

const router = express.Router();

// {Feature} routes
router.use("/{feature}", {feature}Routes);

export default router;
```

### Route yang sudah ada di `index.js`:

| Path                 | Route File                | Deskripsi             |
| -------------------- | ------------------------- | --------------------- |
| `/api/auth`          | `auth.routes.js`          | Authentication        |
| `/api/users`         | `users.routes.js`         | User management       |
| `/api/posts`         | `posts.routes.js`         | Posts + Likes + Saves |
| `/api/comments`      | `comments.routes.js`      | Comments              |
| `/api/chats`         | `chats.routes.js`         | Chat/messaging        |
| `/api/follows`       | `follows.routes.js`       | Follow/unfollow       |
| `/api/notifications` | `notifications.routes.js` | Notifications         |
| `/api/wallet`        | `wallet.routes.js`        | Wallet/balance        |
| `/api/tips`          | `tips.routes.js`          | Tipping               |

---

## Step 8: Middleware

### Auth Middleware (sudah tersedia)

```javascript
import { verifyToken, optionalAuth } from "../middleware/auth.middleware.js";
```

- **`verifyToken`** — Decode JWT, set `req.user = { id }`. Return 401 jika token tidak valid.
- **`optionalAuth`** — Sama seperti verifyToken tapi tidak block request jika tidak ada token.

### Rate Limit Middleware (sudah tersedia)

```javascript
import {
  generalLimiter,
  authLimiter,
  sensitiveActionLimiter,
} from "../middleware/rate-limit.middleware.js";
```

- **`generalLimiter`** — 300 req / 5 min per IP (hanya hitung failed requests)
- **`authLimiter`** — 15 req / 10 min per IP (untuk login/register)
- **`sensitiveActionLimiter`** — 10 req / 10 min per IP (reset password, dll)

Rate limit sudah di-apply secara global di `server.js`:

```javascript
app.use("/api", generalLimiter, routes);
```

---

## Step 9: Notification Service (jika diperlukan)

Jika API baru perlu mengirim notifikasi, gunakan `notifyService` yang di-inject ke use case.

### Cara Kirim Notifikasi:

```javascript
await notifyService.createNotificationService({
  recipient_id: targetUserId, // ID user penerima notifikasi
  actor_id: currentUserId, // ID user yang melakukan aksi
  type: "like", // Tipe notifikasi (string)
  entity_id: postId, // ID entitas terkait (opsional)
});
```

### Tipe Notifikasi yang Ada:

| Type        | Deskripsi                | entity_id       |
| ----------- | ------------------------ | --------------- |
| `"like"`    | User menyukai post       | post_id         |
| `"comment"` | User berkomentar di post | post_id         |
| `"follow"`  | User mengikuti user lain | null            |
| `"message"` | User mengirim pesan      | conversation_id |
| `"tip"`     | User mengirim tip        | post_id         |

### Catatan Notifikasi:

- Notifikasi **TIDAK dikirim ke diri sendiri** (sudah di-handle di notification use case: `if (recipient_id === actor_id) return`)
- Error saat membuat notifikasi **tidak akan menggagalkan** operasi utama (di-wrap try-catch di notification use case)
- Untuk menambah tipe notifikasi baru, cukup gunakan string baru di field `type`

---

## Step 10: Postman Collection (Testing)

Buat file collection baru di `backend-clean/postman/collections/`.

### Format Nama File

```
{feature}.collection.json
```

### Contoh Struktur Collection:

**File:** `backend-clean/postman/collections/{feature}.collection.json`

```json
{
  "info": {
    "_postman_id": "chatter-{feature}-collection",
    "name": "Chatter - {Feature} API",
    "description": "Deskripsi endpoint yang tersedia",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    }
  ],
  "item": [
    {
      "name": "{Feature}",
      "item": [
        {
          "name": "Toggle Like",
          "event": [
            {
              "listen": "prerequest",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "console.log('[Toggle Like] postId:', pm.environment.get('test_post_id'));"
                ]
              }
            },
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status code is 200 or 201', function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                  "});",
                  "",
                  "pm.test('Response has expected fields', function () {",
                  "    const body = pm.response.json();",
                  "    pm.expect(body).to.have.property('message');",
                  "    pm.expect(body).to.have.property('likeCount');",
                  "    pm.expect(body).to.have.property('isLiked');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{access_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "PATCH",
            "header": [],
            "url": {
              "raw": "{{base_url}}/api/posts/{{test_post_id}}/likes",
              "host": ["{{base_url}}"],
              "path": ["api", "posts", "{{test_post_id}}", "likes"]
            }
          }
        }
      ]
    }
  ]
}
```

### Catatan Postman:

- Gunakan environment variable `{{base_url}}`, `{{access_token}}`, `{{user_id}}`, dll
- `prerequest` script: log info debugging
- `test` script: validasi status code dan response body
- Auth bearer token diambil dari `{{access_token}}`
- Simpan ID dari response untuk digunakan di test berikutnya via `pm.environment.set()`

---

## Step 11: Frontend API (api.ts)

Tambahkan API functions di `frontend/src/api/api.ts`.

### Format:

```typescript
// ==================== {FEATURE} APIs ====================

export const {feature}API = {
  // Deskripsi endpoint
  methodName: (param: string) => {
    return api.{httpMethod}("/api/{path}", { data });
  },
};
```

### Contoh: Likes API

```typescript
// ==================== LIKES APIs ====================

export const likesAPI = {
  // Toggle like on post
  toggleLike: (postId: string) => {
    return api.patch(`/api/posts/${postId}/likes`);
  },

  // Get like status for a post (requires auth)
  getLikeStatus: (postId: string) => {
    return api.get(`/api/posts/${postId}/likes`);
  },

  // Get like count for a post (public, no auth required)
  getLikeCount: (postId: string) => {
    return api.get(`/api/posts/${postId}/likes/count`);
  },
};
```

### Catatan Frontend API:

- Auth token otomatis ditambahkan via request interceptor (tidak perlu manual)
- Untuk upload file, gunakan `FormData` dan set header `"Content-Type": "multipart/form-data"`
- Axios instance sudah dikonfigurasi dengan:
  - `baseURL`: relative URL di production, `VITE_API_URL` di development
  - `withCredentials: true` — untuk kirim HttpOnly cookies (refresh token)
  - Auto-refresh token saat dapat 401
  - Auto-redirect ke `/429` saat rate limited

### API Object yang Sudah Ada:

| Export Name        | Deskripsi                                              |
| ------------------ | ------------------------------------------------------ |
| `authAPI`          | Authentication (login, register, OTP, forgot password) |
| `usersAPI`         | User profile management                                |
| `postsAPI`         | Posts CRUD + saves + purchases                         |
| `likesAPI`         | Like/unlike posts                                      |
| `commentsAPI`      | Comments CRUD                                          |
| `chatsAPI`         | Chat conversations & messages                          |
| `followsAPI`       | Follow/unfollow + stats                                |
| `notificationsAPI` | Notifications management                               |
| `walletAPI`        | Wallet balance + top up + transactions                 |
| `tipsAPI`          | Send tips + activity                                   |

---

## Checklist Pembuatan API Baru

Gunakan checklist ini saat membuat API baru:

- [ ] **Migration** — Buat tabel baru jika diperlukan (`backend-clean/migrations/`)
- [ ] **Repository** — Buat repository (`backend-clean/src/adapters/repositories/{feature}.repository.js`)
- [ ] **Use Case** — Buat use case factory (`backend-clean/src/use-cases/{feature}/{feature}.use-case.js`)
- [ ] **Controller** — Buat controller (`backend-clean/src/adapters/controllers/{feature}.controller.js`)
- [ ] **Route** — Tambah route (`backend-clean/src/adapters/routes/{feature}.routes.js` atau di route yang sudah ada)
- [ ] **Container** — Register di `backend-clean/src/container.js` (import repo, import use case, wire dependencies)
- [ ] **Routes Index** — Register di `backend-clean/src/adapters/routes/index.js` (jika route file baru)
- [ ] **Middleware** — Pastikan endpoint pakai middleware yang tepat (`verifyToken` / `optionalAuth`)
- [ ] **Notification** — Tambahkan notifikasi jika diperlukan (inject `notifyService`)
- [ ] **Postman** — Buat collection (`backend-clean/postman/collections/{feature}.collection.json`)
- [ ] **Frontend** — Tambah API di `frontend/src/api/api.ts`

---

## Services yang Tersedia untuk Dependency Injection

| Service           | Import Path                               | Fungsi                                            |
| ----------------- | ----------------------------------------- | ------------------------------------------------- |
| `idService`       | `./adapters/services/id.service.js`       | `generateId()`, `generateUUID()`, `generateOtp()` |
| `hashService`     | `./adapters/services/hash.service.js`     | Hash & compare password                           |
| `tokenService`    | `./adapters/services/token.service.js`    | Generate & verify JWT                             |
| `imageService`    | `./adapters/services/image.service.js`    | Upload & delete gambar (ImageKit)                 |
| `emailService`    | `./adapters/services/email.service.js`    | Kirim email                                       |
| `cacheService`    | `./adapters/services/cache.service.js`    | Redis cache (`get`, `set`, `del`, `delByPattern`) |
| `midtransService` | `./adapters/services/midtrans.service.js` | Payment gateway                                   |

> **Note:** `cacheService` di-import langsung di repository (bukan via DI), karena caching adalah infrastructure concern.
