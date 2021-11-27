import React, { useState } from 'react';
import { Container } from 'react-bootstrap';
import * as solanaWeb3 from '@solana/web3.js';

function Account({ setPubKey }) {

    const [ validClass, setValidClass ] = useState("");
    
    return (
        <>
            <Container>
                <h3>Wallet Explorer</h3>
                <label style={{display: "block"}}>Input account public key</label>
                <input style={{maxWidth: "600px"}} className={`form-control public-key-input ${validClass}`}
                    onChange={(e) => {
                        let pubKey = tryParsePubkey(e.target.value);
                        setPubKey(pubKey || null);
                        setValidClass(pubKey ? "is-valid" : "is-invalid");
                    }} />
            </Container>
        </>

    );
}

const tryParsePubkey = (pubkey) => {
    try {
        return new solanaWeb3.PublicKey(pubkey);
    }
    catch (e) {
        console.warn("Incorrect wallet");
        return;
    }
}

export default Account;
