# Travlr-ID: KERI-based Travel Identity Management

A production-ready travel identity management system using KERI (Key Event Receipt Infrastructure) for secure, decentralized identity and consent management.

## Quick Start

```bash
# 1. Start infrastructure
cd infrastructure/docker
docker-compose up -d

# 2. Start backend
cd ../../backend
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Test
curl http://localhost:8000/health
```

## Architecture

- **Backend**: FastAPI with KERIA integration
- **Database**: PostgreSQL for business logic only
- **Identity**: KERI with GLEIF witnesses
- **Credentials**: ACDC stored in KERI (not database)

## Status

🚧 **In Development** - Building production-ready KERI integration