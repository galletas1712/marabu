import { ObjectManager } from "../objects/objectmanager";
import { getObjectID } from "../objects/util";
import * as net from "net";
import Level from "level-ts";
import { randomBytes } from "crypto";
import { canonicalize } from "json-canonicalize";
import * as ed from "@noble/ed25519";
import { Console } from "console";
import { CoinbaseTransaction, CoinbaseTransactionRecord, NonCoinbaseTransactionRecord } from "../types/transactions";
import { PeerManager } from "../peermanager";
import { level } from "winston";

const args = process.argv.slice(2);
const serverHostname = args[0];
const serverPort = Number.parseInt(args[1]);

let helloMsg =
  JSON.stringify({
    type: "hello",
    version: "0.8.0",
    agent: "Marabu-Core Client 0.8",
  }) + "\n";
let getPeersMsg = JSON.stringify({ type: "getpeers" }) + "\n";
let peersMsg =
  JSON.stringify({
    type: "peers",
    peers: ["custompeer.ksks1:18018", "custompeer.ksks2:18018"],
  }) + "\n";

let iHaveObjectMsg =
  JSON.stringify({ type: "ihaveobject", objectid: pseudorandomId() }) + "\n";

let chaintipMsg = JSON.stringify({ "type": "getchaintip" }) + "\n";

function pseudorandomId() {
  return (
    "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e8" +
    Math.round(Math.random() * 100000)
      .toString()
      .padStart(6, "0")
  );
}
function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createNewClient(messages) {
  const clientID = Math.floor(Math.random() * 100);
  const client = new net.Socket();

  client.on("data", (msg) => {
    console.log(`Client ${clientID} received message:`, msg.toString());
  });

  client.on("connect", async () => {
    for (let message of messages) {
      console.log(`Client ${clientID} sending:`, message);
      client.write(message);
      await timeout(2000);
    }
  });
  client.connect(serverPort, serverHostname);
  return client;
}

// async function hashObject(txn) {
//   const dummyBD = new Level("./testDB");
//   const dummyBD2 = new Level("./testDB2");
//   const dummyBD3 = new Level("./testDB3");
//   const pm = new PeerManager(dummyBD3);
//   await pm.load();
//   let obm = new ObjectManager(dummyBD, dummyBD2, pm);
//   let objid = getObjectID(txn);
//   return objid;
// }

// function createGetObjMsg(txn) {
//   let msg = { type: "getobject", objectid: hashObject(txn) };
//   return JSON.stringify(msg) + "\n";
// }


async function test0(){
    console.log(
        "Test 0: Sends nothing, expects genesis to be returned (00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e)"
    )
    createNewClient([helloMsg, chaintipMsg]);
}

async function test1(){
    console.log(
        "Test 1: Sends genesis; expects genesis to be returned (00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e)"
    );

    let block1mesg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1624219079,"miner":"dionyziz","nonce":"0000000000000000000000000000000000000000000000000000002634878840","note":"The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage","previd":null,"txids":[],"type":"block"},"type":"object"}` + '\n';
    let block2msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650421857102,"miner":"grader","nonce":"d20e849d2e19dc7408b0c02d4dba5a1b3895839a4242660ae8ee18a5a97bcae7","note":"This block has a coinbase transaction","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["2aac601bb784c0de6fdbf47918c9928fb0505eda3174d5cc7790f9b7d27e1963"],"type":"block"},"type":"object"}` + '\n';
    let block3msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650433203255,"miner":"grader","nonce":"eab983d7bf941a212915b2155375e5ae308e23fe346155f8c8cb552c4ac98e51","note":"This block has another coinbase and spends earlier coinbase","previd":"00000002364806bfeafd0af08e88805ce14ea2e0222e0d3aaee3fe1809047482","txids":["1db7b7b6a0971aac14cc3a5114864c89c0455c2baebf3050760c30a24964cf7c","314e63a79f51450750282a02bc669d799781b222379930be635d7f2429c0fb36"],"type":"block"},"type":"object"}` + '\n';
    
    createNewClient([helloMsg]);
    createNewClient([helloMsg, block1mesg,chaintipMsg]);

}


async function test2(){
    console.log(
        "Test 2: Sends one block to extend genesis; expects extension to be returned (00000002364806bfeafd0af08e88805ce14ea2e0222e0d3aaee3fe1809047482) "
    );

    let block1mesg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1624219079,"miner":"dionyziz","nonce":"0000000000000000000000000000000000000000000000000000002634878840","note":"The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage","previd":null,"txids":[],"type":"block"},"type":"object"}` + '\n';
    let block2msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650421857102,"miner":"grader","nonce":"d20e849d2e19dc7408b0c02d4dba5a1b3895839a4242660ae8ee18a5a97bcae7","note":"This block has a coinbase transaction","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["2aac601bb784c0de6fdbf47918c9928fb0505eda3174d5cc7790f9b7d27e1963"],"type":"block"},"type":"object"}` + '\n';
    let block3msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650433203255,"miner":"grader","nonce":"eab983d7bf941a212915b2155375e5ae308e23fe346155f8c8cb552c4ac98e51","note":"This block has another coinbase and spends earlier coinbase","previd":"00000002364806bfeafd0af08e88805ce14ea2e0222e0d3aaee3fe1809047482","txids":["1db7b7b6a0971aac14cc3a5114864c89c0455c2baebf3050760c30a24964cf7c","314e63a79f51450750282a02bc669d799781b222379930be635d7f2429c0fb36"],"type":"block"},"type":"object"}` + '\n';
    
    createNewClient([helloMsg]);
    createNewClient([helloMsg, block1mesg, block2msg, chaintipMsg]);

}


async function test3(){
    console.log(
        "Test 3: Sends one block to extend genesis chain; expects that block to be returned (0000000196862be06c7175801855ed2886a97f1b2ac4d35c61235278cc4d9c80)"
    );

    let block1mesg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1624219079,"miner":"dionyziz","nonce":"0000000000000000000000000000000000000000000000000000002634878840","note":"The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage","previd":null,"txids":[],"type":"block"},"type":"object"}` + '\n';
    let block2msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650421857102,"miner":"grader","nonce":"d20e849d2e19dc7408b0c02d4dba5a1b3895839a4242660ae8ee18a5a97bcae7","note":"This block has a coinbase transaction","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["2aac601bb784c0de6fdbf47918c9928fb0505eda3174d5cc7790f9b7d27e1963"],"type":"block"},"type":"object"}` + '\n';
    let block3msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650433203255,"miner":"grader","nonce":"eab983d7bf941a212915b2155375e5ae308e23fe346155f8c8cb552c4ac98e51","note":"This block has another coinbase and spends earlier coinbase","previd":"00000002364806bfeafd0af08e88805ce14ea2e0222e0d3aaee3fe1809047482","txids":["1db7b7b6a0971aac14cc3a5114864c89c0455c2baebf3050760c30a24964cf7c","314e63a79f51450750282a02bc669d799781b222379930be635d7f2429c0fb36"],"type":"block"},"type":"object"}` + '\n';
    
    createNewClient([helloMsg]);
    createNewClient([helloMsg, block1mesg, block2msg, block3msg, chaintipMsg]);

}

async function test4(){
    console.log(
        "Test 4: Sends short block; expecting chaintip to not change (0000000196862be06c7175801855ed2886a97f1b2ac4d35c61235278cc4d9c80)"
    );

    let txnBlockMsg = `{"object":{"height":1,"outputs":[{"pubkey":"2564e783d664c41cee6cd044f53eb7a79f09866a7c66d47e1ac0747431e8ea7d","value":50000000000000}],"type":"transaction"},"type":"object"}` + '\n';


    let block1mesg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1624219079,"miner":"dionyziz","nonce":"0000000000000000000000000000000000000000000000000000002634878840","note":"The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage","previd":null,"txids":[],"type":"block"},"type":"object"}` + '\n';
    let block2msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650421857102,"miner":"grader","nonce":"d20e849d2e19dc7408b0c02d4dba5a1b3895839a4242660ae8ee18a5a97bcae7","note":"This block has a coinbase transaction","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["2aac601bb784c0de6fdbf47918c9928fb0505eda3174d5cc7790f9b7d27e1963"],"type":"block"},"type":"object"}` + '\n';
    let block3msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650433203255,"miner":"grader","nonce":"eab983d7bf941a212915b2155375e5ae308e23fe346155f8c8cb552c4ac98e51","note":"This block has another coinbase and spends earlier coinbase","previd":"00000002364806bfeafd0af08e88805ce14ea2e0222e0d3aaee3fe1809047482","txids":["1db7b7b6a0971aac14cc3a5114864c89c0455c2baebf3050760c30a24964cf7c","314e63a79f51450750282a02bc669d799781b222379930be635d7f2429c0fb36"],"type":"block"},"type":"object"}` + '\n';
    
    let blockshortmsg = `{"object":{"nonce": "c5ee71be4ca85b160d352923a84f86f44b7fc4fe60002214bc1236ceedc5c615", "T": "00000002af000000000000000000000000000000000000000000000000000000", "created": 1649827795114,"miner": "svatsan","note": "First block. Yayy, I have 50 bu now!!","previd": "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids": ["1bb37b637d07100cd26fc063dfd4c39a7931cc88dae3417871219715a5e374af"],"type": "block"},"type":"object"}` + '\n';
    let blockshorttxn = `{"object":{"type": "transaction", "height": 0, "outputs": [{"pubkey": "8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9","value": 50000000000}]},"type":"object"}` + '\n';
    createNewClient([helloMsg]);
    createNewClient([helloMsg, txnBlockMsg, chaintipMsg]);

}

async function test5(){
    console.log(
        "Test 5: Sends invalid height block; expecting invalid height error"
    );

    let blockinvalidheightmsg = `{"object":{"nonce": "c5ee71be4ca85b160d352923a84f86f44b7fc4fe60002214bc1236ceedc5c615", "T": "00000002af000000000000000000000000000000000000000000000000000000", "created": 1649827795114,"miner": "svatsan","note": "First block. Yayy, I have 50 bu now!!","previd": "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids": ["1bb37b637d07100cd26fc063dfd4c39a7931cc88dae3417871219715a5e374af"],"type": "block"},"type":"object"}` + '\n';
    let blockinvalidheighttxn = `{"object":{"type": "transaction", "height": 0, "outputs": [{"pubkey": "8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9","value": 50000000000}]},"type":"object"}` + '\n';
    createNewClient([helloMsg]);
    createNewClient([helloMsg, blockinvalidheighttxn, blockinvalidheightmsg, chaintipMsg]);
}


const testsArray = [test0];

async function tests() {
  console.log("------------------------------------------------");
  for (let test of testsArray) {
    await test();
    await timeout(5000);
    console.log("------------------------------------------------");
  }
}

console.log("Starting test client...");
tests();
