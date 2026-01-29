# ✈️ Flight Reservation Database Management
A full-stack web application designed to efficiently manage flight bookings, payments, and user administration, leveraging modern web technologies and a robust database architecture.

![Vue.js](https://img.shields.io/badge/Frontend-Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Framework-Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

---

## Project Overview

**Flight Reservation Database Management** is a web-based system that bridges the gap between customer booking requests and airline backend operations. It provides a secure platform for managing complex data relationships including flight schedules, passenger manifests, and financial records.

The system features a **Role-Based Access Control (RBAC)** mechanism, ensuring that sensitive data is accessible only to authorized personnel (e.g., Finance Admins cannot alter Flight Schedules).

---

## Key Features

### 🛡️ Role-Based Access Control (RBAC)
* **Super Admin:** Full system control, user management, and role assignment.
* **Flight Admin:** Manages flight schedules, airlines, and aircraft inventory.
* **Finance Admin:** Tracks payments and manages financial records.

### ✈️ Flight & Airline Management
* **CRUD Operations:** Create, update, and delete airlines, aircraft, and flight routes.
* **Seat Management:** Organize seat availability and assignments for specific flights.

### 🎫 Reservation & Payment System
* **Booking Engine:** Handles customer reservations and passenger information.
* **Payment Tracking:** Monitors transaction status for every booking to ensure revenue integrity.

---

## Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Vue.js, Vue Router | Responsive Single Page Application (SPA). |
| **Backend** | Node.js, Express.js | RESTful API architecture. |
| **Database** | MySQL | Relational database for structured data storage. |

---

## My Contribution

**Role: Backend Developer & API Integration**

In this project, I was responsible for the core server-side logic and connecting the frontend to the backend services:

* **Backend Development (Node.js/Express):**
    * Designed database schema
    * Designed and implemented RESTful APIs to support all system features.
    * Developed the **Role-Based Access Control** middleware to secure API endpoints.
    * Optimized MySQL queries for efficient data retrieval.
* **Frontend Integration (Vue.js):**
    * Implemented API consumption using **Fetch/Axios**.
    * Integrated backend data into Vue components to display real-time flight status and booking information.
    * Handled data binding and state management for forms and tables.

<img width="1920" height="1200" alt="After Add Airline" src="https://github.com/user-attachments/assets/fa9ad9a1-47db-4bcb-8c4a-fcf8b1c3afd2" />
<img width="1920" height="1200" alt="After Add Flight" src="https://github.com/user-attachments/assets/37596222-fdcf-4208-80c4-54554102428b" />
<img width="1920" height="1200" alt="Reservation Status Update" src="https://github.com/user-attachments/assets/1ad58013-b561-46d8-9ac2-cddd0837191c" />
<img width="1920" height="1200" alt="Dashboard hold Reservation" src="https://github.com/user-attachments/assets/58e38a32-bdec-442a-b7c1-acd3e12d3281" />
