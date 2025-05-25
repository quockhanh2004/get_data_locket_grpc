import { Request, Response } from "express";
import {
  checkKey,
  createRandomKey,
  deleteManyEmail,
  deleteOneKey,
  getAllEmail,
  activateKey,
  banEmail,
  unbanEmail,
  clientGenKey,
  getAllKeysByEmail,
} from "../services/client.service";

export async function checkValueKey(req: Request, res: Response) {
  const key = req.body?.key;
  const email = req.body?.email;
  if (!key) {
    return res.status(400).json({ error: "Key are required" });
  }
  const result = await checkKey(key, email);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(200).json(result);
}

export async function getAllEmails(req: Request, res: Response) {
  const result = await getAllEmail();
  return res.status(200).json(result);
}

export async function deleteEmail(req: Request, res: Response) {
  const email = req.params?.email;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  const result = await deleteManyEmail(email);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(200).json(result);
}

export async function deleteKey(req: Request, res: Response) {
  const key = req.params?.deleteKey;

  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }
  const result = await deleteOneKey(key);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(200).json(result);
}

export async function createKey(req: Request, res: Response) {
  const email = req.body?.email;
  if (!email) {
    return res.status(400).json({ error: "Key and email are required" });
  }
  const result = await createRandomKey(email);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(200).json(result);
}

export async function activateOneKey(req: Request, res: Response) {
  const key = req.body?.key;
  const email = req.body?.email;
  if (!key || !email) {
    return res.status(400).json({ error: "Key and email are required" });
  }
  const result = await activateKey(key, email);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(200).json(result);
}

export async function banned(req: Request, res: Response) {
  const email = req.body?.email || req.params?.email;
  const note = req.body?.note;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  return res.json(await banEmail(email, note));
}

export async function unbanded(req: Request, res: Response) {
  const email = req.body?.email || req.params?.email;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  return res.json(await unbanEmail(email));
}

export async function clientRequestGenKey(req: Request, res: Response) {
  const email = req.body?.email || req.params?.email;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  const result = await clientGenKey(email);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
}

export async function getKeysByEmail(req: Request, res: Response) {
  const email = req.params?.email;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  const keys = await getAllKeysByEmail(email);
  if ('error' in keys) {
    return res.status(400).json({ error: keys.error });
  }
  return res.status(200).json(keys);
}
