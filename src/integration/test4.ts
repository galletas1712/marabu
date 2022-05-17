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


async function sendTxnNeeded(){
    let obj1 = `{"object":{"height":1,"outputs":[{"pubkey":"e3b1f3cd0b79e9ec9c4adcb38ac147c14bfb4184941af70ab6debefcb752445f","value":50000000000000}],"type":"transaction"},"type":"object"}` + '\n';
    let obj2 = `{"object":{"height":2,"outputs":[{"pubkey":"e3b1f3cd0b79e9ec9c4adcb38ac147c14bfb4184941af70ab6debefcb752445f","value":60000000000000}],"type":"transaction"},"type":"object"}` + '\n';
    let obj3 = `{"object":{"height":3,"outputs":[{"pubkey":"e3b1f3cd0b79e9ec9c4adcb38ac147c14bfb4184941af70ab6debefcb752445f","value":80000000000000}],"type":"transaction"},"type":"object"}` + '\n';
    let tx1 = `{"object":{"inputs":[{"outpoint":{"index":0,"txid":"8f75e875d371a0970602550cf0da63dc07ce05331929c2b46f080582cce42dfb"},"sig":"a589fae78880c015e0d30b176fca6461ff1a8a0932031d9e0256f7879878dd344d0a2b4365d5a71dfad51b1985afc44c54c894c6d3013102f91264854e5b9d00"}],"outputs":[{"pubkey":"e3b1f3cd0b79e9ec9c4adcb38ac147c14bfb4184941af70ab6debefcb752445f","value":40000000000000}],"type":"transaction"},"type":"object"}` + '\n';
    let tx2 = `{"object":{"inputs":[{"outpoint":{"index":0,"txid":"bee2e10d1e415525d4ff1756ecb88f9579c58de7560020ecfb5fd7cd8abced12"},"sig":"3a4f921b20138275de88f9d621246aa6dc8bc3f17eafebb4373301aab8ee93e688a34e497f9ced702c1e9ac73a83054f1f1a130cdf8b76472e0164bb9e175a0b"}],"outputs":[{"pubkey":"e3b1f3cd0b79e9ec9c4adcb38ac147c14bfb4184941af70ab6debefcb752445f","value":30000000000000}],"type":"transaction"},"type":"object"}` + '\n';
    let obj4 = `{"object":{"height":1,"outputs":[{"pubkey":"d955ceeb458058b5e544de996543d08aff42ff01b386e6439c0a427488785bf5","value":50000000000000}],"type":"transaction"},"type":"object"}` + '\n';
    let obj5 = `{"object":{"height":2,"outputs":[{"pubkey":"d955ceeb458058b5e544de996543d08aff42ff01b386e6439c0a427488785bf5","value":50000000000000}],"type":"transaction"},"type":"object"}` + '\n';
    let obj6 = `{"object":{"height":4,"outputs":[{"pubkey":"d955ceeb458058b5e544de996543d08aff42ff01b386e6439c0a427488785bf5","value":50000000000000}],"type":"transaction"},"type":"object"}` + '\n';

    createNewClient([helloMsg, obj1, obj2, obj3, tx1, tx2, obj4, obj5, obj6]);
}

async function testStaff1(){
    console.log(
        "Test Staff 1: Expecting Invalid Coinbase"
    );
    let block1 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1652763875,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000002fa207e","note":"First block","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["1afc7e763bd235919405a04fff70e2e0fcdabfdfa933102b93e8bd8666179b69"],"type":"block"},"type":"object"}` + '\n';
    let block2 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1652763890,"miner":"grader","nonce":"000000000000000000000000000000000000000000000000000000000350e963","note":"Second block","previd":"00000000fc0460609d50414768b9f891e007b13e38f09d4074ff283ef6b88f74","txids":["185e8e44563747ceaa7f8f14c627631aaa4829ea1b8ffbf39a365f49114e6334"],"type":"block"},"type":"object"}` + '\n';
    let block3 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1652763907,"miner":"grader","nonce":"00000000000000000000000000000000000000000000000000000000c1dd9580","note":"Third block","previd":"00000001a5b4c41f0f176d63e9dd0f3179dda475089fea8f4f2277c27052037f","txids":["e38fc71a0d04e985a4f4d16e37aa8a151e06c93710a31fb127794b3a8700422e"],"type":"block"},"type":"object"}` + '\n';
    
    createNewClient([helloMsg, block1, block2, block3])
}

async function testStaff2(){
    console.log(
        "Test Staff 2: Expecting Non-increasing timestamp"
    );
    let block1 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1652765373,"miner":"grader","nonce":"000000000000000000000000000000000000000000000000000000002e2dcd5a","note":"First block","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["8f75e875d371a0970602550cf0da63dc07ce05331929c2b46f080582cce42dfb"],"type":"block"},"type":"object"}` + '\n';
    let block2 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1652765373,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000001187622","note":"Second block","previd":"000000021b3ea6efe336d968b9ee7143dc7e80280b582a13fa45fcb7f5cc6e29","txids":["bee2e10d1e415525d4ff1756ecb88f9579c58de7560020ecfb5fd7cd8abced12","20ec9aecf9cd3603b037414b8d5cf72ece7df4dc88d0beef4f8add2569c2b78c"],"type":"block"},"type":"object"}` + '\n';
    let block3 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1652765373,"miner":"grader","nonce":"000000000000000000000000000000000000000000000000000000019066a58e","note":"Third block","previd":"000000026537a79d27665ac3f8cb9bfd446866781b6043e0e7f7e016e4060daf","txids":["1c3c877640c81a0b9a9baccadeb4bff674ea520ecb9e5a1945bf22f7c0e0399a","84a53fe7b6f3d51e10940abe99c2621b3aee18e2ea9fbec3a50f7068f7932018"],"type":"block"},"type":"object"}` + '\n';
    
    createNewClient([helloMsg, block1, block2, block3])
}

async function testStaff3(){
    console.log(
        "Test Staff 3: Expecting Future Timestamps"
    );
    let block1 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1652811200,"miner":"grader","nonce":"000000000000000000000000000000000000000000000000000000004068b034","note":"First block","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["8f75e875d371a0970602550cf0da63dc07ce05331929c2b46f080582cce42dfb"],"type":"block"},"type":"object"}` + '\n';
    let block2 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1652811557,"miner":"grader","nonce":"000000000000000000000000000000000000000000000000000000007d953bbf","note":"Second block","previd":"000000022ba6f209982e3c06750355c1145170165c6e568df5e1c07b760aaa40","txids":["bee2e10d1e415525d4ff1756ecb88f9579c58de7560020ecfb5fd7cd8abced12","20ec9aecf9cd3603b037414b8d5cf72ece7df4dc88d0beef4f8add2569c2b78c"],"type":"block"},"type":"object"}` + '\n';
    let block3 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":9950650399,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000000f72837","note":"Third block","previd":"000000019c2abb91d400192d9e3893ceb91a11b9e2ce631889ab18224f61fb77","txids":["1c3c877640c81a0b9a9baccadeb4bff674ea520ecb9e5a1945bf22f7c0e0399a","84a53fe7b6f3d51e10940abe99c2621b3aee18e2ea9fbec3a50f7068f7932018"],"type":"block"},"type":"object"}` + '\n';
    
    createNewClient([helloMsg, block1, block2, block3])
}


async function testStaff4(){
    console.log(
        "Test Staff 4: Expecting Incorrect Genesis"
    );
    let block1 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1652815651,"miner":"grader","nonce":"00000000000000000000000000000000000000000000000000000000285de90c","note":"Incorrect genesis","previd":null,"txids":[],"type":"block"},"type":"object"}` + '\n';
    let block2 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1652815834,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000058d875c1","note":"First block","previd":"000000029817ed79954f155c02163babe677b7a5115293f82887024f4ba648ba","txids":[],"type":"block"},"type":"object"}` + '\n';
    let block3 = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1652816236,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000013450c8b","note":"Second block","previd":"000000026c655cdc4e9c7ccd91486b7c3400380085304cb893bfb17475841d46","txids":[],"type":"block"},"type":"object"}` + '\n';
    
    createNewClient([helloMsg, block1, block2, block3])
}


const testsArray = [sendTxnNeeded, testStaff1, testStaff2, testStaff3, testStaff4];

//const testsArray = [test0, test1, test2, test3, test4, test5, sendTxnNeeded, testStaff1, testStaff2, testStaff3, testStaff4];

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
