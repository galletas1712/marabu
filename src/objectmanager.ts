import { canonicalize } from "json-canonicalize";
import Level from "level-ts";
import sha256 from "fast-sha256";
import * as ed from "@noble/ed25519";
import { logger } from "./logger";
import { BlockRecord, CoinbaseTransactionRecord, NonCoinbaseTransaction, NonCoinbaseTransactionRecord, NulledNonCoinbaseTransaction, NulledTxInput, Transaction, TransactionRecord, TxInput } from "./types/transactions";

const genSignatureNulledTransaction = (tx: NonCoinbaseTransaction): NulledNonCoinbaseTransaction => {
    return {
        type: "transaction",
        inputs: tx.inputs.map((input: TxInput): NulledTxInput => {
            return {
                outpoint: input.outpoint,
                sig: null
            }
        }),
        outputs: tx.outputs
    }
};

const isValidHex = (hexString: string, expectedLength: number): boolean => {
    for (let i = 0; i < hexString.length; i++) {
        if (!((hexString[i] >= '0' && hexString[i] <= '9') || (hexString[i] >= 'a' && hexString[i] <= 'f'))) {
            return false;
        }
    }
    return hexString.length === expectedLength && hexString.toLowerCase() === hexString;
};

export class ObjectManager {
    private db: Level

    constructor(db: Level) {
        this.db = db;
    }

    async objectExists(objID: string) {
        return this.db.exists(objID);
    }

    async getObject(objID: string) {
        return this.db.get(objID);
    }
    
    async storeObject(obj: Object) {
        logger.debug("Storing:", obj);
        await this.db.put(this.getObjectID(obj), obj);
    }

    getObjectID(obj: Object): string {
        const encoder = new TextEncoder();
        return Buffer.from(sha256(encoder.encode(canonicalize(obj)))).toString('hex')
    }

    async validateObject(obj: Object): Promise<boolean> {
        if (NonCoinbaseTransactionRecord.guard(obj)) {
            const nulledTx = genSignatureNulledTransaction(obj);

            let sumInputs = 0;
            let sumOutputs = 0;

            // Check inputs
            for (const input of obj.inputs) {
                // Check outpoint
                if (!this.objectExists(input.outpoint.txid)) {
                    return false;
                }
                const outpointTx: Transaction = await this.getObject(input.outpoint.txid);
                if (input.outpoint.index >= outpointTx.outputs.length) {
                    return false;
                }

                // Check signature
                if (!isValidHex(input.sig, 64)) {
                    return false;
                }
                const pubkey = outpointTx.outputs[input.outpoint.txid].pubkey;
                if (!isValidHex(pubkey, 32)) {
                    throw Error("Outpoint public key is invalid");
                }
                const sig_u8 = Uint8Array.from(Buffer.from(input.sig, "hex"));
                const pubkey_u8 = Uint8Array.from(Buffer.from(pubkey, "hex"));
                if (!ed.verify(sig_u8, canonicalize(nulledTx), pubkey_u8)) {
                    return false;
                }

                sumInputs += outpointTx.outputs[input.outpoint.index].value;
            }

            // Check outputs: pubkey is valid format and value is non-negative
            for(const output of obj.outputs) {
                if (!isValidHex(output.pubkey, 32) || output.value < 0) {
                    return false;
                }
                sumOutputs += output.value;
            }

            // Check conservation of UTXOs
            if (sumInputs != sumOutputs) {
                return false;
            }

            return true;
        } else if (CoinbaseTransactionRecord.guard(obj)) {
            return true;
        } else if (BlockRecord.guard(obj)) {
            return true;
        }

        //not a valid transaction format; need to return error to node that sent it to us
        return false;
    }
}