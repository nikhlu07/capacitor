export const config = {
  port: process.env.PORT || 3001,
  keria: {
    url: process.env.KERIA_ENDPOINT || "http://localhost:3905",
    bootUrl: process.env.KERIA_BOOT_ENDPOINT || "http://localhost:3906",
  },
  oobiEndpoint: process.env.OOBI_ENDPOINT || "http://host.docker.internal:3005",
  path: {
    ping: "/ping",
    keriOobi: "/oobi/:aid",
    issueAcdcCredential: "/credentials/issue",
    resolveOobi: "/oobi/resolve",
    contacts: "/contacts",
    contactCredentials: "/contacts/:contactId/credentials",
    schemas: "/schemas",
    requestDisclosure: "/credentials/request",
    revokeCredential: "/credentials/revoke",
    deleteContact: "/contacts/:contactId",
  },
};