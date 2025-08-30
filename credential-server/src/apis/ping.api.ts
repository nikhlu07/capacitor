import { Request, Response } from "express";

export async function ping(req: Request, res: Response): Promise<void> {
  res.status(200).send({
    success: true,
    message: "Travlr-ID Credential Server is running",
    timestamp: new Date().toISOString(),
  });
}