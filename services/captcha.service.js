const constants = require('../constants/constants');
const common = require('../utils/common');
const logger = require('../utils/logger');

exports.solveGeetestBy2Captcha = async (page) => {
    try{
        await page.waitForSelector('captcha-widget',{ timeout: 20000 });
    }catch{
        return true;
    }
    logger.info('Start solving geetest captcha with 2captcha...')
    const gtValue = await page.$eval('captcha-widget', (element) => element.getAttribute('data-gt'));
    const challengeValue = await page.$eval('captcha-widget', (element) => element.getAttribute('data-challenge'));
    const apiKey = constants.API_2CAPTCHA_TOKEN;
    const inputConfig = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `http://2captcha.com/in.php?key=${apiKey}&method=geetest&gt=${gtValue}&challenge=${challengeValue}&api_server=http://api.geetest.com&pageurl=${page.url()}&json=1&proxytype=HTTP&soft_id=2834`,
        headers: {}
    };
    let inputResponse = await common.fetchData(inputConfig);
    if (!inputResponse.data || inputResponse.data.status !== 1) {
        return false;
    }
    const outputConfig = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${inputResponse.data.request}&json=1`,
        headers: {}
    };
    let outputResponse = await common.fetchData(outputConfig);
    let countRetry = 0;
    while (!outputResponse.data || outputResponse.data.status !== 1) {
        if (countRetry > 20 || (outputResponse.data && outputResponse.data.request === constants.ERROR_CAPTCHA_UNSOLVABLE)) {
            return false;
        }
        await common.sleep(5000)
        outputResponse = await common.fetchData(outputConfig);
        countRetry++;
    }
    if (!outputResponse.data) {
        return false;
    }
    await page.evaluate((result) => {
        captchaObj.getValidate = () => {
            return result;
        };
        captchaObjEvents.onSuccessCallback()
    }, outputResponse.data.request);
    await page.waitForTimeout(5000);
    logger.info('Captcha is solved')
    return true;
};