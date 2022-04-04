export interface Message {
    type: string
}

export interface HelloMessage extends Message {
    version: string
    agent?: string
}

export interface ErrorMessage extends Message {
    error: string
}

export interface GetPeersMessage extends Message {}

export interface PeersMessage extends Message {
    peers: Array<string>
}

export interface GetObjectMessage extends Message {
    objectid: string
}

export interface IHaveObjectMessage extends Message {
    objectid: string
}

export interface ObjectMesage extends Message {
    object: Object
}

export interface GetMempoolMessage extends Message {}

export interface MempoolMessage extends Message {
    txids: Array<string>
}

export interface GetChainTipMessage extends Message {}

export interface ChainTipMessage extends Message {
    blockid: string
}