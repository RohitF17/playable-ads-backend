import prisma from "../utils/prisma-client.js";
import { AssetType } from "@prisma/client";

interface createAssetData {
  projectId: string;
  filename: string;
  mime: string;
  size: number;
  type: AssetType;
  s3Path: string;
}
export async function createAsset(data: createAssetData) {
  try {
    const asset = await prisma.asset.create({
      data: {
        projectId: data.projectId,
        filename: data.filename,
        mime: data.mime,
        size: data.size,
        type: data.type,
        s3Path: data.s3Path,
      },
    });
    return asset;
  } catch (error) {
    console.error("error", error);
    throw error;
  }
}

export async function getAsset(assetId: string) {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    return asset;
  } catch (error) {
    console.error("error");
    throw error;
  }
}
