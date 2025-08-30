"""
Travlr-ID Backend API
FastAPI application for KERI-based travel identity management
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import engine, Base
from app.services.keria import keria_service
from app.api.v1.router import api_router
import app.models  # Import models to register them

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("🚀 Starting Travlr-ID Backend...")
    
    try:
        # Create database tables
        logger.info("📦 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created")
        
        # Initialize KERIA service with real infrastructure
        await keria_service.initialize()
        logger.info("✅ Backend started with full KERIA integration enabled")
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        logger.warning("⚠️ Continuing in demo mode")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Travlr-ID Backend...")
    # await keria_service.close()
    logger.info("✅ Services closed")

# Create FastAPI application
app = FastAPI(
    lifespan=lifespan,
    title="Travlr-ID API",
    description="""
    ## Travlr-ID Employee Travel Identity Management System
    
    Complete KERI-based identity management for employee travel preferences and credentials.
    
    ### Key Features
    - **Employee Identity Management**: Create and manage employee AIDs (Autonomic Identifiers)
    - **Travel Credentials**: Issue and manage ACDC travel preference credentials
    - **Context Cards**: Create filtered credentials for specific companies
    - **Consent Management**: Employee-controlled data sharing
    - **Company Integration**: APIs for enterprise travel systems
    
    ### Architecture
    - **KERI Infrastructure**: Self-sovereign identity with cryptographic verification
    - **KERIA Agent**: KERI agent for credential management
    - **Witness Network**: 5 witnesses with 3-of-5 threshold for production
    - **Storage**: KERIA/LMDB for credentials, PostgreSQL for business logic
    
    ### Getting Started
    1. **Mobile Developers**: Use `/api/v1/mobile/` endpoints for employee-facing features
    2. **Company Integration**: Use `/api/v1/company/` endpoints with API key authentication
    3. **System Admin**: Use `/api/v1/admin/` endpoints for system management
    
    ### Authentication
    - **Employees**: Use `X-Employee-AID` header with employee's AID
    - **Companies**: Use `Authorization: Bearer {api_key}` header
    - **Admin**: Use admin API key for system operations
    """,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "Travlr-ID API Support",
        "email": "support@travlr-id.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    servers=[
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        },
        {
            "url": "https://api.travlr-id.com",
            "description": "Production server"
        }
    ]
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=getattr(settings, 'CORS_ORIGIN_REGEX', None),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root():
    """Root endpoint with API information and links."""
    return HTMLResponse(content=f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Travlr-ID API</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
            .container {{ max-width: 800px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            h1 {{ color: #2c3e50; }}
            .links {{ margin: 20px 0; }}
            .link {{ display: inline-block; margin: 10px 15px 10px 0; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; }}
            .link:hover {{ background: #2980b9; }}
            .status {{ color: #27ae60; font-weight: bold; }}
            .section {{ margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Travlr-ID API</h1>
            <p class="status">Status: Healthy ✅</p>
            <p>Version: {settings.APP_VERSION}</p>
            
            <div class="section">
                <h3>📖 API Documentation</h3>
                <div class="links">
                    <a href="/docs" class="link">Swagger UI</a>
                    <a href="/redoc" class="link">ReDoc</a>
                    <a href="{settings.API_V1_PREFIX}/openapi.json" class="link">OpenAPI JSON</a>
                </div>
            </div>
            
            <div class="section">
                <h3>🔗 Quick Links</h3>
                <div class="links">
                    <a href="/health" class="link">Health Check</a>
                    <a href="{settings.API_V1_PREFIX}/health" class="link">API Health</a>
                    <a href="{settings.API_V1_PREFIX}/health/database" class="link">Database Status</a>
                </div>
            </div>
            
            <div class="section">
                <h3>🏗️ Architecture</h3>
                <ul>
                    <li><strong>KERI Infrastructure</strong>: Self-sovereign identity management</li>
                    <li><strong>KERIA Agent</strong>: Credential issuance and management</li>
                    <li><strong>Witness Network</strong>: Decentralized consensus (3-of-5 threshold)</li>
                    <li><strong>Storage</strong>: KERIA/LMDB + PostgreSQL + Redis</li>
                </ul>
            </div>
            
            <div class="section">
                <h3>📱 Integration</h3>
                <ul>
                    <li><strong>Mobile Apps</strong>: Use <code>/api/v1/mobile/</code> endpoints</li>
                    <li><strong>Companies</strong>: Use <code>/api/v1/company/</code> endpoints</li>
                    <li><strong>Admin</strong>: Use <code>/api/v1/admin/</code> endpoints</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
    """)

@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        keria_status = await keria_service.health_check()
        keria_info = "connected" if keria_status else "disconnected"
    except:
        keria_info = "unavailable"
    
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "keria": keria_info
    }