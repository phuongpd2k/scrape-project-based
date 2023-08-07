const redisClient = require('../config/redisClient');
const logger = require('../utils/logger');
const constants = require('../constants/constants');
const common = require('../utils/common');

exports.saveAuthCookie = async (keyIndex, value) => {
    const currentTime = common.getCurrentTime();
    const redisKey = constants.COOKIE_AUTH_KEY.replace('INDEX', keyIndex);
    const redisValue = JSON.stringify({
        token: value,
        ts: currentTime
    });
    await redisClient.set(redisKey, redisValue);
    logger.info(`Save cookie auth index ${keyIndex} to redis success`);
    await this.removeCookieExpired(keyIndex);
}
exports.getCookieExpired = async () => {
    const redisValue = await redisClient.get(constants.COOKIE_EXPIRED_KEY);
    const redisJson = await JSON.parse(redisValue);
    return redisJson === null ? undefined : redisJson;
}

exports.pushCookieExpired = async (index) => {
    let arr = await this.getCookieExpired();
    if (arr === undefined) {
        arr = new Array();
        arr.push(index);
    } else if (!arr.includes(index)) {
        arr.push(index);
    } else {
        return;
    }
    await redisClient.set(constants.COOKIE_EXPIRED_KEY, JSON.stringify(arr));
    logger.info(`Push cookie ${index} into array expired-cookie`)
}
exports.removeCookieExpired = async (index) => {
    const arr = await this.getCookieExpired();
    if (arr === undefined) {
        return
    } else if (arr.includes(index)) {
        const indexOfList = arr.indexOf(index);
        if (indexOfList > -1) {
            arr.splice(indexOfList, 1);
        }
    } else {
        return;
    }
    await redisClient.set(constants.COOKIE_EXPIRED_KEY, JSON.stringify(arr));
}

exports.getCookieIndex = async() => {
    const allNumbers =  common.initArrayFrom1ToN(constants.COOKIE_MAX_INDEX_KEY);
    const arrExpiredCookie = await this.getCookieExpired();
    if(arrExpiredCookie === undefined){
        return Math.floor(Math.random() * allNumbers.length)+1;
    }
    // Calculate the available numbers by excluding the provided numbers
    const availableNumbers = allNumbers.filter(number => !arrExpiredCookie.includes(number));
    if (availableNumbers.length === 0) {
        // Handle the case when all numbers are excluded
        return -1;
    }
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    return availableNumbers[randomIndex];
}
exports.getCookieByIndex = async (cookieIndex) => {
    const redisValue = await redisClient.get(`${constants.COOKIE_AUTH_KEY}`.replace('INDEX', cookieIndex));
    const redisJson = await JSON.parse(redisValue);
    return redisJson === null ? undefined : redisJson.token;
}