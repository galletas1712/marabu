import { canonicalize } from "json-canonicalize";
import Level from "level-ts";
import sha256 from "fast-sha256";
import { logger } from "./logger";
import { CoinbaseTransactionRecord, NonCoinbaseTransactionRecord, Transaction, TransactionRecord, TxInput } from "./types/transactions";


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
                // TODO

                sumInputs += outpointTx.outputs[input.outpoint.index].value;
            }

            if (sumInputs != sumOutputs) {
                return false;
            }
            return true;
        } else if (CoinbaseTransactionRecord.guard(obj)) {
            return true;
        } 
        
        //not a valid transaction format; need to return error to node that sent it to us
        return false;
    }
}
