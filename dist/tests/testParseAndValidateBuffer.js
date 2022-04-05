"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const errors_1 = require("../errors");
const index_1 = require("../index");
const messages_1 = require("../messages");
const invalidVersionHelloMessage = JSON.stringify({
    "type": "hello",
    "agent": "Marabu-Core Client 0.8"
});
const noTypeMessage = JSON.stringify({
    "version": "0.8.0",
    "agent": "Marabu-Core Client 0.8"
});
const wrongTypeMessage = JSON.stringify({
    "type": "boo"
});
const incompleteRequiredKeysMessage = JSON.stringify({
    "type": "peers"
});
const garbageKeysMessage = JSON.stringify({
    "type": "getpeers",
    "peers": ["1", "2"]
});
describe("Test parseAndValidateBffer", () => {
    it("Should return the message back if everything is valid", () => {
        (0, chai_1.expect)(JSON.stringify((0, index_1.parseAndValidateBuffer)(messages_1.helloMessage))).to.equal(messages_1.helloMessage);
    });
    it("Should throw an error if no message type is specified", () => {
        (0, chai_1.expect)(() => (0, index_1.parseAndValidateBuffer)(noTypeMessage)).to.throw(errors_1.InvalidMessageError);
    });
    it("Should throw InvalidHelloError if hello message is errorneous", () => {
        (0, chai_1.expect)(() => (0, index_1.parseAndValidateBuffer)(invalidVersionHelloMessage)).to.throw(errors_1.InvalidHelloMessageError);
    });
    it("Should throw InvalidError if message has a type that doesn't exist", () => {
        (0, chai_1.expect)(() => (0, index_1.parseAndValidateBuffer)(wrongTypeMessage)).to.throw(errors_1.InvalidMessageError);
    });
    it("Should throw InvalidError if peer message does not have peers array (i.e. incomplete required keys)", () => {
        (0, chai_1.expect)(() => (0, index_1.parseAndValidateBuffer)(incompleteRequiredKeysMessage)).to.throw(errors_1.InvalidMessageError);
    });
    it("Should throw InvalidError if message contains garbage keys (e.g. getpeers has peers)", () => {
        (0, chai_1.expect)(() => (0, index_1.parseAndValidateBuffer)(garbageKeysMessage)).to.throw(errors_1.InvalidMessageError);
    });
});
