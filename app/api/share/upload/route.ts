import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

import { r2, R2_BUCKET } from "@/lib/r2";
import { createShareToken } from "@/lib/share-token";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      filename,
      contentType,
      size,
    }: {
      filename?: string;
      contentType?: string;
      size?: number;
    } = body;

    if (!filename || !contentType || typeof size !== "number") {
      return NextResponse.json(
        { error: "Missing file information" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        {
          error: "Only JPG, PNG, WEBP and GIF images are supported.",
        },
        { status: 400 },
      );
    }

    if (size <= 0 || size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File must be between 1 byte and 25 MB.",
        },
        { status: 400 },
      );
    }

    const id = crypto.randomBytes(16).toString("hex");

    const extension = filename.includes(".")
      ? filename.substring(filename.lastIndexOf(".")).toLowerCase()
      : "";

    const key = `temporary/${id}${extension}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2, command, {
      expiresIn: 600,
      signableHeaders: new Set(["content-type"]),
    });

    // Share link expires after 1 hour.
    const expiresAt = Date.now() + 60 * 60 * 1000;

    const token = createShareToken({
      key,
      name: filename,
      type: contentType,
      exp: expiresAt,
    });

    const origin = new URL(request.url).origin;

    const shareUrl = `${origin}/s/${encodeURIComponent(token)}`;

    return NextResponse.json({
      uploadUrl,
      key,
      contentType,
      shareUrl,
      expiresAt,
    });
  } catch (error) {
    console.error("Failed to create upload URL:", error);

    return NextResponse.json(
      {
        error: "Unable to prepare upload.",
      },
      { status: 500 },
    );
  }
}
