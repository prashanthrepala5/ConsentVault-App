"""
ConsentVault - Approval Program
DPDP Act Compliant Consent Management Smart Contract
"""

from pyteal import *

def approval_program():
    """
    Main approval program for ConsentVault smart contract.
    Handles consent creation, revocation, and queries.
    """
    
    # Global state keys
    consent_counter = Bytes("consent_counter")
    admin_address = Bytes("admin")
    
    # Local state keys
    user_consent_count = Bytes("consent_count")
    
    # Scratch space
    i = ScratchVar(TealType.uint64)
    
    # Helper: Get consent key by index
    @Subroutine(TealType.bytes)
    def consent_key(index: Expr) -> Expr:
        return Concat(Bytes("consent_"), Itob(index))
    
    # Helper: Hash policy document
    @Subroutine(TealType.bytes)
    def hash_policy(policy_url: Expr) -> Expr:
        return Sha256(policy_url)
    
    # On creation - initialize global state
    on_creation = Seq([
        App.globalPut(consent_counter, Int(0)),
        App.globalPut(admin_address, Txn.sender()),
        Approve()
    ])
    
    # Opt-in - initialize local state for user
    on_opt_in = Seq([
        App.localPut(Txn.sender(), user_consent_count, Int(0)),
        Approve()
    ])
    
    # Close out - clear local state
    on_close_out = Approve()
    
    # Update and delete - admin only
    on_update = Return(Txn.sender() == App.globalGet(admin_address))
    on_delete = Return(Txn.sender() == App.globalGet(admin_address))
    
    # Create consent
    # Args: company_id, purpose_code, policy_hash, expiry_timestamp
    company_id = Txn.application_args[1]
    purpose_code = Txn.application_args[2]
    policy_hash = Txn.application_args[3]
    expiry_timestamp = Btoi(Txn.application_args[4])
    
    new_consent_id = App.globalGet(consent_counter)
    user_count = App.localGet(Txn.sender(), user_consent_count)
    
    # Consent data format: status|company|purpose|policy_hash|granted_at|expiry|revoked_at
    consent_data = Concat(
        Bytes("active"),
        Bytes("|"),
        company_id,
        Bytes("|"),
        purpose_code,
        Bytes("|"),
        policy_hash,
        Bytes("|"),
        Itob(Global.latest_timestamp()),
        Bytes("|"),
        Itob(expiry_timestamp),
        Bytes("|"),
        Itob(Int(0))  # revoked_at = 0 means not revoked
    )
    
    create_consent = Seq([
        # Validate user has opted in
        Assert(App.optedIn(Txn.sender(), Global.current_application_id())),
        # Validate args
        Assert(Len(company_id) > Int(0)),
        Assert(Len(purpose_code) > Int(0)),
        Assert(expiry_timestamp > Global.latest_timestamp()),
        # Store consent in local state
        App.localPut(Txn.sender(), consent_key(user_count), consent_data),
        # Increment counters
        App.localPut(Txn.sender(), user_consent_count, user_count + Int(1)),
        App.globalPut(consent_counter, new_consent_id + Int(1)),
        # Log event for indexer
        Log(Concat(
            Bytes("ConsentCreated:"),
            Itob(new_consent_id),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            company_id,
            Bytes(":"),
            purpose_code
        )),
        Approve()
    ])
    
    # Revoke consent
    # Args: consent_index
    consent_index = Btoi(Txn.application_args[1])
    existing_consent = App.localGet(Txn.sender(), consent_key(consent_index))
    
    # Parse existing consent and update status to revoked
    revoke_consent = Seq([
        # Validate user has opted in
        Assert(App.optedIn(Txn.sender(), Global.current_application_id())),
        # Validate consent exists
        Assert(Len(existing_consent) > Int(0)),
        # Validate consent is not already revoked (check first 6 chars = "active")
        Assert(Extract(existing_consent, Int(0), Int(6)) == Bytes("active")),
        # Update consent status to revoked
        App.localPut(
            Txn.sender(),
            consent_key(consent_index),
            Concat(
                Bytes("revoked"),
                Extract(existing_consent, Int(6), Len(existing_consent) - Int(6)),
                Bytes("|"),
                Itob(Global.latest_timestamp())
            )
        ),
        # Log revocation event
        Log(Concat(
            Bytes("ConsentRevoked:"),
            Itob(consent_index),
            Bytes(":"),
            Txn.sender(),
            Bytes(":"),
            Itob(Global.latest_timestamp())
        )),
        Approve()
    ])
    
    # Verify consent (for companies/auditors)
    # Args: user_address, consent_index
    verify_address = Txn.application_args[1]
    verify_index = Btoi(Txn.application_args[2])
    verified_consent = App.localGet(verify_address, consent_key(verify_index))
    
    verify_consent = Seq([
        # Log verification query for audit trail
        Log(Concat(
            Bytes("ConsentVerified:"),
            verify_address,
            Bytes(":"),
            Itob(verify_index),
            Bytes(":"),
            Txn.sender()
        )),
        # Return consent data (will be in logs)
        Log(verified_consent),
        Approve()
    ])
    
    # Router
    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.OptIn, on_opt_in],
        [Txn.on_completion() == OnComplete.CloseOut, on_close_out],
        [Txn.on_completion() == OnComplete.UpdateApplication, on_update],
        [Txn.on_completion() == OnComplete.DeleteApplication, on_delete],
        [Txn.application_args[0] == Bytes("create"), create_consent],
        [Txn.application_args[0] == Bytes("revoke"), revoke_consent],
        [Txn.application_args[0] == Bytes("verify"), verify_consent],
    )
    
    return program


if __name__ == "__main__":
    from pyteal import compileTeal, Mode
    
    approval_teal = compileTeal(approval_program(), mode=Mode.Application, version=8)
    
    with open("consent_approval.teal", "w") as f:
        f.write(approval_teal)
    
    print("Approval program compiled successfully!")
    print(f"TEAL version: 8")
    print(f"Output: consent_approval.teal")
