import { Literal, Record, String, Number, Array, Static, Union, Optional } from "runtypes";
import { Exact } from "./exact";
import { Hex32RunType, NonNegativeNumberRunType, Hex64RunType, String128RunType } from "./primitives";


export const TxOutpointRecord = Exact(Record({
    txid: Hex32RunType,
    index: NonNegativeNumberRunType
}));

export const TxInputRecord = Exact(Record({
    outpoint: TxOutpointRecord,
    sig: Hex64RunType
}));

export const NulledTxInputRecord = Exact(Record({
    outpoint: TxOutpointRecord,
    sig: Hex64RunType
}));

export const TxOutputRecord = Exact(Record({
    pubkey: Hex32RunType,
    value: NonNegativeNumberRunType
}));

export const NonCoinbaseTransactionRecord = Exact(Record({
    type: Literal("transaction"),
    inputs: Array(TxInputRecord),
    outputs: Array(TxOutputRecord)
}));

export const NulledNonCoinbaseTransactionRecord = Exact(Record({
    type: Literal("transaction"),
    inputs: Array(NulledTxInputRecord),
    outputs: Array(TxOutputRecord)
}));

export const CoinbaseTransactionRecord = Exact(Record({
    type: Literal("transaction"),
    height: NonNegativeNumberRunType,
    outputs: Array(TxOutputRecord).withConstraint((outputs) => outputs.length == 1)
}));

export const BlockRecord = Exact(Record({
    type: Literal("block"),
    txids: Array(Hex32RunType),
    nonce: Hex32RunType,
    previd: Hex32RunType,
    created: NonNegativeNumberRunType,
    T: Hex32RunType,
    miner: Optional(String128RunType),
    note: Optional(String128RunType),
}));

export const TransactionRecord = Union(CoinbaseTransactionRecord, NonCoinbaseTransactionRecord);

export type TxOutpoint = Static<typeof TxOutpointRecord>;
export type TxInput = Static<typeof TxInputRecord>;
export type NulledTxInput = Static<typeof NulledTxInputRecord>;
export type TxOutput = Static<typeof TxOutputRecord>;
export type NonCoinbaseTransaction = Static<typeof NonCoinbaseTransactionRecord>;
export type NulledNonCoinbaseTransaction = Static<typeof NulledNonCoinbaseTransactionRecord>;
export type CoinbaseTransaction = Static<typeof CoinbaseTransactionRecord>;
export type Transaction = Static<typeof TransactionRecord>;
export type Block = Static<typeof BlockRecord>;