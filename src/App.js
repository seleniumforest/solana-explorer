import React from 'react';
import { Container, Navbar } from 'react-bootstrap';
import './App.css';
import * as solanaWeb3 from '@solana/web3.js';
import WalletExplorer from './Components/WalletExplorer';

function App() {
  console.log(solanaWeb3)

  return (
    <>
      <Navbar bg="light" expand="lg">
        <Container>
          <Navbar.Brand href="#home">Alpaca's Solana explorer</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
        </Container>
      </Navbar>
      <WalletExplorer />
    </>
  );
}

export default App;
