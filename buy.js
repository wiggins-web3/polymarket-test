require('dotenv').config();
const { ethers } = require('ethers');
const { ClobClient, Side, OrderType } = require('@polymarket/clob-client');
const fs = require('fs');

async function main() {
    // 从“数据库”读取凭证
    if (!fs.existsSync('user_creds.json')) {
        console.error('未找到用户凭证，请先运行 onboard.js');
        return;
    }
    const userCreds = JSON.parse(fs.readFileSync('user_creds.json'));

    // 1. 初始化 EOA (仅用于构造 client 实例结构，实际下单走 L2 鉴权)
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'https://polygon-rpc.com');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const chainId = 137;

    // 2. 初始化客户端 (传入 API Key 凭证)
    const client = new ClobClient(
        'https://clob.polymarket.com',
        chainId,
        wallet, // 即使有 key，SDK 初始化时通常仍需要 wallet 对象作为 signer 占位或兜底
        {
            apiKey: userCreds.pm_api_key,
            apiSecret: userCreds.pm_api_secret,
            passphrase: userCreds.pm_passphrase
        }
    );

    // 3. 设置交易参数
    // 示例: 2024年美国大选 - 拜登 (需要替换为真实的 tokenId)
    // 您可以去 https://polymarket.com/market/... 找到对应的 tokenID
    // 或者使用 client.getMarkets() 查询
    const tokenID = "YOUR_TARGET_TOKEN_ID_HERE"; 
    
    const orderSize = 5; // 买入数量 (比如 5 个 Yes token)
    const price = 0.50;  // 限价单价格 (0.50 USDC)

    console.log(`准备下单: 买入 ${orderSize} 个 Yes, 价格 ${price}`);

    try {
        // Step 5: Execute Trade
        const order = await client.createOrder({
            tokenID: tokenID,
            price: price,
            side: Side.BUY,
            size: orderSize,
            feeRateBps: 0, // 对于 Maker 单通常是 0，Taker 可能会有费用，视情况调整
            nonce: 0 // SDK 会自动处理 nonce
        });

        console.log('订单提交成功!');
        console.log('Order ID:', order.orderID);
        console.log('Status:', order.status); // 通常是 "OPEN" 或 "MATCHED"

    } catch (error) {
        console.error('下单失败:', error);
    }
}

main();

