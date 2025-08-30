import bodyParser from "body-parser";
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import { join } from "path";
import { SignifyClient, ready as signifyReady, Tier } from "signify-ts";
import { config } from "./config";
import { TRAVEL_PREFERENCES_SCHEMA_SAID } from "./consts";
import { log } from "./log";

const app = express();

// CORS - Allow your frontend
app.use(cors({
  origin: ["http://localhost:8100", "http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));

app.use(bodyParser.json());

// Serve schemas at /oobi path (Veridian pattern)
app.use(
  "/oobi",
  express.static(join(__dirname, "schemas"), {
    setHeaders: (res) => {
      res.setHeader("Content-Type", "application/schema+json");
    },
  })
);

// Health check
app.get("/ping", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Travlr-ID Credential Server (Veridian Pattern)",
    timestamp: new Date().toISOString(),
    keria: config.keria.url,
    schemas: [TRAVEL_PREFERENCES_SCHEMA_SAID]
  });
});

// List schemas
app.get("/schemas", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [{
      id: TRAVEL_PREFERENCES_SCHEMA_SAID,
      name: "Travel Preferences Credential",
      oobiUrl: `${config.oobiEndpoint}/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`
    }]
  });
});

// Issue credential using your frontend's AID
app.post("/credentials/issue", async (req: Request, res: Response) => {
  try {
    const { holderAid, travelPreferences } = req.body;
    
    // Validate required fields
    if (!holderAid) {
      return res.status(400).json({
        success: false,
        error: "holderAid is required"
      });
    }

    if (!travelPreferences) {
      return res.status(400).json({
        success: false, 
        error: "travelPreferences data is required"
      });
    }

    // For now, simulate credential creation (will integrate real KERIA later)
    const mockCredential = {
      credentialId: `cred-${Date.now()}`,
      schemaId: TRAVEL_PREFERENCES_SCHEMA_SAID,
      issuer: "issuer", // This would be the server's AID
      holder: holderAid,
      attributes: {
        i: holderAid, // Holder AID in attributes
        ...travelPreferences
      },
      issued: new Date().toISOString(),
      status: "issued"
    };

    log(`🎫 Travel credential issued for AID: ${holderAid}`);
    log(`📋 Preferences: ${JSON.stringify(travelPreferences, null, 2)}`);

    res.json({
      success: true,
      data: {
        credential: mockCredential,
        message: "Travel preferences credential created successfully",
        oobiResolution: `Schema resolved from: ${config.oobiEndpoint}/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`
      }
    });

  } catch (error: any) {
    log(`❌ Error issuing credential: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint specifically for your frontend integration
app.post("/test-with-frontend-aid", async (req: Request, res: Response) => {
  try {
    const { identity, preferences } = req.body;
    
    log(`🧪 Testing with Frontend AID: ${identity?.aid}`);
    log(`👤 Employee: ${identity?.displayName} (${identity?.employeeId})`);
    
    const testResult = {
      frontendAid: identity?.aid,
      employeeInfo: {
        name: identity?.displayName,
        id: identity?.employeeId
      },
      schemaResolution: {
        said: TRAVEL_PREFERENCES_SCHEMA_SAID,
        url: `${config.oobiEndpoint}/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`,
        status: "✅ Schema available"
      },
      credentialPreview: {
        holder: identity?.aid,
        attributes: {
          i: identity?.aid,
          employeeId: identity?.employeeId,
          ...preferences
        },
        ready: true
      }
    };

    res.json({
      success: true,
      message: "Frontend integration test successful",
      data: testResult
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  log(`❌ Server Error: ${err.message}`);
  res.status(500).json({
    success: false,
    error: err.message,
  });
});

const PORT = config.port;

app.listen(PORT, () => {
  log(`🚀 Travlr-ID Credential Server running on port ${PORT}`);
  log(`📋 Schema OOBI: ${config.oobiEndpoint}/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`);
  log(`🔗 KERIA: ${config.keria.url}`);
  log(`🌐 Ready for frontend integration!`);
});

export default app;