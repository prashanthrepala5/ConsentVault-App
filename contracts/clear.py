"""
ConsentVault - Clear State Program
Handles opt-out/clear state for users
"""

from pyteal import *

def clear_state_program():
    """
    Clear state program - always approves.
    When a user clears their local state, all consent records are removed.
    Note: This does NOT affect the immutable audit trail on-chain.
    Historical consent records remain queryable via indexer.
    """
    return Approve()


if __name__ == "__main__":
    from pyteal import compileTeal, Mode
    
    clear_teal = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
    
    with open("consent_clear.teal", "w") as f:
        f.write(clear_teal)
    
    print("Clear program compiled successfully!")
    print(f"Output: consent_clear.teal")
