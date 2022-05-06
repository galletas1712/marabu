import { getObjectID, ObjectManager } from "../objectmanager";
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

async function test1() {
  console.log(
    "Test 1: Sends and requests a regular transaction block"
  );
  console.log("Expecting: block containing transactions that were sent");

  let txnBlockMsg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1624219079,"miner":"dionyziz","nonce":"0000000000000000000000000000000000000000000000000000002634878840","note":"The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage","previd":null,"txids":[],"type":"block"},"type":"object"}` + '\n';

  let getBlockMsg = `{"objectid":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","type":"getobject"}` + '\n'
  createNewClient([helloMsg, txnBlockMsg, getBlockMsg]);
}

async function test2(){
    console.log(
        "Test 2: sends and requests a coinbase block"
    )

    console.log("Expecting: block containing transactions that were sent");
    console.log("Also -- if new database, node sends a request asking for transactions?")

    let txnBlockMsg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650421857102,"miner":"grader","nonce":"d20e849d2e19dc7408b0c02d4dba5a1b3895839a4242660ae8ee18a5a97bcae7","note":"This block has a coinbase transaction","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["2aac601bb784c0de6fdbf47918c9928fb0505eda3174d5cc7790f9b7d27e1963"],"type":"block"},"type":"object"}` + '\n';
    
    let getBlockMsg = `{"objectid":"00000002364806bfeafd0af08e88805ce14ea2e0222e0d3aaee3fe1809047482","type":"getobject"}` + '\n';

    createNewClient([helloMsg, txnBlockMsg, getBlockMsg]);

}

async function test3(){
    console.log(
        "Test 3: also sends and requests a coinbase block"
    )

    console.log("Expecting: block containing transactions that were sent");

    let txnBlockMsg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650433203255,"miner":"grader","nonce":"eab983d7bf941a212915b2155375e5ae308e23fe346155f8c8cb552c4ac98e51","note":"This block has another coinbase and spends earlier coinbase","previd":"00000002364806bfeafd0af08e88805ce14ea2e0222e0d3aaee3fe1809047482","txids":["1db7b7b6a0971aac14cc3a5114864c89c0455c2baebf3050760c30a24964cf7c","314e63a79f51450750282a02bc669d799781b222379930be635d7f2429c0fb36"],"type":"block"},"type":"object"}` + '\n';
    
    let getBlockMsg = `{"objectid":"0000000196862be06c7175801855ed2886a97f1b2ac4d35c61235278cc4d9c80","type":"getobject"}` + '\n';

    createNewClient([helloMsg, txnBlockMsg, getBlockMsg]);

}

async function test4(){
    console.log("Test 4: Send error message and do not gossip block with invalid transactions.");
    console.log("Expecting: error message from first client, and no gossipped blocks on client 2");

    let txnBlockMsg = `{"object":{"T":"f000000000000000000000000000000000000000000000000000000000000000","created":0,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000000000000","note":"Block with incorrect target","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":[],"type":"block"},"type":"object"}` + '\n';

    createNewClient([helloMsg]);
    createNewClient([helloMsg, txnBlockMsg]);


}

async function test5(){
    console.log("Test 5: Send error message and do not gossip block with invalid transactions.");
    console.log("Expecting: error message from first client, and no gossipped blocks on client 2");

    let txnBlockMsg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":0,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000000000000","note":"Block with invalid PoW","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":[],"type":"block"},"type":"object"}` + '\n';
    createNewClient([helloMsg]);
    createNewClient([helloMsg, txnBlockMsg]);
}


async function test6(){
    console.log("Test 6: Send error message and do not gossip block with invalid transactions.");
    console.log("Expecting: error message from first client, and no gossipped blocks on client 2");

    let txnBlockMsg = ` {"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650360325883,"miner":"grader","nonce":"b55afc8030628c46e7dff949daeee10a492b9c54ad3835967f82bff5f01bc565","note":"First block ","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["6ae846ec1a8c0422ed939f9a64b25093eaf9cb5348ac1365bd9e0b927d710019"],"type":"block"},"type":"object"}` + '\n';
    
    let txnBlockMsg2 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650374139735,"miner":"grader","nonce":"0a617bf859c8d439c6c67e2758b28a16d2ef013b0594c877fa7a03573d49517a","note":"Law of conservation is violated","previd":"000000016bcb1ff93e5926c9f39e9709ddc537813580d426c332180357bb2faf","txids":["a80b8eeceb87ef7f748bea64653e7f2e95e98915795ad96a8001500b99dd4034","c1a4da505aee98180c3aca1495a3f06840b99ac644311d3998f41c5699c96900"],"type":"block"},"type":"object"}` + '\n';
    createNewClient([helloMsg]);
    createNewClient([helloMsg, txnBlockMsg, txnBlockMsg2]);

}

async function test7(){
    console.log("Test 7: Send error message and do not gossip block with invalid transactions.");
    console.log("Expecting: error message from first client, and no gossipped blocks on client 2");

    let txnBlockMsg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650348668065,"miner":"grader","nonce":"0f7f45ae349d078a53ff585d5a799948e08667acf63c8d6188e8d1a7abaa0e55","note":"Invalid transaction","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["6ae846ec1a8c0422ed939f9a64b25093eaf9cb5348ac1365bd9e0b927d710019","ff534ea7bc01239d7b5b5118fefee2e981147745237e9e75f64b8d563979927b"],"type":"block"},"type":"object"}` + '\n';
    createNewClient([helloMsg]);
    createNewClient([helloMsg, txnBlockMsg]);

}


async function test8(){
    console.log("Test 8: Send error message and do not gossip block with invalid transactions.");
    console.log("Expecting: error message from first client, and no gossipped blocks on client 2");

    let txnBlockMsg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650421590750,"miner":"grader","nonce":"104069820c2eab27b8ffe14fb9cb52ed97ee1257acd7971f3b4be864622a4586","note":"Two coinbase transactions","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["6ae846ec1a8c0422ed939f9a64b25093eaf9cb5348ac1365bd9e0b927d710019","6ae846ec1a8c0422ed939f9a64b25093eaf9cb5348ac1365bd9e0b927d710019"],"type":"block"},"type":"object"}` + '\n';
    
    createNewClient([helloMsg]);
    createNewClient([helloMsg, txnBlockMsg]);
}


async function test9(){
    console.log("Test 9: Send error message and do not gossip block with invalid transactions.");
    console.log("Expecting: error message from first client, and no gossipped blocks on client 2");
    console.log("First message is fine; second isn't")

    let txnBlockMsg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650429488757,"miner":"grader","nonce":"b03e884410b399d5e741a406a563247987f6b481ccfaf888cf1da1bc8652f13d","note":"This block has a coinbase transaction","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["48c2ae2fbb4dead4bcc5801f6eaa9a350123a43750d22d05c53802b69c7cd9fb"],"type":"block"},"type":"object"}` + '\n';
    
    let txnBlockMsg2 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650443872692,"miner":"grader","nonce":"3bb79b0f01194f3fc93c1ad5ae581255290928382d43c310de23061187cfb3b9","note":"This block spends coinbase transaction twice","previd":"000000001b4a28cba15006342f40004aba3038c9d04489ffd0f6454eed80fad1","txids":["d33ac384ea704025a6cac53f669c8e924eff7205b0cd0d6a231f0881b6265a8e","b00a4ef2e9a9985700d9b31f84e18b56fdcd7d824e450b276031e53d20a441fe"],"type":"block"},"type":"object"}` + `\n`;
    createNewClient([helloMsg]);
    createNewClient([helloMsg, txnBlockMsg, txnBlockMsg2]);

}


async function test10(){
    console.log("Test 10: Send error message and do not gossip block with invalid transactions.");
    console.log("Expecting: error message from first client, and no gossipped blocks on client 2");
    console.log("First message is fine; second isn't")

    let txnBlockMsg = `{"object":{"height":1,"outputs":[{"pubkey":"2564e783d664c41cee6cd044f53eb7a79f09866a7c66d47e1ac0747431e8ea7d","value":50000000000000}],"type":"transaction"},"type":"object"}` + '\n';
    
    let txnBlockMsg2 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1650416900867,"miner":"grader","nonce":"f17f634c8662a18c7f74b36ebbdded2210e66eb07b9c7b47e38e5ab47be7aa88","note":"This block spends a coinbase transaction not in its prev blocks","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["869676c06de441f83e7437db7ad0804bb5b2342f12dd9bbd12ee562d1486f7aa"],"type":"block"},"type":"object"}` + `\n`;
    createNewClient([helloMsg]);
    createNewClient([helloMsg, txnBlockMsg, txnBlockMsg2]);

}



const testsArray = [test1, test2, test3, test4, test5, test6, test7, test8, test9, test10];

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
