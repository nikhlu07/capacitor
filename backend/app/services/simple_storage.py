"""
Simple Working Storage - Using SQLite for actual functionality
"""

import sqlite3
import json
import uuid
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

class SimpleStorageService:
    """
    Working storage service using SQLite
    Until we get PostgreSQL and KERIA fully working
    """
    
    def __init__(self):
        self.db_path = "data/travlr_business.db"
        self._ensure_tables()
    
    def _ensure_tables(self):
        """Create tables if they don't exist"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Master cards table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS master_cards (
                    id TEXT PRIMARY KEY,
                    employee_aid TEXT NOT NULL,
                    encrypted_data TEXT NOT NULL,
                    data_hash TEXT NOT NULL,
                    profile_completeness TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1
                )
            ''')
            
            # Context cards table  
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS context_cards (
                    id TEXT PRIMARY KEY,
                    employee_aid TEXT NOT NULL,
                    company_aid TEXT NOT NULL,
                    company_name TEXT NOT NULL,
                    encrypted_data TEXT NOT NULL,
                    data_hash TEXT NOT NULL,
                    shared_fields TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    master_card_id TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1
                )
            ''')
            
            # Access logs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS access_logs (
                    id TEXT PRIMARY KEY,
                    card_id TEXT NOT NULL,
                    card_type TEXT NOT NULL,
                    accessed_by TEXT NOT NULL,
                    access_type TEXT NOT NULL,
                    accessed_at TEXT NOT NULL
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("✅ SQLite tables created successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to create tables: {e}")
            raise
    
    def create_master_card(self, employee_aid: str, encrypted_data: str, profile_completeness: dict) -> dict:
        """Create master card in SQLite"""
        try:
            card_id = str(uuid.uuid4())
            data_hash = hashlib.sha256(encrypted_data.encode()).hexdigest()
            now = datetime.utcnow().isoformat()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO master_cards 
                (id, employee_aid, encrypted_data, data_hash, profile_completeness, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (card_id, employee_aid, encrypted_data, data_hash, 
                  json.dumps(profile_completeness), now, now))
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Master card created: {card_id}")
            return {
                "id": card_id,
                "employee_aid": employee_aid,
                "data_hash": data_hash,
                "profile_completeness": profile_completeness,
                "created_at": now
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to create master card: {e}")
            raise
    
    def create_context_card(self, employee_aid: str, company_aid: str, company_name: str, 
                          encrypted_data: str, shared_fields: list, purpose: str, 
                          master_card_id: str = None) -> dict:
        """Create context card in SQLite"""
        try:
            card_id = str(uuid.uuid4())
            data_hash = hashlib.sha256(encrypted_data.encode()).hexdigest()
            now = datetime.utcnow().isoformat()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO context_cards 
                (id, employee_aid, company_aid, company_name, encrypted_data, data_hash, 
                 shared_fields, purpose, master_card_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (card_id, employee_aid, company_aid, company_name, encrypted_data, 
                  data_hash, json.dumps(shared_fields), purpose, master_card_id, now, now))
            
            conn.commit()
            conn.close()
            
            # Log creation
            self._log_access(card_id, "context_card", employee_aid, "create")
            
            logger.info(f"✅ Context card created: {card_id}")
            return {
                "id": card_id,
                "employee_aid": employee_aid,
                "company_aid": company_aid,
                "company_name": company_name,
                "data_hash": data_hash,
                "shared_fields": shared_fields,
                "purpose": purpose,
                "created_at": now
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to create context card: {e}")
            raise
    
    def get_master_card(self, employee_aid: str) -> Optional[dict]:
        """Get master card for employee"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, employee_aid, encrypted_data, data_hash, profile_completeness, 
                       created_at, updated_at
                FROM master_cards 
                WHERE employee_aid = ? AND is_active = 1
                ORDER BY created_at DESC LIMIT 1
            ''', (employee_aid,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                self._log_access(row[0], "master_card", employee_aid, "read")
                return {
                    "id": row[0],
                    "employee_aid": row[1],
                    "encrypted_data": row[2],
                    "data_hash": row[3],
                    "profile_completeness": json.loads(row[4]),
                    "created_at": row[5],
                    "updated_at": row[6]
                }
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get master card: {e}")
            raise
    
    def get_context_cards_for_employee(self, employee_aid: str) -> List[dict]:
        """Get all context cards for employee"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, company_aid, company_name, shared_fields, purpose, created_at, is_active
                FROM context_cards 
                WHERE employee_aid = ?
                ORDER BY created_at DESC
            ''', (employee_aid,))
            
            rows = cursor.fetchall()
            conn.close()
            
            cards = []
            for row in rows:
                cards.append({
                    "id": row[0],
                    "company_aid": row[1],
                    "company_name": row[2],
                    "shared_fields": json.loads(row[3]),
                    "purpose": row[4],
                    "created_at": row[5],
                    "is_active": bool(row[6])
                })
            
            return cards
            
        except Exception as e:
            logger.error(f"❌ Failed to get context cards: {e}")
            raise
    
    def get_context_card_for_company(self, card_id: str, company_aid: str) -> Optional[dict]:
        """Get context card data for company access"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, employee_aid, company_aid, company_name, encrypted_data, 
                       shared_fields, purpose, created_at
                FROM context_cards 
                WHERE id = ? AND company_aid = ? AND is_active = 1
            ''', (card_id, company_aid))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                # Log company access
                self._log_access(card_id, "context_card", company_aid, "company_access")
                
                return {
                    "id": row[0],
                    "employee_aid": row[1],
                    "company_aid": row[2],
                    "company_name": row[3],
                    "encrypted_data": row[4],
                    "shared_fields": json.loads(row[5]),
                    "purpose": row[6],
                    "created_at": row[7]
                }
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get context card for company: {e}")
            raise
    
    def revoke_context_card(self, card_id: str, employee_aid: str) -> bool:
        """Revoke context card"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE context_cards 
                SET is_active = 0, updated_at = ?
                WHERE id = ? AND employee_aid = ?
            ''', (datetime.utcnow().isoformat(), card_id, employee_aid))
            
            affected = cursor.rowcount
            conn.commit()
            conn.close()
            
            if affected > 0:
                self._log_access(card_id, "context_card", employee_aid, "revoke")
                logger.info(f"✅ Context card revoked: {card_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Failed to revoke context card: {e}")
            raise
    
    def _log_access(self, card_id: str, card_type: str, accessed_by: str, access_type: str):
        """Log access to cards"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO access_logs (id, card_id, card_type, accessed_by, access_type, accessed_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (str(uuid.uuid4()), card_id, card_type, accessed_by, access_type, 
                  datetime.utcnow().isoformat()))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.warning(f"Failed to log access: {e}")
    
    def get_access_logs(self, card_id: str) -> List[dict]:
        """Get access logs for a card"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT accessed_by, access_type, accessed_at
                FROM access_logs 
                WHERE card_id = ?
                ORDER BY accessed_at DESC
            ''', (card_id,))
            
            rows = cursor.fetchall()
            conn.close()
            
            logs = []
            for row in rows:
                logs.append({
                    "accessed_by": row[0],
                    "access_type": row[1],
                    "accessed_at": row[2]
                })
            
            return logs
            
        except Exception as e:
            logger.error(f"❌ Failed to get access logs: {e}")
            return []

# Global instance
simple_storage = SimpleStorageService()