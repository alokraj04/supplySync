# 🚀 SupplySync — Inventory Intelligence Platform

SupplySync is a modern full-stack inventory intelligence platform built with Spring Boot, MySQL, Docker, HTML, CSS, and Vanilla JavaScript.

Unlike traditional CRUD-based inventory applications, SupplySync focuses on delivering a production-style SaaS dashboard experience with real-time inventory insights, smart stock monitoring, analytics visualization, responsive UI, and containerized deployment.

The platform is designed to simulate how modern inventory management systems work in real-world business environments.

---

# ✨ Features

## 📊 Smart Inventory Dashboard
- Real-time inventory overview
- Inventory health scoring
- Total inventory valuation
- Low stock tracking
- Out-of-stock monitoring
- Category breakdown analysis

---

## 📦 Product Management
- Add/Edit/Delete products
- Search products
- Filter by category
- Sort by:
  - Name
  - Price
  - Quantity
- Pagination support
- Product preview modal

---

## 📈 Analytics & Insights
- Inventory analytics dashboard
- Category distribution charts
- Stock risk visualization
- Dynamic inventory statistics
- Interactive charts using Chart.js

---

## 🎨 Modern SaaS UI
- Responsive dashboard design
- Dark mode interface
- Glassmorphism-inspired cards
- Smooth animations
- Sidebar navigation
- Toast notifications
- Interactive modals
- Mobile-friendly layout

---

## ⚡ Advanced Features
- Inventory health score
- Smart low-stock highlighting
- Activity feed tracking
- Keyboard shortcuts
- Export inventory data to CSV
- Theme persistence using LocalStorage
- Loading states & empty states

---

# 🛠️ Tech Stack

## Backend
- Java 21
- Spring Boot 3
- Spring Data JPA
- Hibernate
- MySQL
- Maven

## Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js

## DevOps & Deployment
- Docker
- Docker Compose

---

# 🏗️ System Architecture

```text
Frontend (HTML/CSS/JavaScript)
            ↓
Spring Boot MVC + REST APIs
            ↓
        Service Layer
            ↓
      JPA / Hibernate
            ↓
       MySQL Database
```

---

# 📂 Project Structure

```text
SupplySync/
│
├── src/
│   └── main/
│       ├── java/
│       │   └── com/inventory/supplysync/
│       │       ├── controller/
│       │       ├── service/
│       │       ├── repository/
│       │       ├── entity/
│       │       ├── dto/
│       │       ├── config/
│       │       └── SupplysyncApplication.java
│       │
│       └── resources/
│           ├── static/
│           │   ├── css/
│           │   ├── js/
│           │   └── images/
│           │
│           ├── templates/
│           │   └── index.html
│           │
│           ├── application.properties
│           └── application-docker.properties
│
├── Dockerfile
├── docker-compose.yml
├── pom.xml
└── README.md
```

---

# ⚙️ Getting Started

## 1️⃣ Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/supplysync.git
cd supplysync
```

---

# 🐳 Run With Docker (Recommended)

## Start Application

```bash
docker compose up --build
```

---

## Open Application

```bash
http://localhost:8080
```

---

# 💾 Database

SupplySync uses MySQL 8 with Docker containerization.

Default database:
```text
supplysync_db
```

---

# 🔌 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | Get all products |
| GET | `/api/products/{id}` | Get product by ID |
| POST | `/api/products` | Create product |
| PUT | `/api/products/{id}` | Update product |
| DELETE | `/api/products/{id}` | Delete product |
| GET | `/api/products/search?name=` | Search products |
| GET | `/api/products/category/{category}` | Filter by category |
| GET | `/api/products/low-stock` | Low stock products |

---

# 📸 Dashboard Highlights

## Features Included
- Inventory analytics
- Product management table
- Responsive dashboard
- Activity monitoring
- Health indicators
- Data visualization
- Dark mode interface

---

# 🧠 Project Goals

This project was built to explore:

- Full-stack application architecture
- Inventory intelligence systems
- SaaS dashboard UI/UX
- REST API development
- Dockerized deployment
- Responsive frontend engineering
- Backend integration with modern frontend patterns

---

# 🔒 Security Notes

Sensitive configuration values such as database credentials should be managed using:
- environment variables
- Docker environment configuration
- local application property overrides

---

# 🚧 Future Improvements

- JWT Authentication
- Role-based access control
- Redis caching
- WebSocket real-time updates
- AI-powered inventory prediction
- Barcode scanning
- Email notifications
- Multi-warehouse support
- Cloud deployment (AWS/GCP/Azure)

---

# 👨‍💻 Author

Built by Alok Raj

---


