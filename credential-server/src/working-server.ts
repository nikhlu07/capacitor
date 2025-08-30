import bodyParser from "body-parser";
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";
import { join } from "path";
import { SignifyClient } from "signify-ts";
import { config } from "./config";
import { TRAVEL_PREFERENCES_SCHEMA_SAID } from "./consts";
import { log } from "./log";
import { createWorkingKERIAClient, setupWorkingInfrastructure, testWorkingCredentialCreation } from "./working-keria-setup";

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
    message: "Travlr-ID Server (YOUR Working KERIA Pattern)",
    timestamp: new Date().toISOString(),
    keria: {
      adminUrl: "http://localhost:3904",
      agentUrl: "http://localhost:3905", 
      bootUrl: "http://localhost:3906",
      connected: !!keriaClient,
      ready: isKeriaReady,
      pattern: "Your Frontend's Working Pattern"
    },
    schemas: [TRAVEL_PREFERENCES_SCHEMA_SAID]
  });
});

// Issue REAL credential using YOUR working KERIA
app.post("/credentials/issue-real", async (req: Request, res: Response) => {
  if (!keriaClient || !isKeriaReady) {
    return res.status(503).json({
      success: false,
      error: "KERIA not ready. Connection using your frontend's pattern failed.",
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

    log(`🎫 Issuing REAL ACDC credential using YOUR KERIA for: ${holderAid}`);

    const ISSUER_NAME = "travlr-issuer";
    
    // Get registry from YOUR KERIA
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

    // Issue credential using YOUR working KERIA
    log(`🔥 Calling YOUR KERIA's credentials().issue()...`);
    const result = await keriaClient.credentials().issue(ISSUER_NAME, {
      ri: registryKey,
      s: TRAVEL_PREFERENCES_SCHEMA_SAID,
      a: attributes,
    });

    // Wait for completion
    let operation = await keriaClient.operations().get(result.op.name);
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 250));
      operation = await keriaClient.operations().get(result.op.name);
    }

    const credentialId = result.acdc.ked.d;
    log(`✅ REAL ACDC credential created in YOUR KERIA: ${credentialId}`);
    
    // Verify in YOUR KERIA's LMDB database
    const storedCredential = await keriaClient.credentials().get(credentialId);
    log(`✅ Verified in YOUR KERIA's LMDB database`);

    res.json({
      success: true,
      data: {
        credentialId: credentialId,
        schema: TRAVEL_PREFERENCES_SCHEMA_SAID,
        holder: holderAid,
        issuer: ISSUER_NAME,
        attributes: attributes,
        storage: "YOUR KERIA LMDB Database",
        keria: {
          admin: "localhost:3904",
          agent: "localhost:3905", 
          boot: "localhost:3906"
        },
        verification: {
          stored: true,
          said: storedCredential.sad.d,
          schema: storedCredential.sad.s,
          registryKey: registryKey
        },
        message: "🎉 REAL ACDC CREDENTIAL CREATED IN YOUR KERIA LMDB!"
      }
    });

  } catch (error: any) {
    log(`❌ Credential creation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: `YOUR KERIA Error: ${error.message}`,
      pattern: "Your Frontend's Working Pattern",
      hint: "Check that your KERIA containers are running"
    });
  }
});

// List real credentials from YOUR KERIA LMDB
app.get("/credentials/real", async (req: Request, res: Response) => {
  if (!keriaClient) {
    return res.status(503).json({
      success: false,
      error: "KERIA not connected"
    });
  }

  try {
    const ISSUER_NAME = "travlr-issuer";
    const issuer = await keriaClient.identifiers().get(ISSUER_NAME);
    
    const credentials = await keriaClient.credentials().list({
      filter: { "-i": issuer.prefix }
    });

    log(`📋 Found ${credentials.length} real credentials in YOUR KERIA LMDB`);

    res.json({
      success: true,
      data: {
        total: credentials.length,
        issuer: issuer.prefix,
        storage: "YOUR KERIA LMDB Database",
        keria: "YOUR Working Setup (ports 3904-3906)",
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

// Start server using YOUR working KERIA pattern
async function startWorkingServer() {
  const PORT = config.port;
  
  app.listen(PORT, async () => {
    log(`🚀 Travlr-ID Server (YOUR Working Pattern) starting on port ${PORT}`);
    log(`📋 Schema OOBI: ${config.oobiEndpoint}/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`);
    
    // Initialize using YOUR frontend's proven working pattern
    log("🔄 Connecting to YOUR KERIA using your frontend's working pattern...");
    keriaClient = await createWorkingKERIAClient();
    
    if (keriaClient) {
      log("✅ Connected to YOUR KERIA successfully, setting up infrastructure...");
      const setupSuccess = await setupWorkingInfrastructure(keriaClient);
      
      if (setupSuccess) {
        log("✅ Infrastructure ready, testing credential creation...");
        const testSuccess = await testWorkingCredentialCreation(keriaClient);
        
        if (testSuccess) {
          isKeriaReady = true;
          log("🎉 YOUR KERIA WORKING! REAL ACDC CREDENTIALS READY!");
          log("🎫 Test at: POST /credentials/issue-real");
          log("📋 Using YOUR KERIA: Admin:3904, Agent:3905, Boot:3906");
        } else {
          log("⚠️ Test failed, but infrastructure ready");
        }
      } else {
        log("❌ Infrastructure setup failed");
      }
    } else {
      log("❌ Failed to connect to YOUR KERIA");
      log("💡 Check that your docker-compose.travlr-keria.yaml containers are running");
    }
    
    log(`🌐 Server ready at: http://localhost:${PORT}`);
  });
}

void startWorkingServer();