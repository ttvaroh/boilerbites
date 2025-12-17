// Supabase Edge Function to proxy FatSecret API calls via Oracle Cloud proxy
// This keeps API credentials secure on the Oracle Cloud server

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Proxy a search request to Oracle Cloud proxy server
 * The Oracle proxy handles FatSecret authentication and API calls
 */
async function proxySearchRequest(
  searchQuery: string,
  limit: number,
  offset: number
): Promise<Response> {
  // Get Oracle proxy URL from environment variable (set as Supabase secret)
  const ORACLE_PROXY_URL = Deno.env.get("ORACLE_PROXY_URL");
  
  if (!ORACLE_PROXY_URL) {
    throw new Error("ORACLE_PROXY_URL not configured. Set it as a Supabase secret.");
  }

  console.log("[FatSecretProxy] Calling Oracle proxy:", {
    url: ORACLE_PROXY_URL,
    query: searchQuery,
    limit,
    offset,
  });

  const response = await fetch(`${ORACLE_PROXY_URL}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: searchQuery,
      limit: limit,
      offset: offset,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error("[FatSecretProxy] Oracle proxy error", response.status, errorText);
    return new Response(
      JSON.stringify({
        error: `Oracle proxy error: ${response.status} ${errorText}`,
      }),
      {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Oracle proxy returns the FatSecret API response directly
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Verify user is authenticated (optional but recommended)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Authentication required." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { query, limit = 20, offset = 0 } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'query' parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Proxy the request to Oracle Cloud proxy (which handles FatSecret authentication)
    const response = await proxySearchRequest(query.trim(), limit, offset);

    // Add CORS headers
    const responseData = await response.json();
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[FatSecretProxy] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

