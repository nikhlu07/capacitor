import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import {
  Operation,
  randomPasscode,
  Salter,
  SignifyClient,
  State,
} from "signify-ts";
import { config } from "../config";
import { ISSUER_NAME, TRAVEL_PREFERENCES_SCHEMA_SAID } from "../consts";
import { BranFileContent } from "./utils.types";
import { EndRole } from "../server.types";

export const OP_TIMEOUT = 15000;
export const FAILED_TO_RESOLVE_OOBI =
  "Failed to resolve OOBI, operation not completing...";
export const REGISTRIES_NOT_FOUND = "No registries found for";

export function randomSalt(): string {
  return new Salter({}).qb64;
}

export async function loadBrans(): Promise<BranFileContent> {
  const bransFilePath = "./data/brans.json";
  const dirPath = path.dirname(bransFilePath);

  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }

  let bransFileContent = "";
  if (existsSync(bransFilePath)) {
    bransFileContent = await readFile(bransFilePath, "utf8");
    const data = JSON.parse(bransFileContent);
    if (data.bran && data.issuerBran) {
      return data;
    }
  }

  const bran = randomPasscode();
  const issuerBran = randomPasscode();
  const newContent = { bran, issuerBran };
  await writeFile(bransFilePath, JSON.stringify(newContent));
  return newContent;
}

export async function waitAndGetDoneOp(
  client: SignifyClient,
  op: Operation,
  timeout = 10000,
  interval = 250
): Promise<Operation> {
  const startTime = new Date().getTime();
  while (!op.done && new Date().getTime() < startTime + timeout) {
    op = await client.operations().get(op.name);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  if (!op.done) {
    throw new Error(`Operation not completing: ${JSON.stringify(op, null, 2)}`);
  }
  return op;
}

export async function resolveOobi(
  client: SignifyClient,
  url: string
): Promise<Operation> {
  const urlObj = new URL(url);
  const alias = urlObj.searchParams.get("name") ?? randomSalt();
  urlObj.searchParams.delete("name");
  const strippedUrl = urlObj.toString();

  const operation = (await waitAndGetDoneOp(
    client,
    await client.oobis().resolve(strippedUrl),
    OP_TIMEOUT
  )) as Operation & { response: State };
  if (!operation.done) {
    throw new Error(FAILED_TO_RESOLVE_OOBI);
  }
  if (operation.response && operation.response.i) {
    const connectionId = operation.response.i;
    const createdAt = new Date((operation.response as State).dt);
    await client.contacts().update(connectionId, {
      alias,
      createdAt,
      oobi: url,
    });
  }
  return operation;
}

export async function getRegistry(
  client: SignifyClient,
  name: string
): Promise<string> {
  const registries = await client.registries().list(name);
  if (!registries || registries.length === 0) {
    throw new Error(`${REGISTRIES_NOT_FOUND} ${name}`);
  }
  return registries[0].regk;
}

export async function getOobi(
  client: SignifyClient,
  signifyName: string
): Promise<string> {
  const result = await client.oobis().get(signifyName, EndRole.AGENT);
  return result.oobis[0];
}

export async function getEndRoles(
  client: SignifyClient,
  alias: string
): Promise<any> {
  const path = `/identifiers/${alias}/endroles`;
  const response: Response = await client.fetch(path, "GET", null);
  if (!response.ok) throw new Error(await response.text());
  const result = await response.json();
  return result;
}