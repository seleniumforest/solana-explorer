import React, { useEffect, useState } from 'react';
import { Container, Navbar } from 'react-bootstrap';
import Account from './Account';
import TxHistory from './TxHistory';
import { fetchTxs } from '../helpers';

const App = () => {

    const [txs, setTxs] = useState([]);
    const [pubKey, setPubKey] = useState();
    const [txsLoading, setTxsLoading] = useState(false);

    const processLoad = () => {
        if (!pubKey)
            return;

        setTxsLoading(true);
        (async () => {
            try {
                let transactions = await fetchTxs(pubKey, 10, txs[txs.length - 1]?.hash);
                setTxs([...txs, ...transactions]);
            }
            finally {
                setTxsLoading(false);
            }
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
