# DPDP Act Compliance - ConsentVault

## Overview

ConsentVault is designed to help organizations comply with India's **Digital Personal Data Protection (DPDP) Act, 2023**. This document explains how the platform addresses key compliance requirements.

## Key DPDP Act Requirements Addressed

### 1. Lawful Consent (Section 6)

The DPDP Act requires that personal data processing must be based on **free, specific, informed, unconditional, and unambiguous consent**.

**How ConsentVault addresses this:**

- **Granular Consent**: Users can grant or deny consent for specific data purposes (e.g., analytics, marketing, third-party sharing) independently
- **Clear Policy Links**: Each consent request includes a link to the data fiduciary's privacy policy, hashed and stored on-chain for integrity verification
- **No Bundling**: Consents are captured individually, preventing "all or nothing" consent patterns
- **Timestamped Records**: Every consent is recorded with a blockchain timestamp, proving when consent was obtained

### 2. Right to Withdraw Consent (Section 6(4))

Data principals have the right to withdraw consent at any time, with the same ease as giving it.

**How ConsentVault addresses this:**

- **One-Click Revocation**: Users can revoke any consent with a single transaction
- **Immediate Effect**: Revocation is recorded on-chain instantly and is immediately verifiable
- **Audit Trail**: Both the original consent and revocation are preserved, creating an immutable history
- **No Intermediaries**: Users interact directly with the smart contract - no company can block or delay revocation

### 3. Notice Requirements (Section 5)

Data fiduciaries must provide clear notice about data processing purposes.

**How ConsentVault addresses this:**

- **Purpose Codes**: Standardized purpose codes (ACCOUNT_DATA, ANALYTICS, MARKETING, etc.) ensure clarity
- **Policy Hash Verification**: The hash of the privacy policy at the time of consent is stored on-chain, proving what the user agreed to
- **Company Identification**: Each consent clearly identifies the data fiduciary

### 4. Data Retention Limits (Section 9)

Personal data should not be retained beyond the purpose for which it was collected.

**How ConsentVault addresses this:**

- **Expiry Timestamps**: Each consent includes an expiry date, after which the consent is no longer valid
- **Automatic Invalidation**: Companies can query whether a consent is still active or expired
- **Configurable Duration**: Users and companies can set appropriate retention periods

### 5. Obligations of Data Fiduciaries (Section 8)

Data fiduciaries must implement appropriate security safeguards and maintain records.

**How ConsentVault addresses this:**

- **Immutable Records**: Blockchain storage ensures consent records cannot be tampered with
- **Cryptographic Security**: All data is cryptographically secured on the Algorand blockchain
- **Audit Readiness**: Complete consent history is queryable for regulatory audits

## Compliance Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Data Principal │     │  Data Fiduciary  │     │    Regulator    │
│     (User)      │     │    (Company)     │     │   (Auditor)     │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │ Grant/Revoke          │ Request Consent        │ Audit Query
         │ Consent               │ Verify Consent         │
         │                       │                        │
         ▼                       ▼                        ▼
┌────────────────────────────────────────────────────────────────────┐
│                      ConsentVault Smart Contract                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   create()  │  │  revoke()   │  │  verify()   │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                    │
│  Global State: consent_counter, admin                              │
│  Local State: user_consent_count, consent_0..N                     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Algorand Blockchain                           │
│  • Immutable transaction history                                   │
│  • Cryptographic verification                                      │
│  • Decentralized consensus                                         │
│  • Indexer for historical queries                                  │
└────────────────────────────────────────────────────────────────────┘
```

## Consent Data Model

Each consent record contains:

| Field | Description | DPDP Relevance |
|-------|-------------|----------------|
| `status` | active/revoked | Current consent state |
| `company_id` | Data fiduciary identifier | Who is processing data |
| `purpose_code` | Processing purpose | What data is used for |
| `policy_hash` | SHA-256 of privacy policy | What user agreed to |
| `granted_at` | Timestamp | When consent was given |
| `expiry` | Timestamp | Retention limit |
| `revoked_at` | Timestamp (0 if active) | When consent was withdrawn |

## Verification Flow for Companies

1. Company calls `verify(user_address, consent_index)` on the smart contract
2. Smart contract logs the verification request (audit trail)
3. Smart contract returns consent data
4. Company checks:
   - `status == "active"`
   - `expiry > current_time`
   - `purpose_code` matches intended use
5. Verification is recorded on-chain for regulatory compliance

## Audit Flow for Regulators

1. Regulator uses Indexer to query all transactions for the application
2. Filter by:
   - Specific user address
   - Company ID
   - Date range
   - Event type (created/revoked/verified)
3. Export complete audit trail as JSON
4. Verify any consent against on-chain state

## Benefits of Blockchain-Based Consent

| Traditional Approach | ConsentVault Approach |
|---------------------|----------------------|
| Company-controlled database | User-controlled blockchain state |
| Can be modified after the fact | Immutable, tamper-proof records |
| Single point of failure | Decentralized, always available |
| Trust the company | Trustless, cryptographically verified |
| Opaque audit trails | Transparent, public verification |
| Consent fatigue from multiple systems | Single wallet, unified consent view |

## Limitations and Considerations

1. **Not Legal Advice**: This platform provides technical infrastructure; legal compliance requires additional organizational measures
2. **On-Chain Data**: Only consent metadata is stored on-chain; actual personal data should remain off-chain
3. **User Education**: Users need to understand wallet management and transaction signing
4. **Network Costs**: Transactions require ALGO for fees (minimal on Algorand)

## References

- [DPDP Act, 2023 Full Text](https://www.meity.gov.in/data-protection-framework)
- [Algorand Developer Documentation](https://developer.algorand.org/)
- [PyTeal Documentation](https://pyteal.readthedocs.io/)
