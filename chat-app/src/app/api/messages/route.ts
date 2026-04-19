import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_PATH = "/api/v1/messages";
const JSON_CONTENT_TYPE = "application/json";
const MISSING_TOKEN_ERROR = "Server is missing required auth token. Set AUTH_TOKEN.";
const UPSTREAM_UNREACHABLE_ERROR = "Unable to reach upstream messages service.";

function getApiBaseUrl(): string {
  return (
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://localhost:3000"
  );
}

function getAuthToken(): string | null {
  return process.env.AUTH_TOKEN?.trim() || null;
}

function buildUpstreamUrl(request: NextRequest, apiBaseUrl: string): string {
  const upstreamUrl = new URL(UPSTREAM_PATH, apiBaseUrl);
  upstreamUrl.search = request.nextUrl.search;
  return upstreamUrl.toString();
}

function buildProxyRequestInit(
  request: NextRequest,
  authToken: string,
  body: string | undefined
): RequestInit {
  return {
    method: request.method,
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": JSON_CONTENT_TYPE,
    },
    body,
  };
}

async function toProxyResponse(upstreamResponse: Response): Promise<NextResponse> {
  const responseText = await upstreamResponse.text();
  const contentType = upstreamResponse.headers.get("content-type") ?? JSON_CONTENT_TYPE;

  return new NextResponse(responseText, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": contentType,
    },
  });
}

async function proxyMessages(request: NextRequest): Promise<NextResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const authToken = getAuthToken();

  if (!authToken) {
    return NextResponse.json({ error: MISSING_TOKEN_ERROR }, { status: 500 });
  }

  const upstreamUrl = buildUpstreamUrl(request, apiBaseUrl);
  const body = request.method === "POST" ? await request.text() : undefined;

  try {
    const upstreamResponse = await fetch(upstreamUrl, buildProxyRequestInit(request, authToken, body));
    return toProxyResponse(upstreamResponse);
  } catch {
    return NextResponse.json({ error: UPSTREAM_UNREACHABLE_ERROR }, { status: 502 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return proxyMessages(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return proxyMessages(request);
}
