import bodyParser from "body-parser";
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import { join } from "path";
import { SignifyClient } from "signify-ts";
import { config } from "./config";
import { TRAVEL_PREFERENCES_SCHEMA_SAID } from "./consts";
import { log } from "./log";
import { createVeridianKERIAClient, setupVeridianInfrastructure, testVeridianCredentialCreation } from "./veridian-keria-setup";

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

// Health check
app.get("/ping", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Travlr-ID Credential Server (Veridian Pattern)",
    timestamp: new Date().toISOString(),
    keria: {
      url: config.keria.url,
      connected: !!keriaClient,
      ready: isKeriaReady,
      pattern: "Veridian Exact Copy"
    },
    schemas: [TRAVEL_PREFERENCES_SCHEMA_SAID]
  });
});

// Issue REAL credential using Veridian's exact pattern
app.post("/credentials/issue-real", async (req: Request, res: Response) => {
  if (!keriaClient || !isKeriaReady) {
    return res.status(503).json({
      success: false,
      error: "KERIA not ready. Please check connection.",
      hint: "Try starting with Veridian's KERIA image"
    });
  }

  try {
    const { holderAid, travelPreferences } = req.body;
    
    if (!holderAid || !travelPreferences) {
      return res.status(400).json({
        success: false,
        error: "holderAid and travelPreferences are required"
      });
    }

    log(`🎫 Issuing REAL ACDC credential for: ${holderAid}`);

    const ISSUER_NAME = "issuer";
    
    // Get registry (Veridian pattern)
    const registries = await keriaClient.registries().list(ISSUER_NAME);
    const registryKey = registries[0].regk;

    // Prepare ACDC attributes
    const attributes = {
      i: holderAid,
      employeeId: travelPreferences.employeeId,
      seatPreference: travelPreferences.seatPreference,
      mealPreference: travelPreferences.mealPreference,
      airlines: travelPreferences.airlines || "",
      emergencyContact: travelPreferences.emergencyContact || "",
      allergies: travelPreferences.allergies || ""
    };

    // Issue credential (Veridian's exact API call)
    log(`🔥 Calling client.credentials().issue() [Veridian Pattern]`);
    const result = await keriaClient.credentials().issue(ISSUER_NAME, {
      ri: registryKey,
      s: TRAVEL_PREFERENCES_SCHEMA_SAID,
      a: attributes,
    });

    // Wait for completion (Veridian pattern)
    let operation = await keriaClient.operations().get(result.op.name);
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 250));
      operation = await keriaClient.operations().get(result.op.name);
    }

    const credentialId = result.acdc.ked.d;
    log(`✅ REAL ACDC credential created: ${credentialId}`);
    
    // Verify in KERIA LMDB
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
        storage: "KERIA LMDB (Veridian Pattern)",
        verification: {
          stored: true,
          said: storedCredential.sad.d,
          schema: storedCredential.sad.s,
          registryKey: registryKey
        },
        message: "🎉 REAL ACDC CREDENTIAL CREATED IN KERIA LMDB!"
      }
    });

  } catch (error: any) {
    log(`❌ Credential creation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: `KERIA Error: ${error.message}`,
      pattern: "Veridian",
      hint: "Check that KERIA is running with Veridian's image and config"
    });
  }
});

// List real credentials from KERIA LMDB
app.get("/credentials/real", async (req: Request, res: Response) => {
  if (!keriaClient) {
    return res.status(503).json({
      success: false,
      error: "KERIA not connected"
    });
  }

  try {
    const ISSUER_NAME = "issuer";
    const issuer = await keriaClient.identifiers().get(ISSUER_NAME);
    
    const credentials = await keriaClient.credentials().list({
      filter: { "-i": issuer.prefix }
    });

    log(`📋 Found ${credentials.length} real credentials in KERIA LMDB`);

    res.json({
      success: true,
      data: {
        total: credentials.length,
        issuer: issuer.prefix,
        storage: "KERIA LMDB",
        credentials: credentials.map(cred => ({
          id: cred.sad.d,
          schema: cred.sad.s,
          holder: cred.sad.a.i,
          employeeId: cred.sad.a.employeeId,
          preferences: {
            seat: cred.sad.a.seatPreference,
            meal: cred.sad.a.mealPreference,
            airlines: cred.sad.a.airlines
          }
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

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  log(`❌ Server Error: ${err.message}`);
  res.status(500).json({
    success: false,
    error: err.message,
  });
});

// Start server with Veridian's KERIA pattern
async function startVeridianServer() {
  const PORT = config.port;
  
  app.listen(PORT, async () => {
    log(`🚀 Travlr-ID Server (Veridian Pattern) starting on port ${PORT}`);
    log(`📋 Schema OOBI: ${config.oobiEndpoint}/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`);
    
    // Initialize using Veridian's exact pattern
    log("🔄 Initializing KERIA with Veridian's configuration...");
    keriaClient = await createVeridianKERIAClient();
    
    if (keriaClient) {
      log("✅ KERIA connected (Veridian style), setting up infrastructure...");
      const setupSuccess = await setupVeridianInfrastructure(keriaClient);
      
      if (setupSuccess) {
        log("✅ Infrastructure ready, testing credential creation...");
        const testSuccess = await testVeridianCredentialCreation(keriaClient);
        
        if (testSuccess) {
          isKeriaReady = true;
          log("🎉 VERIDIAN PATTERN WORKING! REAL ACDC CREDENTIALS READY!");
          log("🎫 Test at: POST /credentials/issue-real");
        } else {
          log("⚠️ Test failed, but infrastructure is ready");
        }
      } else {
        log("❌ Infrastructure setup failed");
      }
    } else {
      log("❌ KERIA connection failed");
      log("💡 Hint: Use Veridian's KERIA image with docker-compose-veridian.yml");
    }
    
    log(`🌐 Server ready at: http://localhost:${PORT}`);
  });
}

void startVeridianServer();