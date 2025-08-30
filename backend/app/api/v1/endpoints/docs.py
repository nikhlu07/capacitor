"""
API Documentation Endpoints
Provides enhanced OpenAPI documentation with examples and detailed schemas
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, Any
import json

router = APIRouter(
    prefix="/docs",
    tags=["Documentation"],
    include_in_schema=False
)

# Enhanced OpenAPI examples and schemas
OPENAPI_EXAMPLES = {
    "employee_registration": {
        "summary": "Register Employee",
        "description": "Complete employee registration with KERI AID creation",
        "value": {
            "employee_id": "EMP001",
            "name": "John Doe",
            "email": "john.doe@scania.com",
            "department": "Engineering",
            "phone": "+46701234567"
        }
    },
    "travel_preferences": {
        "summary": "Travel Preferences",
        "description": "Complete travel preferences for credential issuance",
        "value": {
            "flight_preferences": {
                "preferred_airlines": ["SAS", "Lufthansa"],
                "seating_preference": "aisle",
                "meal_preference": "vegetarian",
                "frequent_flyer_numbers": {
                    "SAS": "123456789",
                    "Lufthansa": "987654321"
                }
            },
            "hotel_preferences": {
                "preferred_chains": ["Hilton", "Marriott"],
                "room_type": "standard",
                "amenities": ["wifi", "gym", "breakfast"],
                "loyalty_programs": {
                    "Hilton": "HH123456",
                    "Marriott": "MM789012"
                }
            },
            "accessibility_needs": {
                "mobility_assistance": False,
                "dietary_restrictions": ["vegetarian"],
                "special_accommodations": []
            },
            "emergency_contact": {
                "name": "Jane Doe",
                "relationship": "spouse",
                "phone": "+46709876543",
                "email": "jane.doe@example.com"
            }
        }
    },
    "context_card_request": {
        "summary": "Context Card Request",
        "description": "Request filtered credential for company sharing",
        "value": {
            "employee_aid": "EABkVzj4ve0VSd8z_AmvhLg4lqcC_9WYX90k03q-R_Ydo",
            "company_id": "scania",
            "fields_to_share": [
                "flight_preferences.preferred_airlines",
                "hotel_preferences.preferred_chains",
                "accessibility_needs"
            ],
            "purpose": "Business travel booking",
            "expires_in_hours": 24
        }
    },
    "company_verification": {
        "summary": "Company Verification",
        "description": "Verify employee credential for travel booking",
        "value": {
            "employee_aid": "EABkVzj4ve0VSd8z_AmvhLg4lqcC_9WYX90k03q-R_Ydo",
            "credential_said": "EBdXt3gIXOf2BBWNHdSXCJnkcqRLlySbM-xPS7quPiM",
            "verification_purpose": "travel_booking",
            "requested_fields": [
                "flight_preferences",
                "hotel_preferences"
            ]
        }
    }
}

RESPONSE_EXAMPLES = {
    "employee_registration_success": {
        "success": True,
        "message": "Employee registered successfully",
        "aid": "EABkVzj4ve0VSd8z_AmvhLg4lqcC_9WYX90k03q-R_Ydo",
        "employee_id": "EMP001",
        "oobi": "http://localhost:3902/oobi/EABkVzj4ve0VSd8z_AmvhLg4lqcC_9WYX90k03q-R_Ydo",
        "created_at": "2024-01-15T10:30:00Z"
    },
    "credential_issued": {
        "success": True,
        "credential_id": "EBdXt3gIXOf2BBWNHdSXCJnkcqRLlySbM-xPS7quPiM",
        "employee_id": "EMP001",
        "aid": "EABkVzj4ve0VSd8z_AmvhLg4lqcC_9WYX90k03q-R_Ydo",
        "credential_type": "TravelPreferencesCredential",
        "issued_at": "2024-01-15T10:35:00Z",
        "expires_at": "2025-01-15T10:35:00Z",
        "status": "active"
    },
    "context_card_created": {
        "success": True,
        "context_card_id": "CC_001_scania_20240115",
        "employee_aid": "EABkVzj4ve0VSd8z_AmvhLg4lqcC_9WYX90k03q-R_Ydo",
        "company_id": "scania",
        "shared_fields": [
            "flight_preferences.preferred_airlines",
            "hotel_preferences.preferred_chains"
        ],
        "expires_at": "2024-01-16T10:40:00Z",
        "access_url": "https://api.travlr-id.com/api/v1/company/context-card/CC_001_scania_20240115"
    },
    "verification_success": {
        "valid": True,
        "employee_id": "EMP001",
        "credential_type": "TravelPreferencesCredential",
        "issued_at": "2024-01-15T10:35:00Z",
        "verified_data": {
            "flight_preferences": {
                "preferred_airlines": ["SAS", "Lufthansa"],
                "seating_preference": "aisle"
            },
            "hotel_preferences": {
                "preferred_chains": ["Hilton", "Marriott"]
            }
        },
        "verification_timestamp": "2024-01-15T14:20:00Z"
    }
}

AUTHENTICATION_EXAMPLES = {
    "employee_header": {
        "description": "Employee authentication using AID",
        "example": "X-Employee-AID: EABkVzj4ve0VSd8z_AmvhLg4lqcC_9WYX90k03q-R_Ydo"
    },
    "company_bearer": {
        "description": "Company API key authentication",
        "example": "Authorization: Bearer scania_api_key_here"
    },
    "admin_bearer": {
        "description": "Admin API key authentication", 
        "example": "Authorization: Bearer admin_api_key_here"
    }
}

@router.get("/examples")
async def get_api_examples():
    """Get comprehensive API examples for all endpoints."""
    return {
        "request_examples": OPENAPI_EXAMPLES,
        "response_examples": RESPONSE_EXAMPLES,
        "authentication_examples": AUTHENTICATION_EXAMPLES,
        "schemas": {
            "travel_credential_schema": {
                "description": "ACDC schema for travel preferences",
                "schema_said": "EBdXt3gIXOf2BBWNHdSXCJnkcqRLlySbM-xPS7quPiM",
                "version": "1.0.0",
                "fields": [
                    "employee_info",
                    "flight_preferences", 
                    "hotel_preferences",
                    "accessibility_needs",
                    "emergency_contact"
                ]
            }
        },
        "integration_guides": {
            "mobile_app": "Use /api/v1/mobile/ endpoints with X-Employee-AID header",
            "company_integration": "Use /api/v1/company/ endpoints with Bearer token",
            "admin_operations": "Use /api/v1/admin/ endpoints with admin Bearer token"
        }
    }

@router.get("/postman")
async def get_postman_collection():
    """Generate Postman collection for API testing."""
    collection = {
        "info": {
            "name": "Travlr-ID API",
            "description": "Complete API collection for Travlr-ID employee travel identity management",
            "version": "1.0.0",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "variable": [
            {
                "key": "base_url",
                "value": "http://localhost:8000",
                "type": "string"
            },
            {
                "key": "api_key",
                "value": "your-api-key-here",
                "type": "string"
            },
            {
                "key": "employee_aid",
                "value": "EABkVzj4ve0VSd8z_AmvhLg4lqcC_9WYX90k03q-R_Ydo",
                "type": "string"
            }
        ],
        "item": [
            {
                "name": "Mobile - Employee App",
                "item": [
                    {
                        "name": "Register Employee",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps(OPENAPI_EXAMPLES["employee_registration"]["value"], indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/mobile/employee/register",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "mobile", "employee", "register"]
                            }
                        }
                    },
                    {
                        "name": "Issue Travel Credential",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                },
                                {
                                    "key": "X-Employee-AID",
                                    "value": "{{employee_aid}}"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps(OPENAPI_EXAMPLES["travel_preferences"]["value"], indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/mobile/credentials/travel-preferences",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "mobile", "credentials", "travel-preferences"]
                            }
                        }
                    }
                ]
            },
            {
                "name": "Company Integration",
                "item": [
                    {
                        "name": "Request Context Card",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                },
                                {
                                    "key": "Authorization",
                                    "value": "Bearer {{api_key}}"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps(OPENAPI_EXAMPLES["context_card_request"]["value"], indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/company/context-card/request",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "company", "context-card", "request"]
                            }
                        }
                    },
                    {
                        "name": "Verify Credential",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                },
                                {
                                    "key": "Authorization",
                                    "value": "Bearer {{api_key}}"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps(OPENAPI_EXAMPLES["company_verification"]["value"], indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}/api/v1/company/verify-credential",
                                "host": ["{{base_url}}"],
                                "path": ["api", "v1", "company", "verify-credential"]
                            }
                        }
                    }
                ]
            }
        ]
    }
    
    return JSONResponse(content=collection)

@router.get("/schemas")
async def get_api_schemas():
    """Get detailed API schemas and data models."""
    return {
        "schemas": {
            "EmployeeRegistrationRequest": {
                "type": "object",
                "properties": {
                    "employee_id": {"type": "string", "description": "Unique employee identifier"},
                    "name": {"type": "string", "description": "Employee full name"},
                    "email": {"type": "string", "format": "email", "description": "Employee email address"},
                    "department": {"type": "string", "description": "Employee department"},
                    "phone": {"type": "string", "description": "Employee phone number"}
                },
                "required": ["employee_id", "name", "email", "department"],
                "example": OPENAPI_EXAMPLES["employee_registration"]["value"]
            },
            "TravelPreferencesRequest": {
                "type": "object",
                "properties": {
                    "flight_preferences": {"type": "object"},
                    "hotel_preferences": {"type": "object"},
                    "accessibility_needs": {"type": "object"},
                    "emergency_contact": {"type": "object"}
                },
                "example": OPENAPI_EXAMPLES["travel_preferences"]["value"]
            },
            "ContextCardRequest": {
                "type": "object",
                "properties": {
                    "employee_aid": {"type": "string", "description": "Employee's KERI AID"},
                    "company_id": {"type": "string", "description": "Company identifier"},
                    "fields_to_share": {"type": "array", "items": {"type": "string"}},
                    "purpose": {"type": "string", "description": "Purpose of data sharing"},
                    "expires_in_hours": {"type": "integer", "minimum": 1, "maximum": 168}
                },
                "required": ["employee_aid", "company_id", "fields_to_share"],
                "example": OPENAPI_EXAMPLES["context_card_request"]["value"]
            }
        },
        "responses": {
            "EmployeeRegistrationResponse": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "message": {"type": "string"},
                    "aid": {"type": "string", "description": "Employee's KERI AID"},
                    "employee_id": {"type": "string"},
                    "oobi": {"type": "string", "description": "Out-of-band introduction URL"},
                    "created_at": {"type": "string", "format": "date-time"}
                },
                "example": RESPONSE_EXAMPLES["employee_registration_success"]
            },
            "CredentialResponse": {
                "type": "object", 
                "properties": {
                    "success": {"type": "boolean"},
                    "credential_id": {"type": "string", "description": "ACDC credential SAID"},
                    "employee_id": {"type": "string"},
                    "aid": {"type": "string"},
                    "credential_type": {"type": "string"},
                    "issued_at": {"type": "string", "format": "date-time"},
                    "expires_at": {"type": "string", "format": "date-time"},
                    "status": {"type": "string", "enum": ["active", "expired", "revoked"]}
                },
                "example": RESPONSE_EXAMPLES["credential_issued"]
            }
        }
    }
