#!/usr/bin/env python3
"""
Simple credential issuance using exact Veridian approach
"""

import httpx
import asyncio
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def issue_credential_simple():
    """Issue credential using exact Veridian endpoints"""
    
    try:
        # Check if KERIA is running
        logger.info("Checking KERIA health...")
        async with httpx.AsyncClient() as client:
            health_response = await client.get("http://localhost:3906/health")
            if health_response.status_code == 200:
                logger.info("✅ KERIA is running")
            else:
                logger.error("❌ KERIA is not running")
                return None
        
        # Check if our backend is running
        logger.info("Checking backend health...")
        async with httpx.AsyncClient() as client:
            backend_response = await client.get("http://localhost:8000/health")
            if backend_response.status_code == 200:
                logger.info("✅ Backend is running")
            else:
                logger.error("❌ Backend is not running")
                return None
        
        # Use the exact schema SAID from Veridian
        schema_said = "EN7JR2OF5JS_OBalN09UPeQPBZ_tP669iuMjuDxY4ulz"
        logger.info(f"Using schema SAID: {schema_said}")
        
        # Issue credential through backend (exact Veridian approach)
        logger.info("Issuing credential through backend...")
        
        credential_request = {
            "issuer_aid": "EKikEJb07xdyCkLZ8lcLmWwxCdRYLIaW9rKL9Rcxv0SA",  # Veridian issuer AID
            "recipient_aid": "EKikEJb07xdyCkLZ8lcLmWwxCdRYLIaW9rKL9Rcxv0SA",  # Same for testing
            "schema_said": schema_said,
            "credential_data": {
                "employeeId": "VERIDIAN-SIMPLE-001",
                "seatPreference": "window",
                "mealPreference": "vegetarian",
                "airlines": "SAS,Lufthansa",
                "emergencyContact": "Emergency Contact +46701234567",
                "allergies": "nuts,shellfish"
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/api/v1/credentials/travel-preferences",
                json=credential_request,
                headers={"Content-Type": "application/json"}
            )
            
            logger.info(f"Credential issuance response: {response.status_code}")
            
            if response.status_code in [200, 201]:
                result = response.json()
                credential_said = result.get("credential_said") or result.get("said")
                logger.info(f"✅ Credential issued successfully: {credential_said}")
                return credential_said
            else:
                logger.error(f"❌ Failed to issue credential: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"❌ Simple credential issuance failed: {e}")
        import traceback
        traceback.print_exc()
        return None

async def main():
    """Main function"""
    logger.info("Simple Veridian-Style Credential Issuance")
    logger.info("=" * 45)
    
    credential_said = await issue_credential_simple()
    
    if credential_said:
        logger.info("\n✅ SUCCESS: Credential issued using simple Veridian approach!")
        logger.info(f"   Credential SAID: {credential_said}")
    else:
        logger.error("\n❌ FAILED: Could not issue credential using simple Veridian approach!")

if __name__ == "__main__":
    asyncio.run(main())
