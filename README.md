# 🛡️ Multi Manager - Finance & Account Security Dashboard

**Multi Manager** is a dual-persona (Personal & Business) finance and account management system designed with military-grade security standards. The project focuses on protecting sensitive user data through end-to-end encryption directly in the browser.

## 🌟 Key Features

### 1. Dual-Persona Management

- **Personal Mode:** Manage private expenses and personal cash flow securely.
- **Business Mode:** Organize finances by business segments, ensuring clear separation of profits and costs.

### 2. Advanced Security (Military-Grade)

- **AES-256-GCM Encryption:** All sensitive information (Passwords, SSN, Phone, Email, etc.) is encrypted using the state-of-the-art AES-256-GCM algorithm.
- **PIN-based Authentication:** The system uses a PIN to derive a 256-bit decryption key via PBKDF2 (100,000 iterations). PINs are never stored, ensuring data remains unreadable even if the data file is compromised.
- **Master Check (Canary):** A smart PIN validation mechanism that prevents wasted decryption attempts and protects system performance.

### 3. Smart Financial Analytics

- **Dashboard Analytics:** Visual charts for income, expenses, and growth trends.
- **Precise Time Filters:** Track data by month, quarter, or custom time ranges.

### 4. Cross-Platform Account Management

- **Platform Templates:** Support for creating data templates for e-commerce platforms (Etsy, eBay, Amazon...) or any other account types.
- **Custom Fields:** Define your own data schema and choose which fields should be encrypted for each platform.

### 5. Flexible Data Management

- **Encrypted JSON Export/Import:** Export your entire workspace as an encrypted JSON file for secure backups or device transfers.
- **Excel/CSV Export:** Support for exporting financial reports and account lists for offline work.

## 🛠️ Technology Stack

- **Framework:** Next.js (App Router)
- **Styling:** Vanilla CSS (Modern CSS Variables & Glassmorphism)
- **Security:** Web Crypto API (Native Browser Encryption)
- **State Management:** Custom Hook-based Local Storage Engine
- **Icons:** Lucide / SVG Icons

## 🚀 Getting Started

### Installation

```bash
git clone https://github.com/thredeisacoder/Multi-Manager.git
cd Multi-Manager
npm install
```

### Running the App

```bash
npm run dev
```

Open: `http://localhost:3000`

## 🔒 Security Architecture

1.  **Data At-Rest:** Every field marked as "sensitive" is stored as an `ENC:...` ciphertext string in LocalStorage.
2.  **In-Memory Processing:** Decryption only occurs when the correct PIN is provided, and plaintext data exists only in the RAM of the current session.
3.  **PIN Derivation:** Processed via 100,000 PBKDF2 iterations to generate a robust 256-bit key, protecting against brute-force attacks.

## 📝 License

This project is developed for personal management.
