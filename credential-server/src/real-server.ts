import bodyParser from "body-parser";
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import { join } from "path";
import { SignifyClient } from "signify-ts";
import { config } from "./config";
import { TRAVEL_PREFERENCES_SCHEMA_SAID } from "./consts";
import { log } from "./log";
import { initializeKERIA, setupKERIInfrastructure, testCredentialCreation } from "./keria-setup";

const app = express();
let keriaClient: SignifyClient | null = null;
let isKeriaReady = false;

// CORS
app.use(cors({
  origin: ["http://localhost:8100", "http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));

app.use(bodyParser.json());

// Serve schemas (Veridian pattern)
app.use("/oobi", express.static(join(__dirname, "schemas"), {
  setHeaders: (res) => {
    res.setHeader("Content-Type", "application/schema+json");
  },
}));

// Health check with KERIA status
app.get("/ping", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Travlr-ID Real KERIA Credential Server",
    timestamp: new Date().toISOString(),
    keria: {
      url: config.keria.url,
      connected: !!keriaClient,
      ready: isKeriaReady
    },
    schemas: [TRAVEL_PREFERENCES_SCHEMA_SAID]
  });
});

// REAL credential issuance using KERIA
app.post("/credentials/issue-real", async (req: Request, res: Response) => {
  if (!keriaClient || !isKeriaReady) {
    return res.status(503).json({
      success: false,
      error: "KERIA not ready. Please wait for initialization."
    });
  }

  try {
    const { holderAid, travelPreferences } = req.body;
    
    if (!holderAid) {
      return res.status(400).json({
        success: false,
        error: "holderAid is required"
      });
    }

    log(`🎫 Issuing REAL credential for AID: ${holderAid}`);

    const ISSUER_NAME = "issuer";
    
    // Get registry
    const registries = await keriaClient.registries().list(ISSUER_NAME);
    const registryKey = registries[0].regk;

    // Prepare attributes (ACDC format)
    const attributes = {
      i: holderAid, // Holder AID
      employeeId: travelPreferences.employeeId,
      seatPreference: travelPreferences.seatPreference,
      mealPreference: travelPreferences.mealPreference,
      airlines: travelPreferences.airlines || "",
      emergencyContact: travelPreferences.emergencyContact || "",
      allergies: travelPreferences.allergies || ""
    };

    // Issue REAL ACDC credential
    log(`🔥 Calling KERIA credentials().issue()...`);
    const result = await keriaClient.credentials().issue(ISSUER_NAME, {
      ri: registryKey,
      s: TRAVEL_PREFERENCES_SCHEMA_SAID,
      a: attributes,
    });

    // Wait for operation completion
    log(`⏳ Waiting for credential operation to complete...`);
    let operation = await keriaClient.operations().get(result.op.name);
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 250));
      operation = await keriaClient.operations().get(result.op.name);
    }

    const credentialId = result.acdc.ked.d;
    log(`✅ REAL ACDC credential created: ${credentialId}`);
    
    // Verify in KERIA database
    const storedCredential = await keriaClient.credentials().get(credentialId);
    log(`✅ Verified in KERIA LMDB database`);

    res.json({
      success: true,
      data: {
        credentialId: credentialId,
        schema: TRAVEL_PREFERENCES_SCHEMA_SAID,
        holder: holderAid,
        issuer: ISSUER_NAME,
        attributes: attributes,
        storage: "KERIA LMDB",
        verification: {
          stored: true,
          said: storedCredential.sad.d,
          schema: storedCredential.sad.s
        },
        message: "✅ REAL ACDC credential created and stored in KERIA LMDB!"
      }
    });

  } catch (error: any) {
    log(`❌ Real credential creation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: `KERIA Error: ${error.message}`,
      details: "Check KERIA connection and schema availability"
    });
  }
});

// List real credentials from KERIA
app.get("/credentials/real", async (req: Request, res: Response) => {
  if (!keriaClient || !isKeriaReady) {
    return res.status(503).json({
      success: false,
      error: "KERIA not ready"
    });
  }

  try {
    const ISSUER_NAME = "issuer";
    const issuer = await keriaClient.identifiers().get(ISSUER_NAME);
    
    // List all credentials issued by this issuer
    const credentials = await keriaClient.credentials().list({
      filter: { "-i": issuer.prefix }
    });

    log(`📋 Found ${credentials.length} credentials in KERIA LMDB`);

    res.json({
      success: true,
      data: {
        total: credentials.length,
        credentials: credentials.map(cred => ({
          id: cred.sad.d,
          schema: cred.sad.s,
          holder: cred.sad.a.i,
          issued: cred.sad.a.dt || "unknown",
          storage: "KERIA LMDB"
        }))
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// KERIA initialization status
app.get("/keria/status", (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      connected: !!keriaClient,
      ready: isKeriaReady,
      url: config.keria.url,
      bootUrl: config.keria.bootUrl
    }
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  log(`❌ Server Error: ${err.message}`);
  res.status(500).json({
    success: false,
    error: err.message,
  });
});

// Start server with KERIA initialization
async function startRealServer() {
  const PORT = config.port;
  
  app.listen(PORT, async () => {
    log(`🚀 Real KERIA Credential Server starting on port ${PORT}`);
    log(`📋 Schema OOBI: ${config.oobiEndpoint}/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`);
    
    // Initialize KERIA connection
    log("🔄 Initializing KERIA connection...");
    keriaClient = await initializeKERIA();
    
    if (keriaClient) {
      log("✅ KERIA connected, setting up infrastructure...");
      const setupSuccess = await setupKERIInfrastructure(keriaClient);
      
      if (setupSuccess) {
        log("✅ Infrastructure ready, testing credential creation...");
        const testSuccess = await testCredentialCreation(keriaClient);
        
        if (testSuccess) {
          isKeriaReady = true;
          log("🎉 REAL KERIA CREDENTIAL SERVER READY!");
          log("🎫 Ready to create real ACDC credentials in KERIA LMDB!");
        } else {
          log("⚠️ Credential test failed, but server running in limited mode");
        }
      } else {
        log("⚠️ Infrastructure setup failed, running in fallback mode");
      }
    } else {
      log("❌ KERIA connection failed, running without real credentials");
    }
    
    log(`🌐 Server ready at: http://localhost:${PORT}`);
  });
}

void startRealServer();