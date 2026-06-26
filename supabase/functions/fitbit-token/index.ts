/**
 * Supabase Edge Function that performs Fitbit OAuth 2.0 token operations server-side.
 * Keeping the Fitbit client secret here (as a Supabase secret) prevents it from being
 * bundled into the mobile client. The app sends the authorization `code` (or a
 * `refresh_token`) and this function exchanges it with Fitbit using Basic auth.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

/**
 * Exchanges a Fitbit OAuth request (authorization_code or refresh_token grant)
 * for tokens and returns Fitbit's raw token response.
 */
async function requestTokens(params: URLSearchParams): Promise<Response> {
  const clientId = Deno.env.get("FITBIT_CLIENT_ID");
  const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return jsonResponse(
      { error: "Fitbit credentials not configured. Set FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET as Supabase secrets." },
      500
    );
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: params.toString(),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error("[FitbitToken] Fitbit token error", response.status, text);
    return jsonResponse(
      { error: `Fitbit token request failed: ${response.status} ${text}` },
      response.status
    );
  }

  // Fitbit returns JSON; pass it through unchanged so the client keeps its existing shape.
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return jsonResponse({ error: "Fitbit token response was not valid JSON" }, 502);
  }

  return jsonResponse(data, 200);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  // Require an authenticated caller (Supabase verifies the JWT before invocation,
  // but reject early if the header is missing to mirror the fatsecret-proxy contract).
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized. Authentication required." }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "";

  if (action === "exchange") {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const redirectUri = typeof body.redirect_uri === "string" ? body.redirect_uri.trim() : "";

    if (!code || !redirectUri) {
      return jsonResponse({ error: "Missing 'code' or 'redirect_uri' for exchange" }, 400);
    }

    return await requestTokens(
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      })
    );
  }

  if (action === "refresh") {
    const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token.trim() : "";

    if (!refreshToken) {
      return jsonResponse({ error: "Missing 'refresh_token' for refresh" }, 400);
    }

    return await requestTokens(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      })
    );
  }

  return jsonResponse({ error: "Invalid 'action'. Use 'exchange' or 'refresh'." }, 400);
});
