var Config = {

    default: {
        isPluginEnabled: true,
        apiKey: '65d8116cfde0671f20c22b26482815b2',
        valute: "USD",
        email: null,
        autoSubmitForms: false,
        submitFormsDelay: 0,
        enabledForNormal: false,
        enabledForRecaptchaV2: false,
        enabledForInvisibleRecaptchaV2: false,
        enabledForRecaptchaV3: false,
        enabledForHCaptcha: false,
        enabledForGeetest: true,
        enabledForGeetest_v4: true,
        enabledForKeycaptcha: false,
        enabledForArkoselabs: false,
        enabledForLemin: false,
        enabledForYandex: false,
        enabledForCapyPuzzle: false,
        enabledForAmazonWaf: false,
        enabledForTurnstile: false,
        autoSolveNormal: false,
        autoSolveRecaptchaV2: false,
        autoSolveInvisibleRecaptchaV2: false,
        autoSolveRecaptchaV3: false,
        recaptchaV3MinScore: 0.5,
        autoSolveHCaptcha: false,
        autoSolveGeetest: false,
        autoSolveKeycaptcha: false,
        autoSolveArkoselabs: false,
        autoSolveGeetest_v4: false,
        autoSolveLemin: false,
        autoSolveYandex: false,
        autoSolveCapyPuzzle: false,
        autoSolveAmazonWaf: false,
        autoSolveTurnstile: false,
        repeatOnErrorTimes: 0,
        repeatOnErrorDelay: 0,
        buttonPosition: 'inner',
        useProxy: false,
        proxytype: "HTTP",
        proxy: "",
        blackListDomain: "example.com\n2captcha.com/auth\nrucaptcha.com/auth",
        normalSources: [],
        autoSubmitRules: [{
            url_pattern: "(2|ru)captcha.com/demo",
            code: "" +
                '{"type":"source","value":"document"}' + "\n" +
                '{"type":"method","value":"querySelector","args":["button[type=submit]"]}' + "\n" +
                '{"type":"method","value":"click"}',
        }],
    },

    get: async function (key) {
        let config = await this.getAll();
        return config[key];
    },

    getAll: function () {
        return new Promise(function (resolve, reject) {
            chrome.storage.local.get('config', function (result) {
                resolve(Config.joinObjects(Config.default, result.config));
            });
        });
    },

    set: function (newData) {
        return new Promise(function (resolve, reject) {
            Config.getAll()
                .then(data => {
                    chrome.storage.local.set({
                        config: Config.joinObjects(data, newData)
                    }, function (config) {
                        resolve(config);
                    });
                });
        });
    },

    joinObjects: function (obj1, obj2) {
        let res = {};
        for (let key in obj1) res[key] = obj1[key];
        for (let key in obj2) res[key] = obj2[key];
        return res;
    },

};
