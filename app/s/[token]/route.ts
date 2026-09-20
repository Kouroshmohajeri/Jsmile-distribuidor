import { NextResponse } from "next/server";

import { GetObjectCommand } from "@aws-sdk/client-s3";

import { r2, R2_BUCKET } from "@/lib/r2";

import { verifyShareToken } from "@/lib/share-token";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const payload = verifyShareToken(token);

    if (!payload) {
      return new NextResponse("Este enlace no es válido o ha caducado.", {
        status: 404,
      });
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: payload.key,
    });

    const object = await r2.send(command);

    if (!object.Body) {
      return new NextResponse("No se ha encontrado el archivo.", {
        status: 404,
      });
    }

    const body = await object.Body.transformToByteArray();

    // Make sure the filename has a valid extension.
    let filename = payload.name;

    if (!filename.includes(".")) {
      const extensionMap: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
      };

      filename += extensionMap[payload.type] ?? "";
    }

    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": payload.type,
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Share download failed:", error);

    return new NextResponse("No se ha podido descargar el archivo.", {
      status: 404,
    });
  }
}
