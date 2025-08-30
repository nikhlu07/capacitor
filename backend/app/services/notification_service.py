"""
Notification Service for Mobile Push Notifications
Handles consent request notifications to employee mobile apps
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for sending push notifications to mobile apps"""
    
    def __init__(self):
        self.device_tokens: Dict[str, str] = {}  # employee_aid -> device_token
        self.notification_queue: List[Dict[str, Any]] = []
    
    async def register_device(self, employee_aid: str, device_token: str) -> bool:
        """Register mobile device token for push notifications"""
        try:
            self.device_tokens[employee_aid] = device_token
            logger.info(f"📱 Registered device token for employee {employee_aid[:8]}...")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to register device token: {e}")
            return False
    
    async def send_consent_request_notification(
        self, 
        employee_aid: str, 
        request_id: str, 
        requested_fields: List[str],
        purpose: str,
        company_name: str = "Company"
    ) -> bool:
        """Send consent request notification to employee mobile app"""
        try:
            notification = {
                "type": "consent_request",
                "employee_aid": employee_aid,
                "request_id": request_id,
                "title": f"Data Request from {company_name}",
                "body": f"{company_name} is requesting access to your travel data",
                "data": {
                    "request_id": request_id,
                    "requested_fields": requested_fields,
                    "purpose": purpose,
                    "company_name": company_name,
                    "timestamp": datetime.utcnow().isoformat()
                },
                "created_at": datetime.utcnow()
            }
            
            # For now, store in memory queue (in production, use Firebase/APNs)
            self.notification_queue.append(notification)
            
            # Simulate push notification sending
            device_token = self.device_tokens.get(employee_aid)
            if device_token:
                logger.info(f"📨 Sending push notification to {employee_aid[:8]}... for request {request_id}")
                # TODO: Integrate with Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNs)
                await self._simulate_push_notification(notification, device_token)
            else:
                logger.warning(f"⚠️ No device token found for employee {employee_aid[:8]}...")
                # Store notification for when device comes online
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send consent notification: {e}")
            return False
    
    async def _simulate_push_notification(self, notification: Dict[str, Any], device_token: str):
        """Simulate sending push notification (replace with real FCM/APNs in production)"""
        try:
            # In production, this would be:
            # - Firebase Cloud Messaging for Android
            # - Apple Push Notification Service for iOS
            # - WebPush for web apps
            
            logger.info(f"🚀 SIMULATED PUSH NOTIFICATION:")
            logger.info(f"   Device: {device_token[:10]}...")
            logger.info(f"   Title: {notification['title']}")
            logger.info(f"   Body: {notification['body']}")
            logger.info(f"   Data: {json.dumps(notification['data'], indent=2)}")
            
            # Simulate network delay
            await asyncio.sleep(0.1)
            
        except Exception as e:
            logger.error(f"❌ Failed to simulate push notification: {e}")
    
    async def get_notifications_for_employee(self, employee_aid: str) -> List[Dict[str, Any]]:
        """Get all notifications for an employee (polling fallback)"""
        try:
            employee_notifications = [
                {
                    **notif,
                    "created_at": notif["created_at"].isoformat()
                }
                for notif in self.notification_queue
                if notif["employee_aid"] == employee_aid
            ]
            
            logger.info(f"📨 Found {len(employee_notifications)} notifications for {employee_aid[:8]}...")
            return employee_notifications
            
        except Exception as e:
            logger.error(f"❌ Failed to get notifications: {e}")
            return []
    
    async def mark_notification_read(self, notification_id: str) -> bool:
        """Mark notification as read/processed"""
        try:
            # In a real implementation, would update database
            # For now, just remove from queue
            self.notification_queue = [
                notif for notif in self.notification_queue 
                if notif.get("id") != notification_id
            ]
            return True
        except Exception as e:
            logger.error(f"❌ Failed to mark notification as read: {e}")
            return False
    
    async def send_approval_confirmation(
        self, 
        employee_aid: str, 
        request_id: str, 
        company_name: str,
        approved_fields: List[str]
    ) -> bool:
        """Send confirmation that consent was approved"""
        try:
            notification = {
                "type": "consent_approved",
                "employee_aid": employee_aid,
                "request_id": request_id,
                "title": "Data Shared Successfully",
                "body": f"Your travel data has been shared with {company_name}",
                "data": {
                    "request_id": request_id,
                    "company_name": company_name,
                    "approved_fields": approved_fields,
                    "timestamp": datetime.utcnow().isoformat()
                },
                "created_at": datetime.utcnow()
            }
            
            self.notification_queue.append(notification)
            
            device_token = self.device_tokens.get(employee_aid)
            if device_token:
                await self._simulate_push_notification(notification, device_token)
            
            logger.info(f"✅ Sent approval confirmation to {employee_aid[:8]}...")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send approval confirmation: {e}")
            return False
    
    # Production methods (to be implemented with real push services)
    async def _send_fcm_notification(self, notification: Dict[str, Any], device_token: str):
        """Send Firebase Cloud Messaging notification (Android)"""
        # TODO: Implement Firebase Admin SDK integration
        pass
    
    async def _send_apns_notification(self, notification: Dict[str, Any], device_token: str):
        """Send Apple Push Notification Service notification (iOS)"""
        # TODO: Implement APNs integration
        pass
    
    async def _send_web_push_notification(self, notification: Dict[str, Any], subscription: Dict[str, Any]):
        """Send Web Push notification (PWA)"""
        # TODO: Implement Web Push protocol
        pass

# Global notification service instance
notification_service = NotificationService()

# Notification endpoints for mobile app integration
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

notification_router = APIRouter()

class DeviceRegistration(BaseModel):
    employee_aid: str
    device_token: str
    platform: str  # "ios", "android", "web"

@notification_router.post("/notifications/register-device")
async def register_device_token(registration: DeviceRegistration):
    """Register device token for push notifications"""
    try:
        success = await notification_service.register_device(
            registration.employee_aid,
            registration.device_token
        )
        
        if success:
            return {"success": True, "message": "Device registered for notifications"}
        else:
            raise HTTPException(status_code=500, detail="Failed to register device")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@notification_router.get("/notifications/{employee_aid}")
async def get_employee_notifications(employee_aid: str):
    """Get all notifications for employee (polling fallback)"""
    try:
        notifications = await notification_service.get_notifications_for_employee(employee_aid)
        return {
            "employee_aid": employee_aid,
            "notifications": notifications,
            "count": len(notifications)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get notifications: {str(e)}")

@notification_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark notification as read"""
    try:
        success = await notification_service.mark_notification_read(notification_id)
        if success:
            return {"success": True, "message": "Notification marked as read"}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as read: {str(e)}")