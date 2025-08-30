import { Request, Response } from "express";
import { ACDC_SCHEMAS } from "../consts";

export async function schemaApi(req: Request, res: Response): Promise<void> {
  res.status(200).send({
    success: true,
    data: ACDC_SCHEMAS,
  });
}