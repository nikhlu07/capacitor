#!/usr/bin/env python3
"""
Debug AID matching issue
"""

# Test AID from our test
test_aid = "EDemo1234567890123456789012345678901234567890"

# AID from company_data_access.py  
company_access_aid = "EDemo1234567890123456789012345678901234567890"

print(f"Test AID:           '{test_aid}'")
print(f"Company access AID: '{company_access_aid}'")
print(f"Test AID length:           {len(test_aid)}")
print(f"Company access AID length: {len(company_access_aid)}")
print(f"AIDs match:         {test_aid == company_access_aid}")

# Check individual characters
if test_aid != company_access_aid:
    print("Character differences:")
    for i, (a, b) in enumerate(zip(test_aid, company_access_aid)):
        if a != b:
            print(f"  Position {i}: '{a}' vs '{b}'")