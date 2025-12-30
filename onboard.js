require('dotenv').config();
const { ethers } = require('ethers');
const { ClobClient } = require('@polymarket/clob-client');
const fs = require('fs');

async function main() {
    // 1. 初始化 EOA 钱包 (Step 1)
    if (!process.env.PRIVATE_KEY) {
        console.error('请在 .env 文件中配置 PRIVATE_KEY');
        process.exit(1);
    }
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'https://polygon-rpc.com');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const chainId = 137; // Polygon Mainnet

    console.log(`正在连接 EOA: ${wallet.address}`);

    // 2. 初始化 CLOB 客户端
    // SDK 会自动处理与 Proxy 相关的逻辑，如果已创建 Proxy，它会自动识别
    const client = new ClobClient(
        'https://clob.polymarket.com',
        chainId,
        wallet
    );

    try {
        // Step 3: Derive API Key (L1 签名)
        // 这个步骤会触发 EIP-712 签名，生成 API 凭证
        console.log("正在检查 RPC 连接...");
        const network = await provider.getNetwork();
        console.log("已连接至网络:", network.name);
        console.log("已连接至网络:", network.chainId);

        console.log('正在生成 API Key (请等待签名)...');
        const creds = await client.deriveApiKey();

        console.log('API Key 生成成功!');
        console.log('Api Key:', creds.apiKey);
        // console.log('Secret:', creds.secret); // 敏感信息

        // Step 4: 数据落库 (模拟保存到本地 JSON 文件)
        const userData = {
            wallet_address: wallet.address,
            // SDK 内部处理了 proxy 地址，如果需要显式获取可以使用 client.deriveProxy() (视SDK版本) 
            // 或通过 creds 关联。这里主要保存 API 凭证。
            pm_api_key: creds.apiKey,
            pm_api_secret: creds.secret,
            pm_passphrase: creds.passphrase,
            created_at: new Date().toISOString()
        };

        fs.writeFileSync('user_creds.json', JSON.stringify(userData, null, 2));
        console.log('API 凭证已保存至 user_creds.json (模拟落库完成)');

    } catch (error) {
        console.error('获取 API Key 失败:', error);
    }
}

main();

