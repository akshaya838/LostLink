# LostLink — A Smart Microservices-Based Campus Lost and Found Management System

LostLink lets students report lost or found items on campus, browse and search the board, and claim items with proof of ownership. A lost and found **admin desk** reviews each claim, can **ask the student questions** before handing anything over, and approves or rejects the claim.

It is built as **three independently deployable microservices** that communicate over REST, with a React frontend.

| Layer | Technology | Deployed on |
|---|---|---|
| Frontend | React 18 (Vite), React Router, Axios | Vercel |
| Item Service | Node.js, Express, Mongoose | Render |
| Claim Service | Node.js, Express, Mongoose | Render |
| User Service | Node.js, Express, Mongoose, bcrypt, JWT | Render |
| Database | MongoDB Atlas, one database per service (`lostlink_items`, `lostlink_claims`, `lostlink_users`) | Atlas (free M0) |
| Testing | Postman collection (62 requests, 80 assertions) | — |

## Who can do what

| | Visitor | Student | Admin desk |
|---|---|---|---|
| Browse and search the board | ✓ | ✓ | ✓ |
| Report a lost or found item | | ✓ | ✓ |
| Edit or delete an item | | own items | any item |
| Claim an item | | ✓ (not own items) | |
| See proof of ownership on claims | | own claims | all claims |
| Ask a question on a claim | | | ✓ |
| Answer the desk's questions | | own claims | |
| Approve, reject, delete claims | | withdraw own pending claim | ✓ |
| Mark an item as returned | | | ✓ |

Students sign up themselves. The admin desk account is created automatically by the User Service from the `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables; it cannot be created through sign-up.

## Architecture

```
                      ┌────────────────────────────┐
                      │  React Frontend (Vercel)   │
                      └──┬───────────┬──────────┬──┘
              Axios + JWT│           │          │
                         ▼           ▼          ▼
   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
   │  Item Service  │◄─┤ Claim Service  ├─►│  User Service  │
   │  /api/items    ├─►│  /api/claims   │  │ /api/auth,users│
   └───────┬────────┘  └───────┬────────┘  └───────┬────────┘
           ▼                   ▼                   ▼
    lostlink_items      lostlink_claims      lostlink_users
```

Each service owns its own data and never reads another service's database.

**Login.** The User Service checks the password (bcrypt) and issues a JSON Web Token signed with `JWT_SECRET`. All three services hold the same secret and verify the token themselves, so normal requests never wait on the User Service. Internal endpoints (changing item status, listing or deleting an item's claims, looking up a user) need the shared `x-service-key` instead.

### Inter-service communication

| Direction | Endpoint | What happens |
|---|---|---|
| Claim → Item | `POST /api/claims` | Checks the item exists, is `open`, and wasn't reported by the claimant |
| Claim → User | `POST /api/claims` | Copies the student's name, email, roll number and phone into the claim. Falls back to the verified token if the User Service is down |
| Claim → Item | `PATCH /api/claims/:id/approve` | Marks the item `claimed`; other pending claims are auto-rejected |
| Claim → Item | `GET /api/claims/with-items`, `/mine` | Enriches claims with live item data |
| Claim → Item | `DELETE /api/claims/:id` | Deleting an approved claim re-opens the item |
| Item → Claim | `GET /api/items/:id/with-claims` | Merges the item's claims; proof is shown only to the admin desk and to each claim's author |
| Item → Claim | `DELETE /api/items/:id` | Cascade-deletes the item's claims |

Error handling: 15-second timeouts (to survive Render cold starts), 503 when another service is unreachable, 502 for upstream errors, 401 for missing or expired logins and service keys, 403 for the wrong role, 400 for validation and bad IDs, 409 for business-rule conflicts.

## Project structure

```
lostlink/
├── item-service/      # port 5001: items, plus scripts/seed.js for demo data
├── claim-service/     # port 5002: claims, desk questions and replies
├── user-service/      # port 5003: accounts, login, admin seeding
│   (each has src/server.js, models/, routes/, services/, middleware/ with auth.js + serviceAuth.js)
├── frontend/          # React app: Board, Item, Report, Login/Sign up, My claims, Claims desk, System
├── docs/              # API.md, PROJECT_REPORT.md, LostLink.postman_collection.json
└── render.yaml        # Render Blueprint for all three services
```

## Environment variables

Generate two different random secrets, one for `SERVICE_KEY` and one for `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Variable | Item | Claim | User | Notes |
|---|---|---|---|---|
| `MONGO_URI` | `/lostlink_items` | `/lostlink_claims` | `/lostlink_users` | Same Atlas cluster, different database names |
| `SERVICE_KEY` | ✓ | ✓ | ✓ | Same value everywhere |
| `JWT_SECRET` | ✓ | ✓ | ✓ | Same value everywhere |
| `CLAIM_SERVICE_URL` | ✓ | | | |
| `ITEM_SERVICE_URL` | | ✓ | | |
| `USER_SERVICE_URL` | | ✓ | | |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | | | ✓ | Admin desk account, created on first start |
| `CORS_ORIGIN` | `*` | `*` | `*` | Or your Vercel URL |

Frontend (Vercel): `VITE_ITEM_SERVICE_URL`, `VITE_CLAIM_SERVICE_URL`, `VITE_USER_SERVICE_URL`.

## Deploy

1. **MongoDB Atlas.** Free M0 cluster, a database user, and Network Access `0.0.0.0/0`.
2. **Render.** Create three Web Services from this repo, with Root Directory `item-service`, `claim-service` and `user-service`, Build `npm install`, Start `npm start`, Health Check `/health`, and the variables above. Or use **New → Blueprint** with `render.yaml`.
3. **Vercel.** Import the repo with Root Directory `frontend` and the three `VITE_…` variables.
4. **Check.** Open each `/health` URL, then the site's **System** page.

Render's free tier sleeps after 15 minutes idle, and the first request can take 30–50 seconds. Open the three `/health` URLs a minute before a demo.

### Demo data (optional)
```bash
cd item-service
npm install
npm run seed -- <itemUrl> <claimUrl> <userUrl> <adminEmail> <adminPassword>
```
This creates 11 demo students (password `demo1234`, for example `arun@college.edu`), 7 items, 5 claims and two desk questions.

### Deployment links (fill in for submission)

| Component | URL |
|---|---|
| Frontend | `https://________.vercel.app` |
| Item Service | `https://________.onrender.com` |
| Claim Service | `https://________.onrender.com` |
| User Service | `https://________.onrender.com` |
| GitHub repo | `https://github.com/________` |

## Testing with Postman

1. Import `docs/LostLink.postman_collection.json`.
2. Set the collection variables `itemUrl`, `claimUrl`, `userUrl`, `serviceKey`, `adminEmail` and `adminPassword`.
3. Run the whole collection with the Collection Runner. It creates fresh student accounts on every run, so it can be run repeatedly.

Full endpoint reference: [`docs/API.md`](docs/API.md).
