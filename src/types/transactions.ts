import { Literal, Record, String, Number, Array, Static, Union } from "runtypes";

export const TxOutpointRecord = Record({
    txid: String,
    index: Number
});

export const TxInputRecord = Record({
    outpoint: TxOutpointRecord,
    sig: String
});

export const TxOutputRecord = Record({
    pubkey: String,
    value: Number
});

export const NonCoinbaseTransactionRecord = Record({
    type: Literal("transaction"),
    inputs: Array(TxInputRecord),
    outputs: Array(TxOutputRecord)
});

export const CoinbaseTransactionRecord = Record({
    type: Literal("transaction"),
    height: Number,
    outputs: Array(TxOutputRecord)
});

export const TransactionRecord = Union(CoinbaseTransactionRecord, NonCoinbaseTransactionRecord);

export type TxOutpoint = Static<typeof TxOutpointRecord>;
export type TxInput = Static<typeof TxInputRecord>;
export type TxOutput = Static<typeof TxOutputRecord>;
export type NonCoinbaseTransaction = Static<typeof NonCoinbaseTransactionRecord>;
export type CoinbaseTransaction = Static<typeof CoinbaseTransactionRecord>;
export type Transaction = Static<typeof TransactionRecord>;