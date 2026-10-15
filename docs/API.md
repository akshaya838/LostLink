# LostLink API Reference

All responses are JSON with the shape `{ success: boolean, message?, data?, errors? }`.

## Item Service (`ITEM_URL`, default `http://localhost:5001`)

### Item model
| Field | Type | Notes |
|---|---|---|
| `type` | `lost` \| `found` | required |
| `title` | string ≤100 | required |
| `description` | string ≤1000 | required |
| `category` | Electronics, ID Card, Books, Bags, Keys, Wallet, Clothing, Bottle, Accessories, Other | default `Other` |
| `location` | string | required |
| `date` | date | required — when lost/found |
| `imageUrl` | URL string | optional |
| `reporterName`, `reporterEmail` | string | required |
| `reporterPhone` | string | optional |
| `status` | `open` \| `claimed` \| `resolved` | set by system, not by client |
| `claimedBy` | string | set when a claim is approved |

### Endpoints
| Method | Path | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | Service + DB status | 200 | — |
| GET | `/api/items` | List. Query: `type`, `category`, `status`, `search`, `page`, `limit` | 200 | — |
| GET | `/api/items/stats` | Counts by type/status | 200 | — |
| GET | `/api/items/categories` | Allowed categories | 200 | — |
| GET | `/api/items/:id` | One item | 200 | 400 bad id, 404 |
| GET | `/api/items/:id/with-claims` | **Item + its claims (calls Claim Service)** | 200 | 400, 404 |
| POST | `/api/items` | Create (report) item | 201 | 400 validation |
| PUT | `/api/items/:id` | Update editable fields | 200 | 400, 404 |
| PATCH | `/api/items/:id/resolve` | `claimed` → `resolved` (handed over) | 200 | 404, 409 |
| PATCH | `/api/items/:id/status` | **Internal**: set status. Header `x-service-key` required. Body `{ status, claimedBy }` | 200 | 400, 401, 404 |
| DELETE | `/api/items/:id` | Delete item; **cascades claims via Claim Service** | 200 | 400, 404 |

Example — create:
```http
POST /api/items
Content-Type: application/json

{ "type": "found", "title": "Blue Milton water bottle", "description": "Batman sticker on cap",
  "category": "Bottle", "location": "Central Library", "date": "2026-10-10",
  "reporterName": "Ravi Kumar", "reporterEmail": "ravi@college.edu" }
```
Response `201`:
```json
{ "success": true, "message": "Item reported successfully",
  "data": { "_id": "6710…", "status": "open", "title": "Blue Milton water bottle", "…": "…" } }
```

Example — `GET /api/items/:id/with-claims`:
```json
{ "success": true,
  "data": { "item": { "…": "…" }, "claims": [ { "claimantName": "Arun P", "status": "pending" } ],
            "claimCount": 1, "claimServiceAvailable": true } }
```

## Claim Service (`CLAIM_URL`, default `http://localhost:5002`)

### Claim model
| Field | Type | Notes |
|---|---|---|
| `itemId` | string | required — validated against Item Service |
| `itemTitle` | string | snapshot copied from Item Service |
| `claimantName`, `claimantEmail` | string | required |
| `claimantPhone`, `rollNumber` | string | optional |
| `proofDescription` | string 10–1000 | required |
| `status` | `pending` \| `approved` \| `rejected` | default `pending` |
| `adminNote` | string | set on approve/reject |
| `reviewedAt` | date | set on approve/reject |

### Endpoints
| Method | Path | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | Service + DB status | 200 | — |
| GET | `/api/claims` | List. Query: `status`, `itemId` | 200 | — |
| GET | `/api/claims/with-items` | **Claims enriched with item data from Item Service**. Query: `status` | 200 | — |
| GET | `/api/claims/stats` | Counts by status | 200 | — |
| GET | `/api/claims/item/:itemId` | Claims for one item (used by Item Service) | 200 | — |
| GET | `/api/claims/:id` | One claim + its item (from Item Service) | 200 | 400, 404 |
| POST | `/api/claims` | **Create claim — validates item via Item Service** | 201 | 400, 404 item missing, 409 item not open / duplicate, 503 Item Service down |
| PUT | `/api/claims/:id` | Edit claimant fields (pending only) | 200 | 404, 409 |
| PATCH | `/api/claims/:id/approve` | **Approve → Item Service marks item `claimed`**; other pending claims auto-rejected. Body `{ adminNote }` | 200 | 404, 409, 502/503 |
| PATCH | `/api/claims/:id/reject` | Reject. Body `{ adminNote }` | 200 | 404, 409 |
| DELETE | `/api/claims/:id` | Delete; if it was approved, **item is re-opened via Item Service** | 200 | 404 |
| DELETE | `/api/claims/item/:itemId` | **Internal** cascade delete. Header `x-service-key` | 200 | 401 |

Example — approve response:
```json
{ "success": true, "message": "Claim approved and item marked as claimed",
  "data": { "claim": { "status": "approved" }, "item": { "status": "claimed", "claimedBy": "Arun P" },
            "autoRejected": 1 } }
```

Example — Item Service unreachable during `POST /api/claims`:
```json
{ "success": false, "message": "Item Service is unavailable. Please try again shortly." }
```
