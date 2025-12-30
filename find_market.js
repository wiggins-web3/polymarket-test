const { ClobClient } = require('@polymarket/clob-client');
const chainId = 137;

// 这是一个简化的只读客户端用法
const client = new ClobClient('https://clob.polymarket.com', chainId);

async function main() {
    try {
        // 获取部分市场信息
        const markets = await client.getMarkets({ limit: 5 }); // 获取前5个活跃市场
        
        if (markets && markets.length > 0) {
            const m = markets[0];
            console.log(`\n市场: ${m.question}`);
            if (m.tokens && m.tokens.length >= 2) {
                console.log(`Yes Token ID: ${m.tokens[0].token_id}`);
                console.log(`No Token ID: ${m.tokens[1].token_id}`);
                console.log('您可以复制上面的 Yes Token ID 到 buy.js 中使用。');
            } else {
                console.log('未找到 Token 信息');
            }
        } else {
            console.log('未找到活跃市场');
        }
    } catch (error) {
        console.error('获取市场信息失败:', error);
    }
}

main();

