import React, { useEffect, useState } from 'react';
import { Container, Navbar } from 'react-bootstrap';
import * as solanaWeb3 from '@solana/web3.js';
import Account from './Account';
import TxHistory from './TxHistory';
import { getTokens } from '../tokenList';
import BigNumber from 'bignumber.js';

const connection = new solanaWeb3.Connection("https://free.rpcpool.com/");
const tokenProgramAccount = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const App = () => {

    const [txs, setTxs] = useState([]);
    const [pubKey, setPubKey] = useState();
    const [txsLoading, setTxsLoading] = useState(false);

    const processLoad = () => {
        if (!pubKey)
            return;

        setTxsLoading(true);
        (async () => {
            let transactions = await fetchTxs(pubKey, 10, txs[txs.length - 1]?.hash);
            setTxs([...txs, ...transactions]);
            setTxsLoading(false);
        })();
    }

    useEffect(processLoad, [pubKey]);

    return (
        <>
            <LoadingBlock show={txsLoading} />
            <Navbar bg="light" expand="lg">
                <Container>
                    <Navbar.Brand href="#home">Alpaca's Solana explorer</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                </Container>
            </Navbar>
            <Account setPubKey={(pubKey) => { setTxs([]); setPubKey(pubKey); }} />
            <TxHistory txs={txs} pubKey={pubKey} loadMoreBtnClick={processLoad} />
        </>
    );
}

const fetchTxs = async (pubKey, limit, lastTxHash) => {
    let signatures = await connection.getConfirmedSignaturesForAddress2(
        pubKey,
        {
            limit: limit,
            before: lastTxHash
        },
        "confirmed");

    let transactions = await connection.getParsedConfirmedTransactions(
        signatures.map(x => x.signature),
        "finalized");

    let ownedAccounts = await connection.getTokenAccountsByOwner(pubKey, { programId: new solanaWeb3.PublicKey(tokenProgramAccount) });

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


const LoadingBlock = ({ show }) => (
    <div style={{
        display: show ? "block" : "none",
        height: "100%",
        width: "100%",
        position: "fixed",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        zIndex: 1
    }}
    >
        <span style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            color: "white",
            transform: "translate(-50%,-50%)"
        }}
        >
            Loading...
        </span>
    </div>
);

export default App;
