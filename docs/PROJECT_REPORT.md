# Project Report — LostLink: A Smart Microservices-Based Campus Lost and Found Management System

**Student:** ____________________  **Register No.:** ____________  **Course:** ____________

## 1. Problem statement

On a college campus, lost items (ID cards, chargers, bottles, keys, wallets) are usually reported through word of mouth, WhatsApp groups or a physical security desk. There is no single place to search, no record of who returned what, and no way to verify that the person collecting an item actually owns it. LostLink solves this with a web application where anyone can report a lost or found item, search existing reports, and file a claim with proof of ownership that an admin reviews before the item is handed over.

## 2. Objectives

1. Provide CRUD operations for lost/found item reports and for ownership claims.
2. Split the system into two independent microservices with separate databases.
3. Have the services cooperate through REST APIs for validation, status updates and combined views.
4. Build a React interface that consumes both services.
5. Deploy each service independently (Render) and the frontend (Vercel), and test all APIs in Postman.

## 3. Technology stack

React 18 + Vite, React Router, Axios · Node.js + Express · MongoDB Atlas with Mongoose · Render (services) · Vercel (frontend) · Postman (testing).

## 4. System architecture

The system has three deployable units:

- **Item Service** — owns `lostlink_items`. Handles reporting, listing, searching, filtering, editing, resolving and deleting items.
- **Claim Service** — owns `lostlink_claims`. Handles filing, editing, approving, rejecting and deleting claims.
- **Frontend** — a React single-page app that calls both services directly with Axios.

The services never share a database. Whenever one needs data owned by the other, it calls the other's REST API with Axios. Internal-only endpoints (changing an item's status, cascade-deleting claims) require a shared secret in the `x-service-key` header so that end users cannot call them directly.

(Insert the architecture diagram from README.md here.)

## 5. Microservice communication

| Scenario | Flow |
|---|---|
| Filing a claim | Frontend → `POST /api/claims` → Claim Service → `GET /api/items/:id` on Item Service → checks the item exists and is open → saves claim with the item title. |
| Approving a claim | Admin → `PATCH /api/claims/:id/approve` → Claim Service → `PATCH /api/items/:id/status` on Item Service (status `claimed`) → Claim Service marks the claim approved and auto-rejects other pending claims on that item. |
| Item detail page | Frontend → `GET /api/items/:id/with-claims` → Item Service → `GET /api/claims/item/:id` on Claim Service → merged response. |
| Claims dashboard | Frontend → `GET /api/claims/with-items` → Claim Service fetches each item from Item Service. |
| Deleting an item | Item Service deletes it, then calls `DELETE /api/claims/item/:id` on Claim Service. |

**Error handling.** Every outbound call has a 15 s timeout. If the other service is unreachable, the caller returns `503` with a readable message; if the other service returns an error, the status is mapped (`404` passes through, others become `502`). The approve flow updates the Item Service first, so if that call fails, the claim stays `pending` and the two databases remain consistent. Read-only combined views degrade gracefully (for example, the item page still loads and shows a warning if the Claim Service is down).

## 6. Database design

**items** — `type, title, description, category, location, date, imageUrl, reporterName, reporterEmail, reporterPhone, status (open|claimed|resolved), claimedBy, createdAt, updatedAt`

**claims** — `itemId, itemTitle, claimantName, claimantEmail, claimantPhone, rollNumber, proofDescription, status (pending|approved|rejected), adminNote, reviewedAt, createdAt, updatedAt`

`itemId` is a plain string reference across service boundaries, validated through the Item Service API rather than a database join.

## 7. Frontend

| Page | Features |
|---|---|
| Browse (`/`) | Statistics, search, filters by type/category/status, item cards |
| Report (`/report`) | Lost/found toggle, validated form; also used to edit |
| Item detail (`/items/:id`) | Full details, claim form, list of claims from Claim Service, edit/delete/mark returned |
| Claims (`/claims`) | Admin table of claims with item info, filter by status, approve/reject/delete |
| System (`/status`) | Live health and response time of both deployed services |

## 8. Testing

A Postman collection of 36 requests in five folders (Health, Item CRUD, Claim CRUD, Inter-Service Communication, Cleanup) covers success paths and error cases (validation 400, invalid ID 400, missing service key 401, non-existent item 404, duplicate claim 409, claiming a closed item 409). Each request contains test scripts, and IDs are passed between requests through collection variables, so the whole collection runs in the Collection Runner.

(Insert a screenshot of the Collection Runner results here.)

## 9. Deployment

| Component | Platform | URL |
|---|---|---|
| Item Service | Render | |
| Claim Service | Render | |
| Frontend | Vercel | |
| Database | MongoDB Atlas | — |

## 10. Conclusion and future scope

LostLink meets the requirement of two independently deployed microservices with their own databases, full CRUD, REST-based inter-service communication with error handling, a React frontend and Postman-tested APIs. Possible extensions: login with college email (JWT) and role-based admin access, image upload to cloud storage, email notifications when a claim is reviewed, an API gateway, and automatic matching of lost and found reports by category and keywords.
