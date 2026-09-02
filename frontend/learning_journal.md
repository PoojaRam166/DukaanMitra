# DukaanMitra Frontend - Complete Project Overview & Learning Journal

This journal documents the architecture, implementation details, and key features of every major page and component in the DukaanMitra frontend.

## Overview
The frontend is built using **React, TypeScript, and Vite**, heavily styled with **Tailwind CSS**. State management is handled through React Contexts (`AuthContext`, `SettingsContext`, `CartContext`), and routing is managed via `react-router-dom`. The app is designed as a **Progressive Web App (PWA)** with a mobile-first philosophy, ensuring shop owners can use it seamlessly on their phones.

---

## 1. Authentication (`Login.tsx`, `Register.tsx`)
- **Purpose:** Secure entry point to the application.
- **Implementation:** Uses controlled forms to capture credentials. It communicates with the backend via the `authApi` service. 
- **Key Learnings:** Handling session cookies securely. We implemented a proxy (`vercel.json` / `vite.config.ts`) to route `/api/*` requests so that iOS Safari's Intelligent Tracking Prevention doesn't block the backend's authentication cookies.

## 2. Dashboard (`Dashboard.tsx`)
- **Purpose:** A high-level overview of the shop's daily performance.
- **Implementation:** Fetches aggregated data (Today's Sales, Low Stock items, Active Customers, Pending Credit). Uses modern UI components (`StatCard`) to display metrics.
- **Key Learnings:** Optimizing data fetching so the dashboard loads instantly. Implementing responsive grid layouts that collapse into a single scrollable column on mobile devices.

## 3. Inventory Management (`Inventory.tsx`)
- **Purpose:** Add, edit, and monitor products.
- **Implementation:** Features a searchable, filterable data table for products. Includes forms for adding new items and quick actions for "restocking". 
- **Key Learnings:** Managing complex component state for modals and forms. Highlighting rows conditionally (e.g., turning a row red if stock falls below `min_stock`).

## 4. Point of Sale / Billing (`Billing.tsx`)
- **Purpose:** The core operational page for creating customer bills and managing the checkout cart.
- **Implementation:** Split into two main sections: a Product Catalog and a Checkout Cart. 
- **Key Learnings:** 
  - **Mobile-First Responsiveness:** On laptops, the catalog and cart sit side-by-side. On mobile, this caused massive layout issues. We implemented a `mobileView` state (`"products" | "cart"`) to let mobile users toggle between the two views, ensuring the layout remains clean and the "Create Bill" button is never cut off.
  - **Context-Aware UI:** The checkout button dynamically updates based on the selected payment method (e.g., "Received UPI — Create Bill").

## 5. Customer Management (`Customers.tsx`)
- **Purpose:** A lightweight CRM to track customer purchases and store credit (Udhaar).
- **Implementation:** Displays customer details and their outstanding credit balances. Includes a "Settle Credit" modal.
- **Key Learnings:** Handling partial updates and integrating the credit settlement directly with the backend's `/pay` endpoints, seamlessly updating the local UI state without requiring a full page refresh.

## 6. Insights & Reports (`Insights.tsx`)
- **Purpose:** Visualizing business growth and sales trends.
- **Implementation:** Uses graphing libraries (like Recharts/Chart.js) to plot revenue over time, top-selling categories, and expense ratios.
- **Key Learnings:** Rendering responsive SVG charts that scale correctly on both massive desktop monitors and small iPhone screens without breaking the CSS container widths.

## 7. Settings & PWA (`Settings.tsx`)
- **Purpose:** Manage shop details, user profile, UI preferences (Dark mode, Language), and push notifications.
- **Implementation:** A multi-tabbed interface. Integrates with the native `Notification` API and `navigator.serviceWorker`.
- **Key Learnings:**
  - **Web Push Notifications:** Safari heavily restricts push notifications. We learned to gracefully fallback and detect if the `Notification` object exists, prompting iPhone users to "Add to Home Screen" first. We also learned to securely fetch the `VAPID Public Key` from the backend rather than relying on brittle frontend environment variables.
  - **Dynamic Theming & i18n:** Applying user preferences (like currency and language) globally across the app using `SettingsContext`.

---

## Technical Highlights
- **Service Worker (`push-sw.js`):** Intercepts background push events from the backend to deliver native lock-screen notifications even when the app is closed.
- **API Services (`api.ts`):** A centralized Axios/Fetch wrapper that automatically handles credentials, base URLs, and error unwrapping, keeping the React components clean and focused purely on UI.
