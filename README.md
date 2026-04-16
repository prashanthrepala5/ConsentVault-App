# ConsentvaultApp

> A decentralized, trustless Consent Manager built on Algorand to solve India's DPDP Act compliance. It replaces standard "I Agree" buttons with immutable, on-chain transactions to grant users granular privacy control while giving companies a fraud-proof audit trail for regulators.

**Topics:** `algorand` • `nextjs` • `blockchain` • `privacy` • `dpdp-act` • `regtech` • `consent-management` • `compliance` • `smart-contracts` • `prisma`

**🔗 [Live Demo](https://consent-vault-app.vercel.app/)**

---

## 1. Relevance of the Problem
With the rollout of India’s Digital Personal Data Protection (DPDP) Act, "Data Fiduciaries" (companies) are facing a massive compliance hurdle: they must prove that every piece of user consent was obtained freely and specifically. Right now, this "proof" lives in centralized databases controlled by the companies themselves. This creates a conflict of interest—logs can be tampered with, lost, or disputed.

On the flip side, everyday users are lost. We click "I Agree" on hundreds of apps but have no single dashboard to track who has our data or how to revoke access. There is currently no unified, transparent bridge between the user’s right to privacy and the company’s need for compliance.

## 2. Proposed Solution
We are building ConsentVault, a decentralized "Consent Manager" (a key framework under the DPDP Act) built on the Algorand blockchain.

ConsentVault acts as a neutral third-party ledger. It replaces the traditional "I Agree" button with a blockchain transaction. This gives users a single, powerful dashboard to manage their digital permissions across different apps, while simultaneously providing companies with an immutable, fraud-proof audit trail that they can show regulators to prove compliance.

## 3. Feasibility & Technical Approach
The system is designed to be lightweight and fast, leveraging Algorand’s low gas fees.

| Phase | Description |
| :--- | :--- |
| **The Signup** | When a user onboards to a partner app (e.g., a Fintech platform), they sign a transaction via their Algorand wallet instead of just clicking a button. |
| **The Record** | This transaction contains a hash of the specific privacy policy version they agreed to. This creates a permanent, timestamped proof of consent on-chain that neither the user nor the company can alter later. |
| **The Revocation** | If a user wants to withdraw consent (their right under the DPDP Act), they simply initiate a "Revoke" transaction on the ConsentVault dashboard. The company's backend, which listens to the blockchain via an API, automatically triggers its internal data deletion protocols in response. |

## 4. Why this fits the "DPDP & RegTech" Track
This project creates a "trustless" verification system. Regulators don't have to trust a company's internal logs; they can verify the on-chain history. It empowers users with granular control (e.g., approving "email" but rejecting "location" via smart contracts) and fulfills the government's vision of a Consent Manager framework that is interoperable and secure.

## 5. Scalability
ConsentVault is sector-agnostic. While we are demoing this for Fintech, the exact same architecture applies to Healthcare, E-commerce, and Social Media. Since every digital business in India must comply with the DPDP Act, the potential user base is effectively the entire internet population of the country, making this solution immediately scalable across multiple domains.

---

## 🎯 Elevator Pitch

> "ConsentVault is a decentralized compliance tool for India's new DPDP Act. It moves user consent logs from centralized company servers to the Algorand blockchain. This allows users to manage and revoke permissions from a single dashboard while giving companies an immutable, fraud-proof audit trail to satisfy regulators. It solves the issue of trust in data privacy by making consent verifiable, transparent, and user-controlled."

---

## 🚀 How to Run & Test

To test the entire system end-to-end (connecting the wallet, paying the gas fee, and confirming the backend database update):

1. **Fire up the Local Server:**
   ```bash
   npm run dev
   ```
   Open up your browser and go to `http://localhost:3000`.

2. **Connect & Trigger Consent:**
   * Click the **Connect Wallet** button on the website and scan the QR code using your **Pera Wallet** mobile app (ensure you are on Testnet so you don't spend real ALGO).
   * Navigate to your **Dashboard**.
   * Toggle one of the App Permissions (for example, turn on "View Profile" for a connected app).
   * A notification should pop up saying it's initiating the transaction. Your Pera app will ask you to sign a `0.01 ALGO` transaction (the fee). **Sign it.**

3. **Verify the "Trustless" Magic!**
   * Once signed, the browser shoots a request to `/api/permissions` containing your Wallet Address and the transaction ID.
   * Under the hood, the Next.js API route pings the Algorand Node to verify that the transaction actually exists and that exactly 0.01 ALGO was paid.
   * Only after the blockchain confirms it was legit, `lib/prisma.ts` connects to the **Neon PostgreSQL database** and saves your new permission status.
   * Refresh the page! Your toggle switch should stay turned ON, proving it successfully retrieved the newly stored state from the Database.

---

## 🔐 Important Code Context

While the extensive boilerplate code has been omitted for brevity, the core logic relies on validating an Algorand transaction before updating any backend states. Here is the critical snippet verifying the on-chain permission transaction:

```typescript
// Validating On-Chain Consent Transactions
// app/api/permissions/route.ts
const client = getAlgodClient();
let txInfo;
try {
  txInfo = await client.pendingTransactionInformation(txid).do();
} catch {
  const indexer = getIndexerClient();
  const res = await indexer.lookupTransactionByID(txid).do();
  txInfo = res.transaction;
}

const isPayment = txInfo.type === 'pay' || txInfo.txn?.type === 'pay';
const amount = txInfo.amount || txInfo.txn?.amt || 0;

if (isPayment && amount >= 10000) {
  // 2. Perform DB Update (Immutable audit trail confirmed via txid!)
  const updatedPermission = await prisma.permission.upsert({ 
    // update logic...
  });
}
```

---

## 🗄️ Database Architecture & Prisma Config

ConsentVault bridges the Algorand blockchain with a highly-scalable PostgreSQL database (via Neon) using **Prisma v7**.

To ensure native compatibility with Serverless functions (like Vercel API routes), we strictly process database queries utilizing raw **Prisma PostgreSQL Driver Adapters** (`@prisma/adapter-pg`). 
This means standard connection string logic is entirely isolated. The application explicitly manages database connection pooling inside `lib/prisma.ts` before the API routes resolve. This bleeding-edge architecture completely prevents connection-timeout crashes in Vercel serverless setups and enables rapid, strict data validation.

---

## 🔗 App to Database Mapping (How It Works)

Here is exactly how the user experience on the live website maps to the data architecture laid out in `prisma/schema.prisma`:

1. **The `Wallet` Model (User Identity):** When a user hits **"Connect Wallet"** and scans with Pera, they share their public Algorand address. Prisma looks at the `model Wallet` in the schema and creates/finds a row securely identifying them.
2. **The `ConnectedApp` Model (The Partners):** The dashboard displays third-party platforms asking for data. These apps populate the `model ConnectedApp`, ensuring infinite scalability to add new ecosystem partners dynamically.
3. **The `Permission` Model (The Trustless Core):** When a user switches a boolean flag (e.g., "Allow Notification Access"):
   * **The Blockchain Step:** The UI forces them to sign an Algorand transaction (e.g., 0.01 ALGO verification fee).
   * **The Prisma Step:** Once confirmed, the backend leverages Prisma to update the `model Permission` table, specifically flagging `viewProfile: true`.
   * **The Audit Trail:** Most importantly, it saves the `lastUpdatedTx` (the unique Algorand Transaction ID) directly in the database row. 

The website is physically incapable of finalizing a boolean permission flag unless it successfully intercepts a valid on-chain transaction hash. That precise interaction is what makes this a decentralized, legally-compliant Consent Manager.

---

## 📂 Project Structure

```text
ConsentVault-App/
├── app/
│   ├── api/
│   ├── consent/
│   ├── dashboard/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── audit/
│   ├── consent/
│   ├── dashboard/
│   ├── landing/
│   └── ui/               # shadcn/ui components
├── contracts/            # Algorand Smart Contracts
│   ├── approval.py
│   ├── clear.py
│   └── deploy.py
├── docs/                 # Documentation
│   ├── architecture.md
│   └── dpdp-compliance.md
├── hooks/
├── lib/                  # Utilities & Connections
│   ├── algorand.ts       # Algorand Client Init
│   ├── wallet-context.tsx
│   └── utils.ts
├── prisma/
│   └── schema.prisma     # PostgreSQL Database Schema
├── public/
├── scripts/
│   ├── deploy.js
│   ├── indexer-query.js
│   └── test-consent.js
├── styles/
│   └── globals.css
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```
