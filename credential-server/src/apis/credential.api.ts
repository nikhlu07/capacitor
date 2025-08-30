import { NextFunction, Request, Response } from "express";
import { Serder, SignifyClient } from "signify-ts";
import { ACDC_SCHEMAS_ID, ISSUER_NAME, TRAVEL_PREFERENCES_SCHEMA_SAID } from "../consts";
import { getRegistry, OP_TIMEOUT, waitAndGetDoneOp } from "../utils/utils";

export const UNKNOW_SCHEMA_ID = "Unknown Schema ID: ";
export const CREDENTIAL_NOT_FOUND = "Not found credential with ID: ";
export const CREDENTIAL_REVOKED_ALREADY = "The credential has been revoked already";

export async function issueAcdcCredential(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const client: SignifyClient = req.app.get("signifyClient");
  const { schemaSaid, aid, attribute } = req.body;

  if (!ACDC_SCHEMAS_ID.some((schemaId) => schemaId === schemaSaid)) {
    res.status(409).send({
      success: false,
      error: `${UNKNOW_SCHEMA_ID}${schemaSaid}`,
    });
    return;
  }

  const keriRegistryRegk = await getRegistry(client, ISSUER_NAME);
  const holderAid = await client.identifiers().get(ISSUER_NAME);

  const issueParams = {
    ri: keriRegistryRegk,
    s: schemaSaid,
    a: {
      i: aid,
      ...attribute,
    },
  };

  const grantParams = {
    senderName: ISSUER_NAME,
    recipient: aid,
  };

  try {
    const result = await client.credentials().issue(ISSUER_NAME, issueParams);
    await waitAndGetDoneOp(client, result.op, OP_TIMEOUT);

    const credential = await client.credentials().get(result.acdc.ked.d);
    const datetime = new Date().toISOString().replace("Z", "000+00:00");
    const [grant, gsigs, gend] = await client.ipex().grant({
      ...grantParams,
      acdc: new Serder(credential.sad),
      anc: new Serder(credential.anc),
      iss: new Serder(credential.iss),
      ancAttachment: credential.ancatc?.[0],
      datetime,
    });

    await client
      .ipex()
      .submitGrant(grantParams.senderName, grant, gsigs, gend, [aid]);

    res.status(200).send({
      success: true,
      data: {
        credentialId: result.acdc.ked.d,
        message: "Travel preferences credential issued successfully"
      },
    });
  } catch (error) {
    console.error("Error issuing credential:", error);
    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
}

export async function listCredentials(
  req: Request,
  res: Response
): Promise<void> {
  const client: SignifyClient = req.app.get("signifyClient");
  
  try {
    const issuer = await client.identifiers().get(ISSUER_NAME);
    const credentials = await client.credentials().list({
      filter: {
        "-i": issuer.prefix,
      },
    });

    res.status(200).send({
      success: true,
      data: credentials,
    });
  } catch (error) {
    console.error("Error listing credentials:", error);
    res.status(500).send({
      success: false,
      error: error.message,
    });
  }
}