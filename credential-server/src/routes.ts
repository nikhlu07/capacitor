import express, { Router } from "express";
import { issueAcdcCredential, listCredentials } from "./apis/credential.api";
import { ping } from "./apis/ping.api";
import { schemaApi } from "./apis/schema.api";
import { config } from "./config";

export const router: Router = express.Router();

router.get(config.path.ping, ping);
router.post(config.path.issueAcdcCredential, issueAcdcCredential);
router.get(config.path.schemas, schemaApi);
router.get("/credentials", listCredentials);