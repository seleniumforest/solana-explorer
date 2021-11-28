import React, { useEffect, useState } from 'react';
import { Container, Navbar } from 'react-bootstrap';
import * as solanaWeb3 from '@solana/web3.js';
import Account from './Account';
import TxHistory from './TxHistory';
import { getTokens } from '../tokenList';

const connection = new solanaWeb3.Connection("https://free.rpcpool.com/");

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

    let txs = []
    for (const tx of transactions) {
        let balances = await calcBalanceChanges(tx, pubKey);
        console.log(balances);  
        txs.push({
            hash: tx.transaction.signatures[0],
            datetime: tx.blockTime,
            status: tx.meta.err ? "failed" : "success",
            balances: balances.filter(x => x.changeAmount !== 0),
            fee: tx.meta.fee / solanaWeb3.LAMPORTS_PER_SOL
        });
    }

    return txs;
}

const calcBalanceChanges = async (tx, pubKey) => {
    let solBalanceChange = calcSolBalanceChange(tx, pubKey);
    let tokenBalanceChange = await calcTokenBalanceChange(tx);

    return [...solBalanceChange, ...tokenBalanceChange];
}

const calcTokenBalanceChange = async (tx) => {
    let postBalances = tx.meta.postTokenBalances;
    let preBalances = tx.meta.preTokenBalances;
    let tickers = await getTokens();

    let maxBalancesLength = Math.max(postBalances.length, preBalances.length);
    let diff = [];
    for (let i = 0; i <= maxBalancesLength; i++) {
        let postBalance = postBalances[i];
        let preBalance = preBalances[i];

        if (!postBalance || !preBalance)
            continue;

        let postTokenAmount = postBalance.uiTokenAmount.amount;
        let preTokenAmount = preBalance.uiTokenAmount.amount;
        let decimals = postBalance.uiTokenAmount.decimals;
        let address = postBalance.mint;

        if (preTokenAmount !== postTokenAmount)
            diff.push({ 
                changeAmount: (postTokenAmount - preTokenAmount) / Math.pow(10, decimals), 
                ticker: tickers.find(x => x.address === address)?.symbol 
            });
    }

    return diff;
}

const calcSolBalanceChange = (tx, pubKey) => {
    let accountIndex = tx.transaction.message.accountKeys.findIndex(x => x.pubkey.toString() === pubKey.toString());
    let solDiff = (tx.meta.postBalances[accountIndex] - tx.meta.preBalances[accountIndex]) + tx.meta.fee;

    return [ { ticker: "SOL", changeAmount: solDiff / solanaWeb3.LAMPORTS_PER_SOL }];
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
