"use strict";
exports.__esModule = true;
exports.MessageRecord = exports.ChainTipMsgRecord = exports.GetChainTipMsgRecord = exports.MempoolMsgRecord = exports.GetMempoolMsgRecord = exports.ObjectMsgRecord = exports.IHaveObjectMsgRecord = exports.GetObjectMsgRecord = exports.PeersMsgRecord = exports.GetPeersMsgRecord = exports.ErrorMsgRecord = exports.HelloMsgRecord = void 0;
var runtypes_1 = require("runtypes");
exports.HelloMsgRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("hello"),
    version: runtypes_1.String,
    agent: (0, runtypes_1.Optional)(runtypes_1.String)
});
exports.ErrorMsgRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("error"),
    error: runtypes_1.String
});
exports.GetPeersMsgRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("getpeers")
});
exports.PeersMsgRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("peers"),
    peers: (0, runtypes_1.Array)(runtypes_1.String)
});
exports.GetObjectMsgRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("getobject"),
    objectid: runtypes_1.String
});
exports.IHaveObjectMsgRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("ihaveobject"),
    objectid: runtypes_1.String
});
exports.ObjectMsgRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("object"),
    object: (0, runtypes_1.Record)({})
});
exports.GetMempoolMsgRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("getmempool")
});
exports.MempoolMsgRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("mempool"),
    txids: (0, runtypes_1.Array)(runtypes_1.String)
});
exports.GetChainTipMsgRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("getchaintip")
});
exports.ChainTipMsgRecord = (0, runtypes_1.Record)({
    type: (0, runtypes_1.Literal)("chaintip"),
    blockid: runtypes_1.String
});
exports.MessageRecord = (0, runtypes_1.Union)(exports.HelloMsgRecord, exports.ErrorMsgRecord, exports.GetPeersMsgRecord, exports.PeersMsgRecord, exports.GetObjectMsgRecord, exports.IHaveObjectMsgRecord, exports.ObjectMsgRecord, exports.GetMempoolMsgRecord, exports.MempoolMsgRecord, exports.GetChainTipMsgRecord, exports.ChainTipMsgRecord);
