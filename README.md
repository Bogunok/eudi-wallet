# EUDI Wallet for Legal Entities

This project is the implementation of a diploma work on the topic "Implementation of an application according to the EU Digital Identity Wallet standard for storing Legal Entity Identifier (LEI) and Verifiable Credentials of organizations"

### Key Features
- **DID Management:** Generation and resolution of Decentralized Identifiers.
- **EBSI Integration:** Integration with the European Blockchain Services Infrastructure using `@cef-ebsi/ebsi-did-resolver`.
- **Credential Storage:** Custodial storage of Legal Entity Identifiers (LEI) and other organizational credentials.
- **Role-Based Architecture:** Simulates three key roles within a single ecosystem:
  1. **Wallet Holder:** The organization managing its credentials.
  2. **Issuer:** The authority issuing the LEI.
  3. **Verifier:** Third-party service validating the credentials.

---

## 🛠 Tech Stack

The project is structured as a **Monorepo** containing both the backend and frontend services.

### Backend
- **Framework:** [NestJS](https://nestjs.com/) (TypeScript) - Modular architecture ensuring separation of concerns between Wallet, Issuer, and Verifier logic.
- **Database:** [PostgreSQL](https://www.postgresql.org/) - Uses Schemas to logically isolate data for different actors within a single database instance.
- **Identity & Security:**
  - `OID4VCI` / `OID4VP` protocol implementation logic.
  - `@cef-ebsi/ebsi-did-resolver` for resolving DID documents on the EBSI network.

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (React) - Server-Side Rendering (SSR) for the web dashboard.
- **Styling:** Tailwind CSS / CSS Modules.

### DevOps & Infrastructure
- **Containerization:** Docker & Docker Compose.
- **Environment:** Node.js (v18+).

---

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Bogunok/eudi-wallet.git
   ```

2. **Environment Configuration:**
Create .env files for both backend and frontend. You can use the example files as a reference:
# Example (create these files manually)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

3. **Run with Docker Compose:**
This command will build the images and start the database, backend, and frontend containers:
```bash
docker-compose up --build
```

### Accessing the Application
Once the containers are running, you can access the services at:

Frontend: http://localhost:3001
Backend API: http://localhost:3000
Database: localhost:5432

### Project Structure
```bash
.
├── backend/            # NestJS application (API)
│   ├── src/
│   │   ├── wallet/     # Wallet logic
│   │   ├── issuer/     # Issuer logic
│   │   └── verifier/   # Verifier logic
│   ├── Dockerfile
│   └── .env            # Backend variables
├── frontend/           # Next.js application (UI)
│   ├── src/app/        # Pages and components
│   ├── Dockerfile
│   └── .env            # Frontend variables
├── docker-compose.yml  # Orchestration configuration
└── README.md           # Project documentation
```