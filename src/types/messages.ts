import {
  Literal,
  Optional,
  Record,
  String,
  Array,
  Union,
  Static,
} from "runtypes";

export const HelloMsgRecord = Record({
  type: Literal("hello"),
  version: String,
  agent: Optional(String),
});

export const ErrorMsgRecord = Record({
  type: Literal("error"),
  error: String,
});

export const GetPeersMsgRecord = Record({
  type: Literal("getpeers"),
});

export const PeersMsgRecord = Record({
  type: Literal("peers"),
  peers: Array(String),
});

export const GetObjectMsgRecord = Record({
  type: Literal("getobject"),
  objectid: String,
});

export const IHaveObjectMsgRecord = Record({
  type: Literal("ihaveobject"),
  objectid: String,
});

export const ObjectMsgRecord = Record({
  type: Literal("object"),
  object: Record({}),
});

export const GetMempoolMsgRecord = Record({
  type: Literal("getmempool"),
});

export const MempoolMsgRecord = Record({
  type: Literal("mempool"),
  txids: Array(String),
});

export const GetChainTipMsgRecord = Record({
  type: Literal("getchaintip"),
});

export const ChainTipMsgRecord = Record({
  type: Literal("chaintip"),
  blockid: String,
});

export const MessageRecord = Union(
  HelloMsgRecord,
  ErrorMsgRecord,
  GetPeersMsgRecord,
  PeersMsgRecord,
  GetObjectMsgRecord,
  IHaveObjectMsgRecord,
  ObjectMsgRecord,
  GetMempoolMsgRecord,
  MempoolMsgRecord,
  GetChainTipMsgRecord,
  ChainTipMsgRecord
);

export type HelloMsg = Static<typeof HelloMsgRecord>;
export type ErrorMsg = Static<typeof ErrorMsgRecord>;
export type GetPeersMsg = Static<typeof GetPeersMsgRecord>;
export type PeersMsg = Static<typeof PeersMsgRecord>;
export type GetObjectMsg = Static<typeof GetObjectMsgRecord>;
export type IHaveObjectMsg = Static<typeof IHaveObjectMsgRecord>;
export type ObjectMsg = Static<typeof ObjectMsgRecord>;
export type GetMempoolMessage = Static<typeof GetMempoolMsgRecord>;
export type MempoolMessage = Static<typeof MempoolMsgRecord>;
export type GetChainTipMessage = Static<typeof GetChainTipMsgRecord>;
export type ChainTipMessage = Static<typeof ChainTipMsgRecord>;
export type Message = Static<typeof MessageRecord>;
