"use strict";
exports.__esModule = true;
exports.CoinbaseTransactionRecord = exports.NonCoinbaseTransactionRecord = exports.TxOutputRecord = exports.TxInputRecord = exports.TxOutpointRecord = void 0;
var runtypes_1 = require("runtypes");
exports.TxOutpointRecord = (0, runtypes_1.Record)({
    txid: runtypes_1.String,
    index: runtypes_1.Number
});
exports.TxInputRecord = (0, runtypes_1.Record)({
    outpoint: exports.TxOutpointRecord,
    sig: runtypes_1.String
});
exports.TxOutputRecord = (0, runtypes_1.Record)({
    pubkey: runtypes_1.String,
    value: runtypes_1.Number
});
exports.NonCoinbaseTransactionRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("transaction"),
    inputs: (0, runtypes_1.Array)(exports.TxInputRecord),
    outputs: (0, runtypes_1.Array)(exports.TxOutputRecord)
});
exports.CoinbaseTransactionRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("transaction"),
    height: runtypes_1.Number,
    outputs: (0, runtypes_1.Array)(exports.TxOutputRecord)
});
