import moment from 'moment';
import React from 'react';
import { Container } from 'react-bootstrap';

function TxHistory({ pubKey, txs, loadMoreBtnClick }) {

    if (!Array.isArray(txs) || txs.length === 0)
        return null;

    return (
        <Container>
            <h3>Tx History</h3>

            <table className="table">
                <thead>
                    <tr>
                        <th scope="col">Hash</th>
                        <th scope="col">DateTime</th>
                        <th scope="col">Status</th>
                        <th scope="col">TX</th>
                    </tr>
                </thead>
                <tbody>
                    {txs.map(tx => (
                        <tr key={tx.hash}>
                            <th scope="row">{shortString(tx.hash)}</th>
                            <td>{moment.unix(tx.datetime).format("MM/DD/YYYY HH:ss")}</td>
                            <td>{tx.status}</td>
                            <td>
                                <a href={`https://solscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer">View</a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button className="btn btn-primary"
                onClick={() => loadMoreBtnClick()}
            >
                Load More
            </button>
        </Container>
    );
}

const shortString = (str, start = 4, end = 4) => `${str.slice(0, start)}...${str.slice(str.length - end, str.length)}`;

export default TxHistory;
