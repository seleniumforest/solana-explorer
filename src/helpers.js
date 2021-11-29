import { RateLimiter } from "limiter";
import * as solanaWeb3 from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import axios from "axios";

//10 requests per second
const limiter = new RateLimiter({ tokensPerInterval: 10, interval: "second" });

const connection = new solanaWeb3.Connection(
    "https://free.rpcpool.com/",
    {
        fetchMiddleware: async (url, options, next) => { 
            const remainingRequests = await limiter.removeTokens(1);
            if (remainingRequests === 0) { 
                console.warn("Too many requests");
                await new Promise((res) => setTimeout(res, 1000));
            };

            await next(url, options);
        }
    });


const tokenProgramAccount = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export const fetchTxs = async (pubKey, limit, lastTxHash) => {
    let signatures = await connection.getConfirmedSignaturesForAddress2(
        pubKey,
        { limit: limit, before: lastTxHash },
        "confirmed");

    let transactions = await connection.getParsedConfirmedTransactions(
        signatures.map(x => x.signature),
        "finalized");

    let ownedAccounts = await connection.getTokenAccountsByOwner(
        pubKey, 
        { programId: new solanaWeb3.PublicKey(tokenProgramAccount) });

    let txs = []
    for (const tx of transactions) {
        let balanceChanges = await calcBalanceChanges(tx, pubKey, ownedAccounts);

        txs.push({
            hash: tx.transaction.signatures[0],
            datetime: tx.blockTime,
            status: tx.meta.err ? "failed" : "success",
            balances: balanceChanges,
            fee: tx.meta.fee / solanaWeb3.LAMPORTS_PER_SOL
        });
    }

    return txs;
}

const calcBalanceChanges = async (tx, pubKey, ownedAccounts) => {
    let solBalanceChange = calcSolBalanceChange(tx, pubKey);
    let tokenBalanceChange = await calcTokenBalanceChange(tx, ownedAccounts);

    return [...solBalanceChange, ...tokenBalanceChange];
}

const calcTokenBalanceChange = async (tx, ownedAccounts) => {
    let postBalances = tx.meta.postTokenBalances;
    let preBalances = tx.meta.preTokenBalances;
    let tickers = await getTokens();

    return tx.transaction.message.accountKeys.map((x, i) => {
        let owned = ownedAccounts.value.find(y => y.pubkey.toString() === x.pubkey.toString());

        if (!owned)
            return null;

        let postTokenBalance = postBalances.find(y => y.accountIndex === i);
        let preTokenBalance = preBalances.find(y => y.accountIndex === i);

        if (!postTokenBalance || !preTokenBalance)
            return null;

        let postAmount = new BigNumber(postTokenBalance.uiTokenAmount.amount);
        let preAmount = new BigNumber(preTokenBalance.uiTokenAmount.amount);
        let decimals = postTokenBalance.uiTokenAmount.decimals || preTokenBalance.uiTokenAmount.decimals;
        let tokenAddress = postTokenBalance.mint || preTokenBalance.mint;

        let changeAmount = postAmount.minus(preAmount).dividedBy(Math.pow(10, decimals));

        if (changeAmount.isZero())
            return null;

        let ticker = tickers.find(y => y.address === tokenAddress)?.symbol
        return { changeAmount: changeAmount.toString(), ticker };
    }).filter(x => x);
}

const calcSolBalanceChange = (tx, pubKey) => {
    let accountIndex = tx.transaction.message.accountKeys.findIndex(x => x.pubkey.toString() === pubKey.toString());
    let solDiff = (tx.meta.postBalances[accountIndex] - tx.meta.preBalances[accountIndex]) + tx.meta.fee;

    return solDiff === 0 ? [] : [{ ticker: "SOL", changeAmount: solDiff / solanaWeb3.LAMPORTS_PER_SOL }];
}


//  :)
let cache;
const getTokens = async () => {
    if (cache)
        return cache;

    //https://decommas.io/gears/app/api/tokens 
    let response = await axios.get("/tokenlist.json");
    let tokenlist = response.data.map(x => ({
        address: x.address,
        symbol: x.symbol
    }));

    cache = tokenlist;
    return cache;
}