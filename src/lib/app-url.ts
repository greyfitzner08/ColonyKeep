import type { NextRequest } from "next/server";
import { headers } from "next/headers";

export function getRequestAppUrl(request?: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (
    configured &&
    !configured.includes("localhost") &&
    !configured.includes("127.0.0.1")
  ) {
    return configured;
  }

  if (request) {
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      request.headers.get("host")?.trim();
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";

    if (host && !host.includes("localhost")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return configured || "http://localhost:3000";
}

export async function getServerAppUrl(): Promise<string> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    headersList.get("host")?.trim();
  const proto = headersList.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";

  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return getRequestAppUrl();
}
