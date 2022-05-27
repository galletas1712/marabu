import * as winston from "winston";

const logFormat = winston.format.printf(function(info) {
  return `${info.level}: ${info.message}`;
});

export const logger = winston.createLogger({
  level: "debug",
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat)
    })
  ]
});
