// FatSecret Proxy Server with Static IP
// Deploy this on a VPS (DigitalOcean, AWS EC2, etc.) with a static IP
// Then whitelist that IP in FatSecret

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const FATSECRET_TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const FATSECRET_API_URL = 'https://platform.fatsecret.com/rest/server.api';
const EXPIRY_BUFFER_SECONDS = 60;

// Token cache
let cachedToken = null;
let tokenExpiry = 0;
let ongoingTokenRequest = null;

/**
 * Get a valid FatSecret access token, refreshing if necessary
 */
async function getAccessToken() {
  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
  // Note: 'premier' scope should include barcode access
  // If barcode API calls fail with authorization errors, try updating to 'premier barcode'
  const scope = process.env.FATSECRET_SCOPE || 'premier';

  if (!clientId || !clientSecret) {
    throw new Error('FatSecret credentials not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Return cached token if still valid
  if (cachedToken && tokenExpiry - EXPIRY_BUFFER_SECONDS > now) {
    console.log('[Proxy] Using cached token');
    return cachedToken;
  }

  // Avoid multiple simultaneous token requests
  if (ongoingTokenRequest) {
    return ongoingTokenRequest;
  }

  // Fetch new token
  ongoingTokenRequest = fetchAccessToken(clientId, clientSecret, scope).finally(() => {
    ongoingTokenRequest = null;
  });

  return ongoingTokenRequest;
}

/**
 * Fetch a new access token from FatSecret
 */
async function fetchAccessToken(clientId, clientSecret, scope) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const bodyParams = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: scope,
  });

  console.log('[Proxy] Requesting new token');

  const response = await fetch(FATSECRET_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`FatSecret token request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('FatSecret token response missing access_token');
  }

  const now = Math.floor(Date.now() / 1000);
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 0);

  console.log('[Proxy] Token acquired successfully');
  return cachedToken;
}

/**
 * Proxy a search request to FatSecret API
 */
async function proxySearchRequest(token, searchQuery, limit, offset) {
  const pageNumber = Math.floor(offset / limit);
  const maxResults = Math.min(limit, 50); // FatSecret max is 50

  const bodyParams = new URLSearchParams({
    method: 'foods.search.v4',
    format: 'json',
    search_expression: searchQuery,
    max_results: maxResults.toString(),
    page_number: pageNumber.toString(),
    include_food_attributes: 'true',
    flag_default_serving: 'true',
  });

  console.log('[Proxy] Proxying search request:', {
    query: searchQuery,
    limit: maxResults,
    pageNumber,
  });

  const response = await fetch(FATSECRET_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${token}`,
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Proxy] API error', response.status, errorText);
    throw new Error(`FatSecret API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

/**
 * Lookup food by barcode using FatSecret barcode API V2
 * Barcode must be GTIN-13 format (13 digits)
 * V2 returns full food details in a single call
 */
async function proxyBarcodeLookup(token, barcode) {
  // Normalize barcode to GTIN-13 (13 digits, pad with zeros if needed)
  const normalizedBarcode = barcode.trim().padStart(13, '0');
  
  // Validate it's all digits and 13 characters
  if (!/^\d{13}$/.test(normalizedBarcode)) {
    throw new Error(`Invalid barcode format. Expected 13 digits, got: ${barcode}`);
  }

  // Use REST API endpoint for barcode lookup V2
  const barcodeUrl = `https://platform.fatsecret.com/rest/food/barcode/find-by-id/v2?barcode=${normalizedBarcode}&format=json&include_food_attributes=true&flag_default_serving=true`;

  console.log('[Proxy] Looking up barcode (V2):', normalizedBarcode);

  const response = await fetch(barcodeUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error('[Proxy] Barcode lookup API error', response.status, errorText);
    
    // If 404, product not found (legitimate)
    if (response.status === 404) {
      return { food: null, not_found: true };
    }
    
    throw new Error(`FatSecret barcode API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log('[Proxy] Barcode lookup response (V2):', JSON.stringify(data, null, 2));
  
  // V2 response format: { "food": {...} } or { "error": { "code": 211, "message": "..." } }
  // Check for error code 211 (No food item detected)
  if (data.error) {
    if (data.error.code === 211) {
      return { food: null, not_found: true, error_code: 211 };
    }
    throw new Error(`FatSecret barcode API error: ${data.error.code} - ${data.error.message}`);
  }
  
  // Extract food object
  const food = data.food || null;
  
  if (!food) {
    return { food: null, not_found: true };
  }
  
  return { food: food };
}

// Note: proxyGetFoodById is no longer needed for barcode lookup
// V2 barcode API returns full food details directly

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Search endpoint
app.post('/search', async (req, res) => {
  try {
    const { query, limit = 20, offset = 0 } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Missing or invalid query parameter' });
    }

    // Get access token
    const token = await getAccessToken();

    // Proxy the request
    const data = await proxySearchRequest(token, query.trim(), limit, offset);

    res.json(data);
  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// Barcode lookup endpoint (V2)
app.post('/barcode', async (req, res) => {
  try {
    const { barcode } = req.body;

    if (!barcode || typeof barcode !== 'string' || !barcode.trim()) {
      return res.status(400).json({ error: 'Missing or invalid barcode parameter' });
    }

    // Get access token
    const token = await getAccessToken();

    // Lookup food by barcode (V2 returns full food details)
    const barcodeResult = await proxyBarcodeLookup(token, barcode.trim());

    // If not found, return early
    if (barcodeResult.not_found || !barcodeResult.food) {
      return res.json({ 
        food: null, 
        not_found: true,
        error_code: barcodeResult.error_code || null,
        barcode: barcode.trim()
      });
    }

    // V2 returns full food object directly
    res.json({
      food: barcodeResult.food,
      not_found: false,
      barcode: barcode.trim()
    });
  } catch (error) {
    console.error('[Proxy] Barcode lookup error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FatSecret Proxy Server running on port ${PORT}`);
  console.log(`Your static IP should be whitelisted in FatSecret`);
});

