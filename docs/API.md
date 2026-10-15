# LostLink API Reference

All responses are JSON with the shape `{ success: boolean, message?, data?, errors? }`.

**Authentication.** Log in through the User Service to get a token, then send it to any service as:
```
Authorization: Bearer <token>
```
Internal endpoints used only between services need `x-service-key: <SERVICE_KEY>` instead.

Access column: **Public** = no login, **Student** / **Admin** = that role, **Login** = any logged-in user, **Internal** = service key.

---

## User Service (`USER_URL`, default `http://localhost:5003`)

### User model
| Field | Type | Notes |
|---|---|---|
| `name` | string ≤80 | required |
| `email` | string | required, unique, lowercase |
| `password` | string ≥6 | stored as a bcrypt hash, never returned |
| `role` | `student` \| `admin` | sign-up always creates `student` |
| `rollNumber`, `phone` | string | optional |

### Endpoints
| Method | Path | Access | Description | Errors |
|---|---|---|---|---|
| GET | `/health` | Public | Service + DB status | — |
| POST | `/api/auth/register` | Public | Create a student account; returns `{ token, user }` | 400, 409 email taken |
| POST | `/api/auth/login` | Public | Log in (student or admin); returns `{ token, user }` | 400, 401 |
| GET | `/api/auth/me` | Login | Own profile | 401 |
| PUT | `/api/auth/me` | Login | Update own `name`, `rollNumber`, `phone` | 401 |
| GET | `/api/users` | Admin | List accounts (`?role=student`) | 401, 403 |
| GET | `/api/users/stats` | Admin | Account counts | 401, 403 |
| GET | `/api/users/:id` | Internal | Profile lookup used by the Claim Service | 401, 404 |
| DELETE | `/api/users/:id` | Admin | Delete an account | 400, 403, 404 |

Login example:
```http
POST /api/auth/login
{ "email": "arun@college.edu", "password": "demo1234" }
```
```json
{ "success": true, "message": "Logged in",
  "data": { "token": "eyJhbGciOi…", "user": { "_id": "…", "name": "Arun P", "role": "student", "rollNumber": "22CS101" } } }
```
The token lasts 7 days and carries `sub` (user id), `name`, `email` and `role`.

---

## Item Service (`ITEM_URL`, default `http://localhost:5001`)

### Item model
| Field | Type | Notes |
|---|---|---|
| `type` | `lost` \| `found` | required |
| `title` | string ≤100 | required |
| `description` | string ≤1000 | required |
| `category` | Electronics, ID Card, Books, Bags, Keys, Wallet, Clothing, Bottle, Accessories, Other | default `Other` |
| `location`, `date` | string, date | required |
| `imageUrl`, `reporterPhone` | string | optional |
| `reporterId`, `reporterName`, `reporterEmail` | string | taken from the login token, not the request body |
| `status` | `open` \| `claimed` \| `resolved` | set by the system |
| `claimedBy` | string | set when a claim is approved |

### Endpoints
| Method | Path | Access | Description | Errors |
|---|---|---|---|---|
| GET | `/health` | Public | Service + DB status | — |
| GET | `/api/items` | Public | List. Query: `type`, `category`, `status`, `search`, `page`, `limit` | — |
| GET | `/api/items/stats` | Public | Counts by type and status | — |
| GET | `/api/items/categories` | Public | Allowed categories | — |
| GET | `/api/items/mine` | Login | Items I reported | 401 |
| GET | `/api/items/:id` | Public | One item | 400, 404 |
| GET | `/api/items/:id/with-claims` | Public, richer with login | **Item + its claims from the Claim Service.** Proof is shown to the admin desk and to each claim's author only | 400, 404 |
| POST | `/api/items` | Student / Admin | Report an item | 400, 401 |
| PUT | `/api/items/:id` | Reporter / Admin | Edit an item | 401, 403, 404 |
| PATCH | `/api/items/:id/resolve` | Admin | `claimed` → `resolved` (handed over) | 403, 404, 409 |
| PATCH | `/api/items/:id/status` | Internal | Set status (used by the Claim Service). Body `{ status, claimedBy }` | 400, 401, 404 |
| DELETE | `/api/items/:id` | Reporter / Admin | Delete; **cascades claims through the Claim Service** | 401, 403, 404 |

---

## Claim Service (`CLAIM_URL`, default `http://localhost:5002`)

### Claim model
| Field | Type | Notes |
|---|---|---|
| `itemId` | string | required; checked against the Item Service |
| `itemTitle` | string | copied from the Item Service |
| `claimantId`, `claimantName`, `claimantEmail`, `rollNumber`, `claimantPhone` | string | copied from the User Service profile |
| `proofDescription` | string 10–1000 | required |
| `status` | `pending` \| `approved` \| `rejected` | default `pending` |
| `messages[]` | `{ from: admin\|student, authorName, text, createdAt }` | the desk's questions and the student's answers |
| `awaitingReply` | boolean | `true` after the desk asks, `false` after the student answers |
| `adminNote`, `reviewedAt` | string, date | set on approve or reject |

### Endpoints
| Method | Path | Access | Description | Errors |
|---|---|---|---|---|
| GET | `/health` | Public | Service + DB status | — |
| GET | `/api/claims` | Admin | List. Query: `status`, `itemId` | 401, 403 |
| GET | `/api/claims/with-items` | Admin | **Claims with item data from the Item Service.** Query: `status`, `awaitingReply=true` | 401, 403 |
| GET | `/api/claims/stats` | Admin | `total`, `pending`, `approved`, `rejected`, `awaitingReply` | 401, 403 |
| GET | `/api/claims/mine` | Login | My claims with items and conversation | 401 |
| GET | `/api/claims/item/:itemId` | Internal | Claims for one item (used by the Item Service) | 401 |
| DELETE | `/api/claims/item/:itemId` | Internal | Cascade delete (used by the Item Service) | 401 |
| GET | `/api/claims/:id` | Claimant / Admin | One claim + its item | 403, 404 |
| POST | `/api/claims` | Student | **Create a claim.** Checks the item in the Item Service and copies the profile from the User Service. Body `{ itemId, proofDescription }` | 400, 401, 403, 404 item missing, 409 not open / own item / duplicate, 503 Item Service down |
| PUT | `/api/claims/:id` | Claimant | Edit `proofDescription`, `claimantPhone`, `rollNumber` while pending | 403, 404, 409 |
| POST | `/api/claims/:id/messages` | Claimant / Admin | **Ask a question (admin) or answer it (student).** Body `{ text }`. Only while pending | 400, 403, 404, 409 |
| PATCH | `/api/claims/:id/approve` | Admin | **Approve → Item Service marks the item `claimed`**; other pending claims are auto-rejected. Body `{ adminNote }` | 403, 404, 409, 502/503 |
| PATCH | `/api/claims/:id/reject` | Admin | Reject. Body `{ adminNote }` | 403, 404, 409 |
| DELETE | `/api/claims/:id` | Admin, or claimant if pending | Delete or withdraw; an approved claim **re-opens the item** | 403, 404 |

Example: the desk asks a question.
```http
POST /api/claims/6710…/messages
Authorization: Bearer <admin token>
{ "text": "What exactly is printed on the sticker?" }
```
```json
{ "success": true, "message": "Question sent to the student",
  "data": { "status": "pending", "awaitingReply": true,
            "messages": [ { "from": "admin", "authorName": "Lost and Found Desk", "text": "What exactly is printed on the sticker?" } ] } }
```

Example: approve.
```json
{ "success": true, "message": "Claim approved and item marked as claimed",
  "data": { "claim": { "status": "approved" }, "item": { "status": "claimed", "claimedBy": "Arun P" }, "autoRejected": 1 } }
```
