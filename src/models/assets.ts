import prisma from "../utils/prisma-client.js";
import { AssetType } from "@prisma/client";
import logger from "../utils/logger.js";

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
    logger.info("Asset created successfully", "DATABASE", {
      assetId: asset.id,
      projectId: data.projectId,
      filename: data.filename,
      type: data.type,
    });
    return asset;
  } catch (error) {
    logger.error("Error creating asset", "DATABASE", error, {
      projectId: data.projectId,
      filename: data.filename,
    });
    throw error;
  }
}

export async function getAsset(assetId: string) {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      logger.warn("Asset not found", "DATABASE", { assetId });
    } else {
      logger.debug("Asset retrieved successfully", "DATABASE", {
        assetId,
        projectId: asset.projectId,
      });
    }
    return asset;
  } catch (error) {
    logger.error("Error retrieving asset", "DATABASE", error, { assetId });
    throw error;
  }
}
