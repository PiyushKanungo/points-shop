import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { getBackend } from "@/lib/backend";
import { getEnv } from "@/lib/env";
import { errorResponse, ShopError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/origin";
import { resumeFolder } from "@/lib/resume-url";

/**
 * Vercel Blob client uploads. The browser asks for an upload token (checked here: session, order
 * ownership, Awaiting Details, Resume order, PDF up to 5 MB, the order's folder). Vercel then
 * calls back when the upload completes (signed by Blob; no Origin check, not called on localhost).
 */
export async function POST(request: Request) {
  try {
    const env = getEnv();
    if (!env.BLOB_READ_WRITE_TOKEN) {
      throw new ShopError("UNAVAILABLE", "Resume upload isn't configured here.");
    }
    const body = (await request.json()) as HandleUploadBody;
    if (body.type === "blob.generate-client-token") assertSameOrigin(request);

    const result = await handleUpload({
      token: env.BLOB_READ_WRITE_TOKEN,
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await requireSession();
        const { orderId } = JSON.parse(clientPayload ?? "{}") as { orderId?: string };
        if (!orderId) throw new ShopError("VALIDATION", "Missing order.");
        const order = await getBackend().getOrder(session.walletId, orderId);
        if (order.offering.fulfilmentType !== "Resume" || order.status !== "Awaiting Details") {
          throw new ShopError("INVALID_STATE", "This order isn't waiting for a resume.");
        }
        if (!pathname.startsWith(resumeFolder(orderId))) {
          throw new ShopError("VALIDATION", "Wrong upload location.");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 5 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.info(`[resume-upload] stored ${blob.pathname}`);
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
