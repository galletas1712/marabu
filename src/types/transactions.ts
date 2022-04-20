import { Literal, Record, String, Number, Array, Static, Union } from "runtypes";

export const isValidHex = (
  hexString: string,
  expectedLength: number
): boolean => {
  for (let i = 0; i < hexString.length; i++) {
    if (
      !(
        (hexString[i] >= "0" && hexString[i] <= "9") ||
        (hexString[i] >= "a" && hexString[i] <= "f")
      )
    ) {
      return false;
    }
  }
  return (
    hexString.length === expectedLength && hexString.toLowerCase() === hexString
  );
};

export const Hex32 = String.withConstraint((pk: string) => isValidHex(pk, 64));
export const Hex64 = String.withConstraint((sig: string) => isValidHex(sig, 128));
export const String128 = String.withConstraint((s: string) => s.length <= 128);
export const NonNegativeNumber = Number.withConstraint((x: number)=> x >= 0);

export const TxOutpointRecord = Record({
    txid: Hex32,
    index: NonNegativeNumber
});

export const TxInputRecord = Record({
    outpoint: TxOutpointRecord,
    sig: Hex64
});

export const NulledTxInputRecord = Record({
    outpoint: TxOutpointRecord,
    sig: Hex64
});

export const TxOutputRecord = Record({
    pubkey: Hex32,
    value: NonNegativeNumber
});

export const NonCoinbaseTransactionRecord = Record({
    type: Literal("transaction"),
    inputs: Array(TxInputRecord),
    outputs: Array(TxOutputRecord)
});

export const NulledNonCoinbaseTransactionRecord = Record({
    type: Literal("transaction"),
    inputs: Array(NulledTxInputRecord),
    outputs: Array(TxOutputRecord)
});

export const CoinbaseTransactionRecord = Record({
    type: Literal("transaction"),
    height: NonNegativeNumber,
    outputs: Array(TxOutputRecord)
});

export const BlockRecord = Record({
    type: Literal("block"),
    txids: Array(Hex32),
    nonce: Hex32,
    previd: Hex32,
    created: NonNegativeNumber,
    T: Hex32,
    miner: String128,
    note: String128
});

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