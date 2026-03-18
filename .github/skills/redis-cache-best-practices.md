---
applyTo: "**"
---

# Skill: Redis Caching Best Practices (Chatter Project)

Panduan implementasi Redis caching di project Chatter.
Mencakup cache service API, key naming, TTL strategy, invalidation patterns, dan rate limiting.

---

## Architecture Overview

```
src/frameworks/redis/redis.js          → Redis connection (Upstash / Mock fallback)
src/adapters/services/cache.service.js → Cache abstraction layer (get, set, del, delByPattern)
src/adapters/repositories/*.js         → Cache digunakan di sini (per-repository)
src/adapters/middleware/rate-limit.js   → Rate limiting pakai Redis langsung
```

> **Penting:** `cache.service.js` di-import langsung di repository, BUKAN melalui dependency injection.

---

## 1. Redis Connection

**File:** `backend-clean/src/frameworks/redis/redis.js`

- **Production:** Upstash Redis (REST API) — env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Development:** Mock in-memory cache (otomatis jika env tidak ada)
- Wrapper menyediakan interface: `get`, `set`, `del`, `scan`, `flushdb`, `quit`
- `redis.status === "ready"` digunakan untuk cek koneksi

---

## 2. Cache Service API

**File:** `backend-clean/src/adapters/services/cache.service.js`

```javascript
import * as cacheService from "../services/cache.service.js";
```

### Fungsi yang Tersedia:

| Fungsi         | Signature                   | Deskripsi                                                 |
| -------------- | --------------------------- | --------------------------------------------------------- |
| `get`          | `get(key)` → `any \| null`  | Ambil data (auto JSON.parse)                              |
| `set`          | `set(key, data, ttl?)`      | Simpan data (auto JSON.stringify), default TTL 300s       |
| `del`          | `del(key)`                  | Hapus 1 cache key                                         |
| `delByPattern` | `delByPattern(pattern)`     | Hapus semua key yang match pattern (gunakan `*` wildcard) |
| `flush`        | `flush()`                   | Hapus SEMUA cache (hati-hati!)                            |
| `isAvailable`  | `isAvailable()` → `boolean` | Cek apakah Redis tersedia                                 |

### Contoh Penggunaan:

```javascript
// GET: Ambil dari cache, return null jika tidak ada
const cached = await cacheService.get("posts:all:20:0");
if (cached) return cached;

// SET: Simpan ke cache dengan TTL
await cacheService.set("posts:all:20:0", posts, 300);

// DEL: Hapus 1 key spesifik
await cacheService.del("posts:detail:abc123");

// DEL BY PATTERN: Hapus semua key yang match
await cacheService.delByPattern("posts:all:*");
await cacheService.delByPattern("posts:user:userId123:*");
```

---

## 3. Key Naming Convention

Format: `{entity}:{scope}:{identifier}`

### Key Registry (yang sudah digunakan):

| Key Pattern                            | Entity        | Digunakan di             | TTL  |
| -------------------------------------- | ------------- | ------------------------ | ---- |
| `users:all`                            | Users         | users.repository         | 600s |
| `users:username:{username}`            | Users         | users.repository         | 600s |
| `posts:all:{limit}:{offset}`           | Posts         | posts.repository         | 300s |
| `posts:user:{userId}:{limit}:{offset}` | Posts         | posts.repository         | 300s |
| `posts:detail:{postId}`                | Posts         | posts.repository         | 300s |
| `likes:count:{postId}`                 | Likes         | likes.repository         | 120s |
| `likes:liked:{userId}:{postId}`        | Likes         | likes.repository         | 120s |
| `comments:post:{postId}`               | Comments      | comments.repository      | 300s |
| `comments:count:{postId}`              | Comments      | comments.repository      | 300s |
| `follows:*`                            | Follows       | follows.repository       | 300s |
| `notifications:*`                      | Notifications | notifications.repository | 120s |
| `rl:general:{ip}`                      | Rate Limit    | rate-limit.middleware    | 300s |
| `rl:auth:{ip}`                         | Rate Limit    | rate-limit.middleware    | 600s |
| `rl:sensitive:{ip}`                    | Rate Limit    | rate-limit.middleware    | 600s |

### Rules Penamaan Key:

- Selalu gunakan `:` sebagai separator
- Entity sebagai prefix pertama (lowercase)
- Scope/action sebagai level kedua
- Identifier (ID) sebagai level terakhir
- Untuk paginated data, tambahkan `{limit}:{offset}` di akhir
- Gunakan `*` wildcard hanya untuk invalidation pattern

---

## 4. TTL Strategy

| Tipe Data                | TTL           | Alasan                                          |
| ------------------------ | ------------- | ----------------------------------------------- |
| **User profile**         | 600s (10 min) | Jarang berubah                                  |
| **Post list / detail**   | 300s (5 min)  | Default, balance antara freshness & performance |
| **Comment list / count** | 300s (5 min)  | Same as posts                                   |
| **Like count / status**  | 120s (2 min)  | Sering berubah, perlu lebih fresh               |
| **Notification**         | 120s (2 min)  | Perlu real-time feel                            |
| **Rate limit counter**   | Window-based  | Sesuai rate limit window (5-10 min)             |

### Panduan Memilih TTL untuk Fitur Baru:

```
Data jarang berubah (profile, settings)     → 600s (10 min)
Data berubah moderate (posts, comments)      → 300s (5 min) — DEFAULT
Data sering berubah (likes, notifications)   → 120s (2 min)
Data real-time (online status, typing)       → 30-60s atau JANGAN cache
```

---

## 5. Cache Invalidation Patterns

### ATURAN UTAMA: Setiap operasi WRITE (create/update/delete) HARUS invalidasi cache terkait.

### Pattern per Operasi:

#### Create (INSERT)

```javascript
// Setelah create post baru:
await cacheService.delByPattern("posts:all:*"); // List cache (semua halaman)
await cacheService.delByPattern(`posts:user:${userId}:*`); // List by user (semua halaman)
// JANGAN invalidasi posts:detail — belum ada di cache
```

#### Update (UPDATE)

```javascript
// Setelah update user profile:
await cacheService.del("users:all"); // List cache
await cacheService.delByPattern("users:username:*"); // Specific user cache
```

#### Delete (DELETE)

```javascript
// Setelah delete post:
await cacheService.del(`posts:detail:${postId}`); // Detail cache
await cacheService.delByPattern("posts:all:*"); // List cache
await cacheService.delByPattern(`posts:user:${userId}:*`); // User posts cache
await cacheService.del(`comments:post:${postId}`); // Related comments
await cacheService.del(`comments:count:${postId}`); // Related comment count
```

#### Cross-Entity Invalidation

Ketika operasi di satu entity mempengaruhi cache entity lain:

```javascript
// Like/Unlike mempengaruhi posts (karena like count tampil di post)
const invalidateLikeCaches = async (userId, postId) => {
  await cacheService.del(`likes:liked:${userId}:${postId}`); // User's like status
  await cacheService.del(`likes:count:${postId}`); // Like count
  await cacheService.del(`posts:detail:${postId}`); // Post detail (contains like count)
  await cacheService.delByPattern("posts:all:*"); // Post list (contains like count)
  await cacheService.delByPattern("posts:user:*"); // User posts (contains like count)
};
```

### Checklist Invalidation untuk Fitur Baru:

- [ ] Key spesifik entity yang berubah (`{entity}:{scope}:{id}`)
- [ ] List cache entity (`{entity}:all:*`)
- [ ] List by user/parent (`{entity}:user:{userId}:*`)
- [ ] Cache entity lain yang menampilkan data ini (cross-entity)
- [ ] Count cache jika ada (`{entity}:count:{parentId}`)

---

## 6. Implementasi Cache di Repository Baru

### Template Repository dengan Cache:

```javascript
import db from "../../frameworks/database/db.js";
import * as cacheService from "../services/cache.service.js";

const CACHE_TTL = 300; // Sesuaikan (lihat TTL Strategy di atas)

// ── Helper: Invalidasi cache terkait ──────────────────────────────
const invalidate{Feature}Caches = async (relevantIds) => {
  // 1. Hapus cache spesifik entity
  await cacheService.del(`{feature}:detail:${relevantIds.entityId}`);

  // 2. Hapus list cache (semua halaman)
  await cacheService.delByPattern("{feature}:all:*");

  // 3. Hapus cache parent entity jika ada cross-dependency
  // await cacheService.del(`posts:detail:${relevantIds.postId}`);
};

// ── READ: Dengan cache ────────────────────────────────────────────
const findAll{Feature}s = async (limit, offset) => {
  const cacheKey = `{feature}:all:${limit}:${offset}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;                         // Cache HIT → return langsung

  const result = await db`SELECT ... LIMIT ${limit} OFFSET ${offset}`;

  await cacheService.set(cacheKey, result, CACHE_TTL); // Cache MISS → simpan
  return result;
};

// ── READ: Single item dengan cache ────────────────────────────────
const find{Feature}ById = async (id) => {
  const cacheKey = `{feature}:detail:${id}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  const result = await db`SELECT * FROM {table} WHERE id = ${id}`;
  const item = result.length > 0 ? result[0] : null;

  if (item) {
    await cacheService.set(cacheKey, item, CACHE_TTL);
  }
  return item;
};

// ── READ: Count dengan cache ──────────────────────────────────────
const count{Feature}sByParentId = async (parentId) => {
  const cacheKey = `{feature}:count:${parentId}`;
  const cached = await cacheService.get(cacheKey);
  if (cached !== null) return cached;  // ⚠️ Pakai !== null, karena 0 adalah value valid

  const result = await db`SELECT COUNT(*) as count FROM {table} WHERE parent_id = ${parentId}`;
  const count = parseInt(result[0].count);

  await cacheService.set(cacheKey, count, CACHE_TTL);
  return count;
};

// ── WRITE: Create (harus invalidasi) ──────────────────────────────
const create{Feature} = async (data) => {
  const result = await db`INSERT INTO {table} (...) VALUES (...) RETURNING *`;

  await invalidate{Feature}Caches({ entityId: data.id });  // ← WAJIB
  return result;
};

// ── WRITE: Delete (harus invalidasi) ──────────────────────────────
const delete{Feature} = async (id) => {
  const result = await db`DELETE FROM {table} WHERE id = ${id} RETURNING *`;

  if (result.length > 0) {
    await invalidate{Feature}Caches({ entityId: id });      // ← WAJIB
  }
  return result;
};
```

---

## 7. Common Pitfalls & Best Practices

### ⚠️ Pitfall: Cache `null` Check

```javascript
// ❌ SALAH: 0 dianggap falsy, padahal itu value valid
const cached = await cacheService.get(cacheKey);
if (cached) return cached; // 0 akan di-skip!

// ✅ BENAR: Gunakan !== null untuk numeric values
const cached = await cacheService.get(cacheKey);
if (cached !== null) return cached; // 0 tetap return
```

**Kapan pakai mana?**

- `if (cached)` → untuk object/array (list data, detail data)
- `if (cached !== null)` → untuk number/boolean (count, isLiked, isFollowing)

### ⚠️ Pitfall: Lupa Invalidasi Cross-Entity

```javascript
// ❌ SALAH: Like berubah tapi post detail masih tampilkan like count lama
await cacheService.del(`likes:count:${postId}`);

// ✅ BENAR: Invalidasi juga cache yang menampilkan like count
await cacheService.del(`likes:count:${postId}`);
await cacheService.del(`posts:detail:${postId}`); // Post detail tampilkan like count
await cacheService.delByPattern("posts:all:*"); // Post list tampilkan like count
```

### ⚠️ Pitfall: Cache Stampede pada Paginated Data

```javascript
// ❌ SALAH: Invalidasi hanya halaman tertentu
await cacheService.del(`posts:all:20:0`); // Hanya page 1

// ✅ BENAR: Invalidasi semua halaman karena data bergeser
await cacheService.delByPattern("posts:all:*"); // Semua halaman
```

### ✅ Best Practice: Fail-Open Design

Cache service sudah terdesain fail-open:

- Jika Redis down → `get()` return `null` → query DB langsung
- Jika Redis down → `set()` / `del()` skip silently
- App tetap berjalan tanpa cache (hanya lebih lambat)
- **JANGAN** throw error jika cache operation gagal

### ✅ Best Practice: Invalidation Helper Function

Setiap repository yang pakai cache **WAJIB** punya fungsi helper invalidation:

```javascript
// Group semua invalidation terkait dalam 1 fungsi
const invalidate{Feature}Caches = async (...relevantIds) => {
  // Semua del/delByPattern terkait feature ini
};
```

Keuntungan:

- Reusable di create, update, delete
- Tidak ada invalidation yang kelupaan
- Mudah di-maintain saat ada cache key baru

---

## 8. Menambah Cache ke Fitur yang Sudah Ada

Jika ingin menambahkan cache ke repository yang belum pakai cache:

1. Import cache service:

   ```javascript
   import * as cacheService from "../services/cache.service.js";
   ```

2. Tentukan TTL (lihat panduan di Section 4)

3. Tentukan key pattern (lihat naming convention di Section 3)

4. Tambahkan cache logic di READ functions

5. Tambahkan invalidation di WRITE functions

6. Buat invalidation helper function

7. Periksa cross-entity dependencies — apakah entity lain menampilkan data ini?

---

## 9. Monitoring & Debug

### Check Cache dari Kode:

```javascript
// Cek apakah Redis aktif
console.log("Redis status:", redis.status); // "ready" = ok

// Cek apakah cache service available
console.log("Cache available:", cacheService.isAvailable());
```

### Flush Cache (Development Only):

```javascript
await cacheService.flush(); // Hapus SEMUA cache — hanya untuk development/debug
```

### Environment Variables:

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

Jika env variables tidak di-set, otomatis fallback ke mock in-memory cache.
