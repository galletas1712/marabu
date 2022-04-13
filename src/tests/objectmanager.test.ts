import { expect } from "chai";
import level from "level-ts";
import { getObjectID, isValidHex, ObjectManager } from "../objectmanager";
import * as ed from "@noble/ed25519";
import "mocha";
import rimraf from "rimraf";
import {
  Block,
  CoinbaseTransaction,
  NonCoinbaseTransaction,
  TxOutpoint,
} from "../types/transactions";
import { canonicalize } from "json-canonicalize";

describe("isValidHex tests", () => {
  it("Should accept lowercase hex strings of given length", () => {
    expect(isValidHex("0a23cfd9", 8)).to.equal(true);
  });

  it("Should reject any invalid hex string", () => {
    expect(isValidHex("0A23cFd9", 8)).to.equal(false);
    expect(isValidHex("10asdf98", 8)).to.equal(false);
    expect(isValidHex("AF!09S8~", 8)).to.equal(false);
    expect(isValidHex("0a23cfd9", 9)).to.equal(false);
  });
});

describe("ObjectManager tests", async () => {
  const FILE = "./tmp_test_db";
  const sk1 = ed.utils.randomPrivateKey();
  const sk2 = ed.utils.randomPrivateKey();
  const sk3 = ed.utils.randomPrivateKey();
  const pk1 = Buffer.from(await ed.getPublicKey(sk1)).toString("hex");
  const pk2 = Buffer.from(await ed.getPublicKey(sk2)).toString("hex");
  const pk3 = Buffer.from(await ed.getPublicKey(sk3)).toString("hex");
  const cbTx: CoinbaseTransaction = {
    type: "transaction",
    height: 1,
    outputs: [
      {
        pubkey: pk1,
        value: 10,
      },
      {
        pubkey: pk2,
        value: 20,
      },
      {
        pubkey: pk3,
        value: 30,
      },
    ],
  };

  let db: level;
  let oj: ObjectManager;

  beforeEach(() => {
    db = new level(FILE);
    oj = new ObjectManager(db);
  });

  afterEach(() => {
    rimraf.sync(FILE);
  });

  it("Should store objects correctly", async () => {
    const obj1 = {
      a: "A",
      b: "B",
    };
    await oj.storeObject(obj1);
    expect(await oj.objectExists(getObjectID(obj1))).to.equal(true);
    expect(await getObjectID(await oj.getObject(getObjectID(obj1)))).to.equal(
      getObjectID(obj1)
    );
    const obj2 = {
      kaching: "$$",
      currencies: ["USD", "GBP", "THB"],
    };
    await oj.storeObject(obj1);
    expect(await oj.objectExists(getObjectID(obj1))).to.equal(true);
    expect(await getObjectID(await oj.getObject(getObjectID(obj1)))).to.equal(
      getObjectID(obj1)
    );
    await oj.storeObject(obj2);
    expect(await oj.objectExists(getObjectID(obj2))).to.equal(true);
    expect(await getObjectID(await oj.getObject(getObjectID(obj2)))).to.equal(
      getObjectID(obj2)
    );
  });

  it("Should always accept a coinbase transaction", async () => {
    expect(await oj.validateObject(cbTx)).to.equal(true);
  });

  it("Should always accept a block", async () => {
    const block = {
      type: "block",
    } as Block;
    expect(await oj.validateObject(block)).to.equal(true);
  });

  it("Should accept a valid transaction", async () => {
    const storedValidTx = cbTx;
    await oj.storeObject(storedValidTx);
    let tx = {
      type: "transaction",
      inputs: [
        {
          outpoint: {
            txid: getObjectID(storedValidTx),
            index: 0,
          },
          sig: null,
        },
        {
          outpoint: {
            txid: getObjectID(storedValidTx),
            index: 1,
          },
          sig: null,
        },
      ],
      outputs: [
        {
          pubkey: pk1,
          value: 15,
        },
        {
          pubkey: pk3,
          value: 15,
        },
      ],
    } as NonCoinbaseTransaction;

    const encoder = new TextEncoder();
    const encodedTx = Uint8Array.from(encoder.encode(canonicalize(tx)));
    const sig1 = Buffer.from(await ed.sign(encodedTx, await ed.getPublicKey(sk1))).toString("hex");
    const sig2 = Buffer.from(await ed.sign(encodedTx, await ed.getPublicKey(sk2))).toString("hex");
    tx.inputs[0].sig = sig1;
    tx.inputs[1].sig = sig2;

    expect(await oj.validateObject(tx)).to.equal(true);
  });

  it("Should invalidate any object that does not fall into the known categories", async () => {
    const randomObject = {
      type: "transaction",
      outputs: [],
    };
    expect(await oj.validateObject(randomObject)).to.equal(false);
  });

  it("Should validate valid non-coinbase transaction objects correctly", async () => {
    const {
        randomBytes
        } = await import('crypto');

    const storedValidTx = cbTx;
    await oj.storeObject(storedValidTx);
    const templateNcbTx = {
      type: "transaction",
      inputs: [
        {
          outpoint: {
            txid: getObjectID(storedValidTx),
            index: 0,
          },
          sig: null,
        },
        {
          outpoint: {
            txid: getObjectID(storedValidTx),
            index: 1,
          },
          sig: null,
        },
      ],
      outputs: [
        {
          pubkey: pk1,
          value: 15,
        },
        {
          pubkey: pk3,
          value: 15,
        },
      ],
    } as NonCoinbaseTransaction;

    let outpointTxNotFoundTx = {...templateNcbTx};
    outpointTxNotFoundTx.inputs[0].outpoint.txid = randomBytes(16).toString('hex');
    expect(await oj.validateObject(outpointTxNotFoundTx)).to.equal(false);

    let outpointIdxOOBTx = {...templateNcbTx};
    outpointIdxOOBTx.inputs[0].outpoint.index = 2;
    expect(await oj.validateObject(outpointIdxOOBTx)).to.equal(false);
  });
});
