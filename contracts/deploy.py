"""
ConsentVault - Contract Compilation and Deployment
Compiles PyTeal to TEAL and deploys to Algorand TestNet
"""

import os
import base64
from algosdk import account, mnemonic
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCreateTxn, StateSchema, OnComplete, wait_for_confirmation

from approval import approval_program
from clear import clear_state_program

try:
    from pyteal import compileTeal, Mode
except ImportError:
    print("PyTeal not installed. Run: pip install pyteal")
    exit(1)


def compile_contracts():
    """Compile PyTeal programs to TEAL"""
    print("Compiling PyTeal to TEAL...")
    
    approval_teal = compileTeal(approval_program(), mode=Mode.Application, version=8)
    clear_teal = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
    
    # Save compiled TEAL
    with open("consent_approval.teal", "w") as f:
        f.write(approval_teal)
    print(f"  - consent_approval.teal ({len(approval_teal)} bytes)")
    
    with open("consent_clear.teal", "w") as f:
        f.write(clear_teal)
    print(f"  - consent_clear.teal ({len(clear_teal)} bytes)")
    
    # Also save combined consent.teal for reference
    combined = f"""// ConsentVault Smart Contract
// DPDP Act Compliant Consent Management
// Compiled from PyTeal - TEAL v8

// ============================================
// APPROVAL PROGRAM
// ============================================
{approval_teal}

// ============================================
// CLEAR STATE PROGRAM  
// ============================================
{clear_teal}
"""
    with open("consent.teal", "w") as f:
        f.write(combined)
    print(f"  - consent.teal (combined reference)")
    
    return approval_teal, clear_teal


def get_algod_client():
    """Initialize Algorand client"""
    algod_address = os.environ.get("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
    algod_token = os.environ.get("ALGOD_TOKEN", "")
    
    return algod.AlgodClient(algod_token, algod_address)


def compile_program(client, source_code):
    """Compile TEAL source to bytecode"""
    compile_response = client.compile(source_code)
    return base64.b64decode(compile_response["result"])


def deploy_contract(approval_teal, clear_teal):
    """Deploy contract to Algorand TestNet"""
    print("\nDeploying to Algorand TestNet...")
    
    # Get deployer account
    deployer_mnemonic = os.environ.get("DEPLOYER_MNEMONIC")
    if not deployer_mnemonic:
        print("ERROR: DEPLOYER_MNEMONIC environment variable required")
        print("\nTo generate a test account:")
        print("  from algosdk import account, mnemonic")
        print("  sk, addr = account.generate_account()")
        print("  print(mnemonic.from_private_key(sk))")
        print("\nThen fund it at: https://bank.testnet.algorand.network/")
        return None
    
    deployer_sk = mnemonic.to_private_key(deployer_mnemonic)
    deployer_addr = account.address_from_private_key(deployer_sk)
    print(f"Deployer: {deployer_addr}")
    
    # Initialize client
    client = get_algod_client()
    
    # Check balance
    account_info = client.account_info(deployer_addr)
    balance = account_info.get("amount", 0) / 1_000_000
    print(f"Balance: {balance:.4f} ALGO")
    
    if balance < 0.5:
        print("ERROR: Insufficient balance. Need at least 0.5 ALGO")
        print("Fund at: https://bank.testnet.algorand.network/")
        return None
    
    # Compile programs
    approval_program = compile_program(client, approval_teal)
    clear_program = compile_program(client, clear_teal)
    
    print(f"Approval program: {len(approval_program)} bytes")
    print(f"Clear program: {len(clear_program)} bytes")
    
    # Define schema
    global_schema = StateSchema(num_uints=1, num_byte_slices=1)
    local_schema = StateSchema(num_uints=1, num_byte_slices=16)
    
    # Get suggested params
    params = client.suggested_params()
    
    # Create application transaction
    txn = ApplicationCreateTxn(
        sender=deployer_addr,
        sp=params,
        on_complete=OnComplete.NoOpOC,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=global_schema,
        local_schema=local_schema,
    )
    
    # Sign and send
    signed_txn = txn.sign(deployer_sk)
    tx_id = client.send_transaction(signed_txn)
    print(f"\nTransaction ID: {tx_id}")
    print("Waiting for confirmation...")
    
    # Wait for confirmation
    confirmed = wait_for_confirmation(client, tx_id, 4)
    app_id = confirmed["application-index"]
    
    print(f"\n{'='*50}")
    print(f"SUCCESS! Contract deployed")
    print(f"{'='*50}")
    print(f"Application ID: {app_id}")
    print(f"Explorer: https://testnet.algoexplorer.io/application/{app_id}")
    print(f"\nAdd to .env.local:")
    print(f"NEXT_PUBLIC_APP_ID={app_id}")
    
    # Save deployment info
    import json
    deployment_info = {
        "app_id": app_id,
        "deployer": deployer_addr,
        "tx_id": tx_id,
        "network": "testnet",
    }
    
    with open("../deployment.json", "w") as f:
        json.dump(deployment_info, f, indent=2)
    print(f"\nDeployment info saved to deployment.json")
    
    return app_id


def main():
    print("=" * 50)
    print("ConsentVault Contract Deployment")
    print("=" * 50)
    print()
    
    # Compile
    approval_teal, clear_teal = compile_contracts()
    
    # Deploy if mnemonic provided
    if os.environ.get("DEPLOYER_MNEMONIC"):
        deploy_contract(approval_teal, clear_teal)
    else:
        print("\nCompilation complete!")
        print("To deploy, set DEPLOYER_MNEMONIC environment variable")


if __name__ == "__main__":
    main()
