export const requiredMessageKeys: { [key: string]: Array<string> } = {
    "hello": ["type", "version"],
    "error": ["type", "error"],
    "getpeers": ["type"],
    "peers": ["type", "peers"],
    "getobject": ["type", "objectid"],
    "ihaveobject": ["type", "objectid"],
    "object": ["type", "object"],
    "getmempool": ["type"],
    "mempool": ["type", "txids"],
};

export const optionalMessageKeys: { [key: string]: Array<string> } = {
    "hello": ["agent"]
};

export const helloMessage = JSON.stringify({
    "type": "hello",
    "version": "0.8.0",
    "agent": "Marabu-Core Client 0.8"
});

export const getPeersMessage = JSON.stringify({"type": "getpeers"});
export const peersMessage = (knownPeers: Array<string>) => JSON.stringify({ "type": "peers", "peers": knownPeers });
export const errorMessage = (errorMsg: string) => JSON.stringify({ "type": "error", "error": errorMsg });
