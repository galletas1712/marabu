"use strict";
exports.__esModule = true;
exports.logger = void 0;
var winston = require("winston");
exports.logger = winston.createLogger({
    level: "debug",
    format: winston.format.simple(),
    transports: new winston.transports.Console()
});
