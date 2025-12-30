import { ethers } from 'ethers';
import { ClobClient, ClobClientConfig, Side } from '@polymarket/clob-client';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYGON_RPC = process.env.POLYGON_RPC || 'https://polygon-rpc.com';

// Setup provider and wallet (EOA)
if (!PRIVATE_KEY) {
    console.error('Please set PRIVATE_KEY in .env file');
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

async function main() {
    try {
        console.log(`\n--- Step 1: EOA Setup ---`);
        const address = await wallet.getAddress();
        const network = await provider.getNetwork();
        console.log(`EOA Address: ${address}`);
        console.log(`Chain ID: ${network.chainId}`);

        // Initialize ClobClient
        // In a real scenario, we might need to verify if a proxy (Safe) exists.
        // The ClobClient often handles the L2 authentication using the EOA signature.
        const clobClient = new ClobClient(
            POLYGON_RPC,
            network.chainId,
            wallet // Signer
        );

        // Step 2: Create Proxy (Simulation/Check)
        // Note: Actual proxy creation on-chain usually happens via a transaction 
        // to the Proxy Factory (e.g., Gnosis Safe Proxy Factory).
        // The SDK or frontend usually handles "Enable Trading" which includes 
        // checking/deploying the proxy if needed, or it requires a deposit first.
        console.log(`\n--- Step 2: Proxy Check/Creation ---`);
        // We can check if we have a proxy. 
        // (Assuming the SDK has a helper or we just proceed to derive keys which relies on it)
        // For this test script, we assume the proxy creation flow is either handled 
        // by the client.deriveApiKey() internally or done separately.
        // If you need to manually sign the CreateProxy EIP-712:
        /*
        const domain = {
            name: 'Polymarket', 
            version: '1', 
            chainId: Number(network.chainId), 
            verifyingContract: 'PROXY_FACTORY_ADDRESS' 
        };
        const types = { CreateProxy: [{ name: 'owner', type: 'address' }, { name: 'saltNonce', type: 'uint256' }] };
        const value = { owner: address, saltNonce: '...' };
        const signature = await wallet.signTypedData(domain, types, value);
        console.log('CreateProxy Signature:', signature);
        */
        console.log('Skipping manual CreateProxy EIP-712 (usually handled by onboarding flow/SDK).');

        // Step 3: Derive API Key (Enable Trading)
        console.log(`\n--- Step 3: Derive API Key (Enable Trading) ---`);
        // This prompts the user to sign a message to derive the API credentials.
        const creds = await clobClient.deriveApiKey();
        
        console.log('API Credentials derived successfully.');
        // In a real backend, you would NOT log these secrets to console in production.
        const apiKey = creds.apiKey;
        const apiSecret = creds.secret;
        const passphrase = creds.passphrase;

        // Step 4: Simulate Backend Storage
        console.log(`\n--- Step 4: Backend Storage Simulation ---`);
        const storedData = {
            user_id: 'test-user-123',
            wallet_address: address,
            // The proxy address is associated with the EOA.
            // clobClient might not expose it directly without an API call, 
            // but effectively the credentials authorize the proxy.
            pm_proxy_address: '0xSafeAddress...', // You would get this from the chain or SDK
            pm_api_key: apiKey,
            pm_api_secret: '***HIDDEN***', 
            pm_passphrase: passphrase,
            custody_mode: 'LINKED'
        };
        console.log('Stored Data:', JSON.stringify(storedData, null, 2));

        // Step 5: Place Order (Execute Trade)
        console.log(`\n--- Step 5: Place Order via L2 Key ---`);
        
        // We re-initialize the client with the derived credentials to simulate the backend usage
        const backendClient = new ClobClient(
            POLYGON_RPC,
            network.chainId,
            wallet, // Technically backend uses API keys, but the SDK allows passing them
            creds // Pass the derived credentials
        );

        // Define order parameters
        const marketId = "MARKET_ID_HERE"; // Replace with a valid market ID (e.g. from Gamma markets)
        const price = 0.50; // Limit price
        const size = 10; // Amount
        const side = Side.BUY;

        console.log(`Placing order: ${side} ${size} @ ${price} on market ${marketId}`);
        
        // Uncomment to actually place order (requires valid market ID and funds)
        /*
        const order = await backendClient.createOrder({
            tokenID: marketId,
            price: price,
            side: side,
            size: size,
            feeRateBps: 0,
            nonce: 0 // SDK handles nonce?
        });
        console.log('Order Result:', order);
        */
       console.log("Order placement code is commented out to prevent errors with invalid market ID.");

    } catch (error) {
        console.error('Error in flow:', error);
    }
}

main();

