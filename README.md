# LostLink — A Smart Microservices-Based Campus Lost and Found Management System

LostLink lets students and staff report lost or found items on campus, browse and search reports, file ownership claims with proof, and lets an admin approve or reject claims. It is built as **two independently deployable microservices** that communicate over REST, with a React frontend.

| Layer | Technology | Deployed on |
|---|---|---|
| Frontend | React 18 (Vite), React Router, Axios | Vercel |
| Item Service | Node.js, Express, Mongoose | Render |
| Claim Service | Node.js, Express, Mongoose | Render |
| Database | MongoDB Atlas — one database per service (`lostlink_items`, `lostlink_claims`) | Atlas (free M0) |
| Testing | Postman collection (36 requests with test scripts) | — |

## Architecture

```
                 ┌──────────────────────────┐
                 │   React Frontend (Vercel) │
                 └──────┬─────────────┬─────┘
                  Axios │             │ Axios
                        ▼             ▼
   ┌─────────────────────────┐   ┌─────────────────────────┐
   │  Item Service (Render)  │◄──┤  Claim Service (Render) │
   │  /api/items             │   │  /api/claims            │
   │                         ├──►│                         │
   └───────────┬─────────────┘   └───────────┬─────────────┘
               ▼   REST + x-service-key       ▼
     MongoDB Atlas: lostlink_items   MongoDB Atlas: lostlink_claims
```

Each service owns its own data. Neither service reads the other's database — all cross-service data goes through REST.

### Inter-service communication (what to show in the demo)

| Direction | Endpoint | What happens |
|---|---|---|
| Claim → Item | `POST /api/claims` | Claim Service calls `GET /api/items/:id` to confirm the item exists and is `open` before saving. Returns 404 / 409 / 503 otherwise. |
| Claim → Item | `PATCH /api/claims/:id/approve` | Claim Service calls `PATCH /api/items/:id/status` (protected by `x-service-key`) to mark the item `claimed`, then auto-rejects other pending claims. |
| Claim → Item | `GET /api/claims/with-items` | Each claim is enriched with live item data fetched from Item Service. |
| Claim → Item | `DELETE /api/claims/:id` | Deleting an approved claim re-opens the item. |
| Item → Claim | `GET /api/items/:id/with-claims` | Item Service fetches all claims for the item from Claim Service and merges them. Degrades gracefully if Claim Service is down. |
| Item → Claim | `DELETE /api/items/:id` | Item Service asks Claim Service to delete the item's claims (cascade over REST). |

Error handling: timeouts (15 s, to survive Render cold starts), 503 when the other service is unreachable, 502 for upstream errors, 401 for internal calls without the shared key, 400 for validation/bad IDs, 409 for business-rule conflicts.

## Project structure

```
lostlink/
├── item-service/            # Microservice 1 (port 5001)
│   ├── src/
│   │   ├── server.js
│   │   ├── models/Item.js
│   │   ├── routes/itemRoutes.js
│   │   ├── services/claimClient.js     # REST client → Claim Service
│   │   └── middleware/ (errorHandler, serviceAuth)
│   └── scripts/seed.js                 # demo data via the APIs
├── claim-service/           # Microservice 2 (port 5002)
│   └── src/
│       ├── server.js
│       ├── models/Claim.js
│       ├── routes/claimRoutes.js
│       ├── services/itemClient.js      # REST client → Item Service
│       └── middleware/ (errorHandler, serviceAuth)
├── frontend/                # React app (Vite)
│   └── src/ (api.js, App.jsx, pages/, components/)
├── docs/
│   ├── API.md
│   ├── PROJECT_REPORT.md
│   └── LostLink.postman_collection.json
└── render.yaml              # Render Blueprint for both services
```

## Run locally

Prerequisites: Node.js 18+, a free MongoDB Atlas cluster.

**1. MongoDB Atlas**
1. Create a free M0 cluster at <https://cloud.mongodb.com>.
2. Database Access → add a user with a password.
3. Network Access → add `0.0.0.0/0` (needed for Render).
4. Connect → Drivers → copy the connection string. You'll use it twice with different database names:
   - `...mongodb.net/lostlink_items?retryWrites=true&w=majority`
   - `...mongodb.net/lostlink_claims?retryWrites=true&w=majority`

**2. Item Service**
```bash
cd item-service
cp .env.example .env      # fill in MONGO_URI (lostlink_items) and SERVICE_KEY
npm install
npm run dev               # http://localhost:5001/health
```

**3. Claim Service** (new terminal)
```bash
cd claim-service
cp .env.example .env      # MONGO_URI (lostlink_claims), same SERVICE_KEY
npm install
npm run dev               # http://localhost:5002/health
```

**4. Frontend** (new terminal)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

**5. Demo data (optional)**
```bash
cd item-service
npm run seed -- http://localhost:5001 http://localhost:5002
```

## Deploy

Push the whole `lostlink/` folder to a GitHub repository first.

### Item Service and Claim Service → Render

Option A — Blueprint (both at once): Render dashboard → **New → Blueprint** → choose the repo. Render reads `render.yaml` and creates both services; enter the secret env vars when prompted.

Option B — manually, once per service: **New → Web Service** → choose the repo, then:

| Setting | Item Service | Claim Service |
|---|---|---|
| Root Directory | `item-service` | `claim-service` |
| Build Command | `npm install` | `npm install` |
| Start Command | `npm start` | `npm start` |
| Health Check Path | `/health` | `/health` |
| `MONGO_URI` | Atlas URI with `/lostlink_items` | Atlas URI with `/lostlink_claims` |
| `SERVICE_KEY` | same long random string | same long random string |
| Other URL var | `CLAIM_SERVICE_URL=https://<claim>.onrender.com` | `ITEM_SERVICE_URL=https://<item>.onrender.com` |
| `CORS_ORIGIN` | `*` (or your Vercel URL) | `*` (or your Vercel URL) |

Each service needs the other's URL, so deploy both first, then fill in `CLAIM_SERVICE_URL` / `ITEM_SERVICE_URL` and redeploy. Check `https://<item>.onrender.com/api/items/<id>/with-claims` to confirm they talk to each other.

> Render's free tier sleeps after 15 minutes idle; the first request can take ~30–50 s. Open both `/health` URLs a minute before your demo.

### Frontend → Vercel
1. Vercel → **Add New → Project** → import the repo.
2. Root Directory: `frontend` (framework auto-detected as Vite).
3. Environment Variables:
   - `VITE_ITEM_SERVICE_URL=https://<item>.onrender.com`
   - `VITE_CLAIM_SERVICE_URL=https://<claim>.onrender.com`
4. Deploy. `vercel.json` handles client-side routing so refreshing `/claims` works.
5. Optionally set `CORS_ORIGIN` on both Render services to your Vercel URL.

### Deployment links (fill in for submission)

| Component | URL |
|---|---|
| Frontend | `https://________.vercel.app` |
| Item Service | `https://________.onrender.com` |
| Claim Service | `https://________.onrender.com` |
| GitHub repo | `https://github.com/________` |

## Testing with Postman

1. Import `docs/LostLink.postman_collection.json`.
2. Edit the collection variables `itemUrl`, `claimUrl` (local or Render URLs) and `serviceKey`.
3. Run the collection with the Collection Runner — folders run in order: Health → Item CRUD → Claim CRUD → Inter-Service → Cleanup. IDs are saved into variables automatically and each request has assertions.

Full endpoint reference: [`docs/API.md`](docs/API.md).
