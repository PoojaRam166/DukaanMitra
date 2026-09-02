# DukaanMitra Backend - Complete Project Overview & Learning Journal

This journal documents the architecture, implementation details, and key systems of the DukaanMitra Node.js backend.

## Overview
The backend is a RESTful API built with **Node.js and Express**. It uses **PostgreSQL** as its relational database, managed via the `pg` package. Security and authentication are handled via **JSON Web Tokens (JWT)** and HTTP-only cookies. The architecture strictly follows the **MVC (Model-View-Controller)** pattern, separating routing logic from business logic.

---

## 1. Authentication & Security (`authRoutes.js`, `authController.js`, `auth.js` middleware)
- **Implementation:** Users register and log in to receive a JWT. Instead of sending the token in the JSON response, the backend sets it as an `HttpOnly` cookie.
- **Middleware:** Every protected route passes through `protect`, which verifies the JWT cookie and attaches the `user` object to the `req`.
- **Key Learnings:** Handling CORS accurately. We configured `cors` to explicitly allow the exact frontend domains and allow credentials (`credentials: true`), which is strictly required for browsers to accept and send cookies cross-origin.

## 2. Database Architecture & Multi-Tenancy (`db/schema.sql`)
- **Implementation:** We use PostgreSQL for robust relational data mapping (e.g., a Bill has many Bill Items, which reference Products).
- **Multi-Tenancy:** The app supports multiple shop owners. To ensure absolute data privacy, every major table (`products`, `customers`, `bills`, `expenses`) has a `user_id` column.
- **Key Learnings:** Never trusting the client. Every single SQL query in the backend includes `WHERE user_id = $1` to ensure a logged-in user can only ever read, update, or delete their own data.

## 3. Database Self-Healing (`ensureSchema.js`)
- **Implementation:** A script that runs in `server.js` every time the server boots up. It executes idempotent SQL commands (like `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- **Key Learnings:** We discovered that when deploying to cloud platforms (like Railway), the production database often gets left behind when new features are added. This self-healing script ensures that new columns (like `transaction_id` for UPI payments) are automatically injected into the live database without requiring manual migrations.

## 4. Business Logic: Billing & Inventory (`billController.js`)
- **Implementation:** Creating a bill requires deducting stock from products, generating the bill record, and inserting multiple bill items.
- **Key Learnings:** **Database Transactions (`BEGIN` / `COMMIT` / `ROLLBACK`)**. If a bill has 5 items, and the 4th item fails to insert, we must revert the entire bill to prevent corrupt data. By wrapping the checkout process in a SQL transaction, we ensure that either the entire bill succeeds, or nothing changes.

## 5. Web Push Notifications (`notify.js`, `notificationController.js`)
- **Implementation:** Uses the `web-push` library. The backend exposes a `/vapid-public-key` endpoint for the frontend to safely retrieve the key. When a significant event happens (e.g., stock reaches 0), the backend looks up the user's saved device endpoints and pushes the payload.
- **Key Learnings:** 
  - **Asynchronous Execution:** Push notifications are wrapped in `try/catch` and executed *after* the database `COMMIT`. This ensures that if the Apple/Google push servers are down, the user's actual bill creation does not fail.
  - **Environment Variables:** We added fallback hardcoded VAPID keys so the system doesn't break entirely if a developer forgets to configure the cloud environment variables.

## 6. Media Management (Cloudinary Integration)
- **Implementation:** Handled via `multer` for receiving multipart form data, and the `cloudinary` SDK for cloud storage.
- **Key Learnings:** Instead of saving user avatars to the local file system (which gets wiped out every time a cloud server restarts), we upload them securely to Cloudinary and just save the permanent URL string to our PostgreSQL database.

---

## Conclusion
The DukaanMitra backend is a production-ready, scalable architecture. By mastering SQL transactions, multi-tenant data isolation, secure HttpOnly cookies, and background push notifications, the system provides a robust foundation for a modern SaaS product.
