/**
 * Supabase Edge Function that proxies FatSecret API calls through an Oracle Cloud proxy server.
 * This architecture keeps API credentials secure on the Oracle Cloud server while allowing
 * the client to make authenticated requests through Supabase.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Proxies a search request to the Oracle Cloud proxy server.
 * The Oracle proxy handles FatSecret authentication and API calls.
 */
async function proxySearchRequest(
  searchQuery: string,
  limit: number,
  offset: number
): Promise<Response> {
  const ORACLE_PROXY_URL = Deno.env.get("ORACLE_PROXY_URL");
  
  if (!ORACLE_PROXY_URL) {
    throw new Error("ORACLE_PROXY_URL not configured. Set it as a Supabase secret.");
  }

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

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Proxies a barcode lookup request to the Oracle Cloud proxy server.
 * The Oracle proxy handles FatSecret authentication and barcode API calls.
 */
async function proxyBarcodeRequest(barcode: string): Promise<Response> {
  const ORACLE_PROXY_URL = Deno.env.get("ORACLE_PROXY_URL");
  
  if (!ORACLE_PROXY_URL) {
    throw new Error("ORACLE_PROXY_URL not configured. Set it as a Supabase secret.");
  }

  const response = await fetch(`${ORACLE_PROXY_URL}/barcode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      barcode: barcode,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error("[FatSecretProxy] Oracle proxy barcode error", response.status, errorText);
    return new Response(
      JSON.stringify({
        error: `Oracle proxy error: ${response.status} ${errorText}`,
        not_found: false,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
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

    const body = await req.json();
    
    if (body.barcode && typeof body.barcode === "string") {
      const response = await proxyBarcodeRequest(body.barcode.trim());
      const responseData = await response.json();
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    
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

    const response = await proxySearchRequest(query.trim(), limit, offset);
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

