# ConsentVault Architecture

## System Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React/Next.js App]
        WC[Wallet Connect]
        UI --> WC
    end

    subgraph "Wallet Layer"
        PW[Pera Wallet]
        DW[Defly Wallet]
        WC --> PW
        WC --> DW
    end

    subgraph "Algorand Network"
        subgraph "Smart Contract"
            SC[ConsentVault Contract]
            GS[Global State]
            LS[Local State]
            SC --> GS
            SC --> LS
        end
        
        IDX[Algorand Indexer]
        SC --> IDX
    end

    subgraph "Actors"
        DP[Data Principal<br/>User]
        DF[Data Fiduciary<br/>Company]
        RG[Regulator<br/>Auditor]
    end

    DP --> UI
    DF --> UI
    RG --> IDX

    PW --> SC
    DW --> SC
```

## Smart Contract Architecture

```mermaid
stateDiagram-v2
    [*] --> Created: Deploy Contract
    
    Created --> OptedIn: User Opt-In
    
    OptedIn --> ActiveConsent: create()
    ActiveConsent --> ActiveConsent: create() more
    ActiveConsent --> RevokedConsent: revoke()
    
    ActiveConsent --> Verified: verify()
    Verified --> ActiveConsent
    
    RevokedConsent --> ActiveConsent: create() new
    
    OptedIn --> [*]: Close Out
```

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as Pera Wallet
    participant F as Frontend
    participant C as Smart Contract
    participant I as Indexer

    Note over U,I: Grant Consent Flow
    U->>F: Select company & purposes
    F->>W: Create transaction
    W->>U: Sign request
    U->>W: Approve
    W->>C: Submit signed txn
    C->>C: Store in local state
    C->>I: Log ConsentCreated event
    C->>F: Confirm success

    Note over U,I: Revoke Consent Flow
    U->>F: Click revoke
    F->>W: Create revoke txn
    W->>U: Sign request
    U->>W: Approve
    W->>C: Submit signed txn
    C->>C: Update status to revoked
    C->>I: Log ConsentRevoked event
    C->>F: Confirm revocation

    Note over U,I: Audit Query Flow
    I->>I: Query by app ID
    I->>I: Filter by address/company
    I-->>F: Return transaction history
```

## Component Breakdown

### Frontend Components

```mermaid
graph TD
    subgraph "Pages"
        HP[Home Page]
        DP[Dashboard Page]
        CP[Consent Page]
        AP[Audit Page]
    end

    subgraph "Components"
        H[Header]
        F[Footer]
        WB[Wallet Button]
        CT[Consent Table]
        CF[Consent Form]
        AS[Audit Search]
        DS[Dashboard Stats]
    end

    subgraph "Context"
        WX[Wallet Context]
    end

    HP --> H
    HP --> F
    DP --> H
    DP --> CT
    DP --> DS
    CP --> CF
    AP --> AS

    H --> WB
    WB --> WX
    CT --> WX
    CF --> WX
```

### Smart Contract State

```mermaid
erDiagram
    GLOBAL_STATE {
        uint64 consent_counter
        bytes admin_address
    }

    LOCAL_STATE {
        uint64 consent_count
        bytes consent_0
        bytes consent_1
        bytes consent_N
    }

    CONSENT_RECORD {
        string status
        string company_id
        string purpose_code
        bytes policy_hash
        uint64 granted_at
        uint64 expiry
        uint64 revoked_at
    }

    GLOBAL_STATE ||--o{ LOCAL_STATE : "per user"
    LOCAL_STATE ||--o{ CONSENT_RECORD : contains
```

## Network Architecture

```mermaid
graph LR
    subgraph "User Device"
        B[Browser]
        PW[Pera Wallet App]
    end

    subgraph "Vercel Edge"
        FE[Next.js Frontend]
    end

    subgraph "Algorand Network"
        AN[Algod Node<br/>algonode.cloud]
        IN[Indexer Node<br/>algonode.cloud]
        TN[TestNet]
    end

    B --> FE
    B <--> PW
    PW --> AN
    AN --> TN
    FE --> IN
    IN --> TN
```

## Security Model

```mermaid
graph TB
    subgraph "Trust Boundaries"
        subgraph "User Controlled"
            UK[User Private Key]
            UW[User Wallet]
        end

        subgraph "Blockchain Secured"
            SC[Smart Contract]
            LS[Local State]
            TH[Transaction History]
        end

        subgraph "Public/Queryable"
            IDX[Indexer]
            GS[Global State]
        end
    end

    UK --> UW
    UW --> SC
    SC --> LS
    SC --> TH
    TH --> IDX
    
    style UK fill:#f9f,stroke:#333
    style UW fill:#f9f,stroke:#333
    style SC fill:#9f9,stroke:#333
    style LS fill:#9f9,stroke:#333
    style TH fill:#9f9,stroke:#333
```

## Deployment Pipeline

```mermaid
graph LR
    subgraph "Development"
        PT[PyTeal Code]
        TS[TypeScript/React]
    end

    subgraph "Build"
        TC[Compile TEAL]
        NB[Next.js Build]
    end

    subgraph "Deploy"
        AD[Algorand Deploy]
        VD[Vercel Deploy]
    end

    subgraph "Production"
        TN[TestNet Contract]
        VP[Vercel Frontend]
    end

    PT --> TC
    TC --> AD
    AD --> TN

    TS --> NB
    NB --> VD
    VD --> VP

    VP --> TN
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16 | Server-side rendering, routing |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Components | shadcn/ui | Accessible UI components |
| Wallet | Pera Wallet | Algorand wallet connection |
| Smart Contract | PyTeal | Python to TEAL compilation |
| Blockchain | Algorand | Layer-1 blockchain |
| Indexer | Algorand Indexer | Historical query API |
| Hosting | Vercel | Frontend deployment |
