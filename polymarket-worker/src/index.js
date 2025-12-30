import { ethers } from 'ethers';
import { ClobClient, Side } from '@polymarket/clob-client';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Hardcoded PRIVATE_KEY for testing
    const PRIVATE_KEY = env.PRIVATE_KEY || "9215e35345e09ec24b7dfac4c6a4124075caa4eed647225ef51648effa45f4ec";
    const RPC_URL = env.RPC_URL || 'https://polygon-rpc.com';
    const CHAIN_ID = 137;

    // Initialize EOA Wallet
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    try {
      // 1. /onboard - Generate API Keys
      if (path === "/onboard") {
        const client = new ClobClient('https://clob.polymarket.com', CHAIN_ID, wallet);
        console.log(`[Onboard] Connecting EOA: ${wallet.address}`);
        const creds = await client.deriveApiKey();
        console.log('API Key:', creds.apiKey);
        console.log('API Key:', creds.key);
        
        const userData = {
            wallet_address: wallet.address,
            pm_api_key: creds.key || creds.apiKey, // SDK v5+ usually returns 'key'
            pm_api_secret: creds.secret,
            pm_passphrase: creds.passphrase,
            created_at: new Date().toISOString(),
            note: "Data generated on Cloudflare Worker"
        };
        return jsonResponse(userData);
      }

      // 2. /markets - Find active markets (Simplified find_market.js)
      if (path === "/markets") {
        // Read-only client is enough for fetching markets
        const client = new ClobClient('https://clob.polymarket.com', CHAIN_ID);
        console.log("[Markets] Fetching active markets...");
        
        const limit = parseInt(url.searchParams.get("limit") || "5");
        const marketsResponse = await client.getMarkets({ limit });
        
        // ClobClient.getMarkets usually returns { data: [...], next_cursor: ... } or just [...]
        // Based on the error "markets.map is not a function", it's likely returning an object with a data property.
        // Let's inspect the structure or handle both cases.
        const markets = Array.isArray(marketsResponse) ? marketsResponse : (marketsResponse.data || []);

        if (!Array.isArray(markets)) {
            console.error("[Markets] Unexpected response structure:", JSON.stringify(marketsResponse));
            return new Response(JSON.stringify({ error: "Unexpected response structure from Polymarket API", raw: marketsResponse }), { status: 500 });
        }
        
        // Simplify response for better readability
        const simplifiedMarkets = markets.map(m => ({
            question: m.question,
            condition_id: m.condition_id,
            tokens: m.tokens?.map(t => ({
                name: t.outcome,
                token_id: t.token_id,
                price: t.price
            }))
        }));

        return jsonResponse(simplifiedMarkets);
      }

      // 3. /trade - Execute a trade (buy.js logic)
      // Usage: POST /trade { "token_id": "...", "size": 5, "price": 0.50, "api_key": "...", "api_secret": "...", "passphrase": "..." }
      if (path === "/trade" && request.method === "POST") {
        const body = await request.json();
        const { token_id, size, price, api_key, api_secret, passphrase } = body;

        if (!token_id || !size || !price || !api_key || !api_secret || !passphrase) {
            return new Response("Missing required parameters (token_id, size, price, api_key, api_secret, passphrase)", { status: 400 });
        }

        console.log(`[Trade] Initializing client for trade...`);
        const client = new ClobClient(
            'https://clob.polymarket.com', 
            CHAIN_ID, 
            wallet, 
            {
                apiKey: api_key,
                apiSecret: api_secret,
                passphrase: passphrase
            }
        );

        console.log(`[Trade] Placing order: Buy ${size} of ${token_id} at ${price}`);
        const order = await client.createOrder({
            tokenID: token_id,
            price: parseFloat(price),
            side: Side.BUY,
            size: parseFloat(size),
            feeRateBps: 0,
            nonce: 0
        });

        return jsonResponse({
            status: "success",
            order_id: order.orderID,
            order_status: order.status,
            details: order
        });
      }

      return new Response("Not Found. Available endpoints: /onboard, /markets, /trade (POST)", { status: 404 });

    } catch (error) {
      console.error(`Error processing ${path}:`, error);
      return jsonResponse({
          error: error.message,
          stack: error.stack
      }, 500);
    }
  },
};

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status: status,
        headers: { 'content-type': 'application/json;charset=UTF-8' }
    });
}
