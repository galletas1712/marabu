"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidHelloMessageError = exports.InvalidMessageError = void 0;
class InvalidMessageError extends Error {
    constructor(msg) {
        if (typeof (msg) !== undefined) {
            super(msg);
        }
        else {
            super("Message is in an invalid format");
        }
    }
}
exports.InvalidMessageError = InvalidMessageError;
class InvalidHelloMessageError extends InvalidMessageError {
    constructor(msg) {
        if (typeof (msg) !== undefined) {
            super(msg);
        }
        else {
            super("Hello message is in an invalid format");
        }
    }
}
exports.InvalidHelloMessageError = InvalidHelloMessageError;
