import { canonicalize } from "json-canonicalize";
import Level from "level-ts";
import sha256 from "fast-sha256";
import { logger } from "./logger";

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
        const jsonBytes = encoder.encode(canonicalize(obj));
        return sha256(jsonBytes).toString();
    }
}