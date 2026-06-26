// Helper function to get the outbound IP address of Supabase Edge Functions
// Deploy this temporarily to find the IP address to whitelist in FatSecret

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // This helper function is a temporary utility to find the outbound IP address
  // Note: Supabase Edge Functions require the Authorization header by default

  try {
    // Make a request to a service that returns the caller's IP
    const ipServices = [
      "https://api.ipify.org?format=json",
      "https://ipapi.co/json/",
      "https://httpbin.org/ip",
    ];

    const results: Record<string, any> = {};

    // Try each service
    for (const service of ipServices) {
      try {
        const response = await fetch(service);
        const data = await response.json();
        results[service] = data;
      } catch (error) {
        results[service] = { error: error.message };
      }
    }

    // Extract IP addresses
    const ips: string[] = [];
    if (results[ipServices[0]]?.ip) {
      ips.push(results[ipServices[0]].ip);
    }
    if (results[ipServices[1]]?.ip) {
      ips.push(results[ipServices[1]].ip);
    }
    if (results[ipServices[2]]?.origin) {
      ips.push(results[ipServices[2]].origin);
    }

    // Get unique IPs
    const uniqueIPs = [...new Set(ips)];

    return new Response(
      JSON.stringify(
        {
          message: "This is the IP address to whitelist in FatSecret",
          ip: uniqueIPs[0] || "Could not determine",
          allIPs: uniqueIPs,
          format: uniqueIPs[0] ? `${uniqueIPs[0]}/32` : "N/A",
          instructions: [
            "1. Copy the IP address above",
            "2. Go to FatSecret Developer Portal → API Keys → IP Restrictions",
            "3. Add the IP in format: IP/32 (e.g., " +
              (uniqueIPs[0] ? `${uniqueIPs[0]}/32` : "IP/32") +
              ")",
            "4. Save and wait 5-10 minutes for changes to take effect",
            "5. Delete this function: supabase functions delete get-ip",
          ],
          rawResults: results,
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
        message: "Failed to get IP address",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
