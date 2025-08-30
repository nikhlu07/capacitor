# Travlr-ID Credential Server

This is a copy of Veridian's credential server implementation adapted for Travlr-ID travel preferences credentials.

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│   credential-server │    │      keria          │
│   (Port 3001)       │    │   (Port 3901)       │
│                     │    │                     │
│  /oobi/{SCHEMA_SAID}│◄───┤ resolveOobi() calls │
│  serves schemas     │    │ stores in LMDB      │
│  from build/schemas/│    │                     │
└─────────────────────┘    └─────────────────────┘
```

## Features

- **Schema Hosting**: Serves travel preferences schema at `/oobi/{SCHEMA_SAID}`
- **ACDC Credentials**: Issues real ACDC credentials stored in KERIA's LMDB
- **SignifyTS Integration**: Uses Veridian's exact SignifyTS implementation
- **Docker Support**: Ready for containerization with KERIA

## Setup

1. **Install dependencies**:
   ```bash
   cd credential-server
   npm install
   ```

2. **Start KERIA (required)**:
   ```bash
   # Start KERIA container first
   docker run -d -p 3901:3901 -p 3902:3902 -p 3903:3903 weboftrust/keria:1.2.0-dev5
   ```

3. **Start credential server**:
   ```bash
   # Development mode
   npm run dev
   
   # Or build and run
   npm run build
   npm start
   ```

4. **Test with frontend**:
   Open `test-frontend/index.html` in browser

## Endpoints

- `GET /ping` - Health check
- `GET /schemas` - List available schemas
- `GET /oobi/{SCHEMA_SAID}` - Serve schema for OOBI resolution
- `POST /credentials/issue` - Issue ACDC credential
- `GET /credentials` - List issued credentials

## Schema

Travel Preferences Schema SAID: `Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU`

## Test Credential Issuance

1. Open `test-frontend/index.html`
2. Check server status
3. Fill in travel preferences form
4. Issue credential
5. Verify in KERIA's LMDB storage

## Docker Compose

```bash
docker-compose up -d
```

This starts:
- KERIA agent (port 3901)
- Credential server (port 3001)
- Schema hosting at `/oobi/`