# Project Report — LostLink: A Smart Microservices-Based Campus Lost and Found Management System

**Student:** ____________________  **Register No.:** ____________  **Course:** ____________

## 1. Problem statement

On a college campus, lost items (ID cards, chargers, bottles, keys, wallets) are usually reported through word of mouth, WhatsApp groups or a physical security desk. There is no single place to search, no record of who returned what, and no reliable way to check that the person collecting an item actually owns it. LostLink solves this with a web application where students report lost or found items and search the board, and claim items with proof of ownership. The lost and found desk reviews each claim and can question the claimant before handing anything over.

## 2. Objectives

1. Provide CRUD operations for item reports, ownership claims and user accounts.
2. Split the system into three independent microservices, each with its own database.
3. Have the services cooperate through REST APIs for validation, status updates, profile lookups and combined views.
4. Add role-based access: public browsing, student accounts, and an admin desk.
5. Let the admin desk ask follow-up questions on a claim and the student answer them before a decision.
6. Build a React interface that consumes all three services.
7. Deploy each service independently (Render) and the frontend (Vercel), and test all APIs in Postman.

## 3. Technology stack

React 18 + Vite, React Router and Axios; Node.js + Express; MongoDB Atlas with Mongoose; bcrypt for password hashing; JSON Web Tokens for login; Render for the services, Vercel for the frontend and Postman for testing.

## 4. System architecture

The system has four deployable units:

- **Item Service** owns `lostlink_items`. It handles reporting, listing, searching, filtering, editing, resolving and deleting items.
- **Claim Service** owns `lostlink_claims`. It handles filing, editing, withdrawing, approving and rejecting claims, plus the question-and-answer conversation on each claim.
- **User Service** owns `lostlink_users`. It handles student sign-up, login for students and the admin desk, and profiles. It creates the admin desk account on first start from environment variables.
- **Frontend** is a React single-page app that calls all three services directly with Axios.

The services never share a database. Whenever one needs data owned by another, it calls that service's REST API.

**Security.** Passwords are stored as bcrypt hashes. On login, the User Service issues a JWT containing the user's id, name, email and role, signed with `JWT_SECRET`. Every service holds the same secret and checks tokens itself, so ordinary requests don't depend on the User Service being awake. Internal-only endpoints (changing an item's status, listing or deleting an item's claims, looking up a user's profile) require a separate shared secret in the `x-service-key` header, so end users cannot call them directly.

(Insert the architecture diagram from the System page or README.md here.)

### Roles

| Action | Visitor | Student | Admin desk |
|---|---|---|---|
| Browse and search | ✓ | ✓ | ✓ |
| Report, edit and delete items | | own items | any item |
| Claim an item | | ✓ (not own items) | |
| See proof of ownership | | own claims | all claims |
| Ask or answer questions on a claim | | answer own | ask |
| Approve, reject, mark returned | | | ✓ |

## 5. Microservice communication

| Scenario | Flow |
|---|---|
| Filing a claim | Student → `POST /api/claims` → Claim Service calls `GET /api/items/:id` on the Item Service (exists, open, not the claimant's own report) and `GET /api/users/:id` on the User Service (name, email, roll number, phone) → saves the claim. |
| Desk asks a question | Admin → `POST /api/claims/:id/messages` → the claim is flagged `awaitingReply`; the student sees it on **My claims** and answers through the same endpoint. |
| Approving a claim | Admin → `PATCH /api/claims/:id/approve` → Claim Service calls `PATCH /api/items/:id/status` on the Item Service (`claimed`) → marks the claim approved and auto-rejects other pending claims on that item. |
| Item detail page | Frontend → `GET /api/items/:id/with-claims` → Item Service calls `GET /api/claims/item/:id` on the Claim Service → returns full claims to the admin desk, but hides other people's proof from everyone else. |
| Claims desk and My claims | Claim Service fetches each claim's item from the Item Service. |
| Deleting an item | Item Service deletes it, then calls `DELETE /api/claims/item/:id` on the Claim Service. |

**Error handling.** Every outbound call has a 15-second timeout. If another service is unreachable, the caller returns `503` with a readable message; upstream errors are mapped (`404` passes through, others become `502`). The approve flow updates the Item Service first, so if that call fails the claim stays `pending` and the databases remain consistent. Combined views degrade gracefully: the item page still loads if the Claim Service is down, and a claim can still be filed from the verified token if the User Service is down. Missing or expired logins return `401`, and the wrong role returns `403`.

## 6. Database design

**users** — `name, email (unique), password (bcrypt hash), role (student|admin), rollNumber, phone, createdAt, updatedAt`

**items** — `type, title, description, category, location, date, imageUrl, reporterId, reporterName, reporterEmail, reporterPhone, status (open|claimed|resolved), claimedBy, createdAt, updatedAt`

**claims** — `itemId, itemTitle, claimantId, claimantName, claimantEmail, claimantPhone, rollNumber, proofDescription, status (pending|approved|rejected), messages[{from, authorName, text, createdAt}], awaitingReply, adminNote, reviewedAt, createdAt, updatedAt`

`itemId`, `reporterId` and `claimantId` are plain string references across service boundaries. They are checked through the other services' APIs rather than by database joins.

## 7. Frontend

| Page | Who | Features |
|---|---|---|
| Board (`/`) | Everyone | Search, lost/found filter, category and status filters, item cards with claim tags |
| Item (`/items/:id`) | Everyone | Details, claim form for students, list of claims (proof visible only to the desk and its author), edit/delete for the reporter, mark returned for the desk |
| Log in (`/login`, `/admin`) | Everyone | Separate Student and Admin desk tabs |
| Sign up (`/signup`) | Everyone | Student account with roll number and phone |
| Report (`/report`) | Logged in | Lost/found choice, validated form; reporter details come from the account |
| My claims (`/my-claims`) | Student | Each claim's status, conversation with the desk, answer box, withdraw; items I reported |
| Claims desk (`/claims`) | Admin | Tabs for To review / Waiting on student / Approved / Rejected / All, conversation with ask box, approve/reject/delete |
| System (`/status`) | Everyone | Live health of all three services and an architecture diagram |

## 8. Testing

A Postman collection of 62 requests with 80 assertions in seven folders covers health, accounts and login, item CRUD, claims, desk questions, inter-service communication, and cleanup. It covers success paths and error cases: validation 400, invalid ID 400, missing login 401, wrong password 401, missing service key 401, wrong role 403, editing someone else's item 403, non-existent item 404, duplicate email 409, duplicate claim 409, claiming your own item 409, and posting after a decision 409. Tokens and IDs pass between requests through collection variables, and fresh student accounts are created on each run, so the whole collection runs repeatedly in the Collection Runner.

(Insert a screenshot of the Collection Runner results here.)

## 9. Deployment

| Component | Platform | URL |
|---|---|---|
| Item Service | Render | |
| Claim Service | Render | |
| User Service | Render | |
| Frontend | Vercel | |
| Database | MongoDB Atlas | — |

## 10. Conclusion and future scope

LostLink meets and goes beyond the requirement of two independently deployed microservices. It has three services with their own databases, full CRUD, REST-based inter-service communication with error handling, role-based login, a claim review conversation, a React frontend and Postman-tested APIs. Possible extensions: email notifications when the desk asks a question or decides a claim, image upload to cloud storage, an API gateway, and automatic matching of lost and found reports by category and keywords.
