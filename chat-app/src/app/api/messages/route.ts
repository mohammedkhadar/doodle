import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_PATH = "/api/v1/messages";

function getApiBaseUrl(): string {
  return (
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://localhost:3000"
  );
}

function getAuthToken(): string | null {
  return process.env.AUTH_TOKEN?.trim() || process.env.NEXT_PUBLIC_AUTH_TOKEN?.trim() || null;
}

function buildUpstreamUrl(request: NextRequest, apiBaseUrl: string): string {
  const upstreamUrl = new URL(UPSTREAM_PATH, apiBaseUrl);
  upstreamUrl.search = request.nextUrl.search;
  return upstreamUrl.toString();
}

async function proxyMessages(request: NextRequest): Promise<NextResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const authToken = getAuthToken();

  if (!authToken) {
    return NextResponse.json(
      {
        error:
          "Server is missing required auth token. Set AUTH_TOKEN (preferred).",
      },
      { status: 500 }
    );
  }

  const upstreamUrl = buildUpstreamUrl(request, apiBaseUrl);
  const body = request.method === "POST" ? await request.text() : undefined;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body,
    });

    const responseText = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get("content-type") ?? "application/json";

    return new NextResponse(responseText, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach upstream messages service." },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return proxyMessages(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return proxyMessages(request);
}
