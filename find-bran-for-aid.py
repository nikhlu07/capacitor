#!/usr/bin/env python3
"""
Find the correct bran for a specific AID
"""

from keri.core import coring
import json

def find_bran_for_aid(target_aid):
    """Try to find a bran that generates the target AID"""
    
    print(f"Looking for bran that generates AID: {target_aid}")
    
    # Try brans from brans.json
    try:
        with open('credential-server/data/brans.json', 'r') as f:
            brans = json.load(f)
        
        print("Testing brans from brans.json:")
        for key, bran in brans.items():
            print(f"  Testing {key}: {bran}")
            # Generate AID from bran
            signer = coring.Signer(qb64=bran)
            aid = signer.verfer.qb64
            print(f"    Generated AID: {aid}")
            if aid == target_aid:
                print(f"    ✅ MATCH FOUND! {key}: {bran}")
                return bran
    except Exception as e:
        print(f"Error reading brans.json: {e}")
    
    # Try some common brans
    common_brans = [
        "ClC9VsVmPAwQpbUobq4jC",
        "BG4MS-QY9f__GsTghCQZA",
        "0ACDEskKBFFBOM08",
        "TravlrDevPass123"
    ]
    
    print("\nTesting common brans:")
    for bran in common_brans:
        try:
            print(f"  Testing: {bran}")
            # Generate AID from bran
            signer = coring.Signer(qb64=bran)
            aid = signer.verfer.qb64
            print(f"    Generated AID: {aid}")
            if aid == target_aid:
                print(f"    ✅ MATCH FOUND! {bran}")
                return bran
        except Exception as e:
            print(f"    Error with {bran}: {e}")
    
    print("No matching bran found")
    return None

if __name__ == "__main__":
    target_aid = "EKikEJb07xdyCkLZ8lcLmWwxCdRYLIaW9rKL9Rcxv0SA"
    find_bran_for_aid(target_aid)