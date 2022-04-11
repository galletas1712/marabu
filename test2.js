"use strict";
exports.__esModule = true;
var objectmanager_1 = require("./src/objectmanager");
var level_ts_1 = require("level-ts");
function testGetObjectID() {
    var dummyBD = new level_ts_1["default"]('./testDB');
    var obm = new objectmanager_1.ObjectManager(dummyBD);
    var genesisID = obm.getObjectID({ "T": "00000002af000000000000000000000000000000000000000000000000000000", "created": 1624219079, "miner": "dionyziz", "nonce": "0000000000000000000000000000000000000000000000000000002634878840", "note": "The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage", "previd": null, "txids": [], "type": "block" });
    var realGenesisID = '00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e';
    console.log(genesisID);
    console.log(realGenesisID);
    console.assert(genesisID === realGenesisID);
}
testGetObjectID();
