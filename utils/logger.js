const fs = require('fs');
const path = require('path');
const enum_ = require('./enum');
const dateTimeUtils = require('./common');

const logsDir = path.join(__dirname, '../../logs');

exports.success = (msg) => {
    writeLog(enum_.GREEN_LOG, 'SUCCESS', msg);
};

exports.info = (msg) => {
    writeLog(enum_.CYAN_LOG, 'INFO', msg);
};

exports.warning = (msg) => {
    writeLog(enum_.YELLOW_LOG,'WARN', msg);
};

exports.error = (msg) => {
    writeLog(enum_.RED_LOG,'ERROR', msg);
};

function writeLog(color,logLevel , msg) {
    const currentDate = new Date();
    const logFilePath = path.join(logsDir, getLogFileName(currentDate));
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
    }
    const logEntry = `[${logLevel}] ${dateTimeUtils.getCurrentTime()}: ${msg}`;
    fs.appendFile(logFilePath, logEntry+'\n', (err) => {
        if (err) {
            console.error('Failed to write log:', err);
        }
    });
    console.log(color,logEntry);
}

function getLogFileName(date) {
    const year = date.getFullYear();
    const month = padNumber(date.getMonth() + 1);
    const day = padNumber(date.getDate());
    const hour = padNumber(date.getHours());

    return `${year}-${month}-${day}-${hour}.log`;
}

function padNumber(number) {
    return number.toString().padStart(2, '0');
}