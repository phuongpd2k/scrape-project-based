const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const UserAgent = require("user-agents");
const redisService = require('../services/redis.service');
const captchaService = require('../services/captcha.service');
const logger = require('../utils/logger')
const common = require('../utils/common')
const pathToExtension = require('path').join(__dirname, './2captcha-solver');
const constant = require('../constants/constants')
puppeteer.use(StealthPlugin())

exports.process = async () => {
	let index = 1;
	const maxIndex = 5;

	while (true) {
		const arrExpiredCookie = await redisService.getCookieExpired();
		if (arrExpiredCookie && arrExpiredCookie.length > 0) {
			arrExpiredCookie.sort();
			index = arrExpiredCookie[0];
		}
		logger.info(`Start crawl cookie with index ${index}`);
		const cookie = await crawlCookie();
		if (cookie) {
			await redisService.saveAuthCookie(index, cookie);
			index = index === maxIndex ? 1 : index + 1;
		}
	}
};

async function crawlCookie() {
	const userAgent = new UserAgent({
		deviceCategory: "desktop",
		platform: "Linux x86_64",
	});
	const randomUserSession = await generateRandomString(5);
	const browser = await puppeteer.launch({
		timeout: 60000,
		headless: 'new',
		userAgent: userAgent,
		args: [
			`--proxy-server=http://${constant.PROXY_HOST}:${constant.PROXY_PORT}`,
			'--no-sandbox',
			'--disable-gpu',
			'--disable-dev-shm-usage',
			`--disable-extensions-except=${pathToExtension}`,
			`--load-extension=${pathToExtension}`,
		]
	});
	try {
		const page = await browser.newPage();
		const username = constant.PROXY_USER.replace('[SESSION_ID]',randomUserSession)
		await page.authenticate({ username: username, password: constant.PROXY_PASSWORD });
		await page.setRequestInterception(true);
		page.on('request', request => {
			if (request.resourceType() === 'image') {
				request.abort();
			} else {
				if (!request.url().includes('thaiairways.com')) {
					request.abort();
				} else {
					request.continue();
				}
			}
		});
		await page.goto('https://www.thaiairways.com/en_US/index.page', { waitUntil: 'networkidle0' });
		await page.waitForXPath('//form[@id="booking-form"]');	
		// const btnAcceptCookie = await page.waitForSelector('#onetrust-accept-btn-handler');
		// if (btnAcceptCookie) {
		// 	await btnAcceptCookie.click();
		// } else {
		// 	console.log('Button choose English not found.');
		// 	return
		// }	
		const twoWeekLater = common.getTwoWeekLater('DD MMM YYYY');
		await page.evaluate((twoWeekLater) => {
			var from = 'Hanoi - Vietnam [HAN]';
			var fromCode = from
				.substring(from.indexOf("[") + 1, from.indexOf("]"))
				.toLowerCase();
			var arr = ["rom", "mil"];
			var arr2 = ["fco", "mxp"];
			for (var a = 0; a < arr.length; a++) {
				if (fromCode == arr[a]) {
					fromCode = arr2[a];
				}
			}
			if (from.indexOf("[") == -1 || from.indexOf("]") == -1 || fromCode == "") {
				alert(
					"Departure city code is not correct. Please enter proper departure city",
					"#from"
				);
				document.getElementById("from");
				return false;
			}
			var to = 'Singapore - Singapore [SIN]';
			var toCode = to.substring(to.indexOf("[") + 1, to.indexOf("]")).toLowerCase();
			for (var b = 0; b < arr.length; b++) {
				if (toCode == arr[b]) {
					toCode = arr2[b];
				}
			}
			if (to.indexOf("[") == -1 || to.indexOf("]") == -1 || toCode == "") {
				alert(
					"Destination city code is not correct. Please enter proper destination city",
					"#to"
				);
				document.getElementById("to");
				return false;
			}

			var route = fromCode.trim().toUpperCase() + "-" + toCode.trim().toUpperCase();

			var departDate = twoWeekLater
			var returnDate = document.getElementById("ReturnDate").value;

			if (departDate.length == 10) departDate = "0" + departDate;
			if (returnDate.length == 10) returnDate = "0" + returnDate;

			var traveltype = 'O';
			var adultNo = 1

			var youthNo = 0;

			var childrenNo = 1

			var infantNo = 1

			var classTypes = 'PE'
			var urlStrArray = window.location.pathname.split("/");
			var siteName = urlStrArray[1];
			if (siteName == "en") {
				var siteName_country = "en";
			} else {
				var siteName_country = siteName.split("_")[1];
			}
			var ex9_val = get_ex9(siteName_country);
			var userAgent = navigator.userAgent.toLowerCase();
			const isTablet =
				/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(
					userAgent
				);

			var width = $(window).width();
			var is_mobile = "false";
			if (width <= 760 || isTablet) {
				is_mobile = "true";
			}

			var lang = "GB";
			if (
				window.location.href.indexOf("thaiairways.es") > -1 ||
				window.location.href.indexOf("es_ES") > -1
			) {
				lang = "ES";
			} else if (
				window.location.href.indexOf("thaiair.de") > -1 ||
				window.location.href.indexOf("de_DE") > -1 ||
				window.location.href.indexOf("de_AT") > -1
			) {
				lang = "DE";
			} else if (
				window.location.href.indexOf("thaiairways.fr") > -1 ||
				window.location.href.indexOf("fr_FR") > -1
			) {
				lang = "FR";
			} else if (
				window.location.href.indexOf("thaiairways.fr") > -1 ||
				window.location.href.indexOf("fr_FR") > -1
			) {
				lang = "FR";
			} else if (
				window.location.href.indexOf("thaiairways.com.tw") > -1 ||
				window.location.href.indexOf("zh_TW") > -1
			) {
				lang = "TW";
			} else if (
				window.location.href.indexOf("thaiairways.co.it") > -1 ||
				window.location.href.indexOf("it_IT") > -1
			) {
				lang = "IT";
			} else if (window.location.href.indexOf("th_TH") > -1) {

				lang = "TH";
			} else if (window.location.href.indexOf("ru_RU") > -1) {
				lang = "RU";
			} else if (window.location.href.indexOf("sv_SE") > -1) {
				lang = "SE";
			} else if (window.location.href.indexOf("ar_AE") > -1) {
				lang = "IT";
			} else if (window.location.href.indexOf("zh_CN") > -1) {
				lang = "CN";
			} else if (window.location.href.indexOf("zh_HK") > -1) {
				lang = "TW";
			} else if (window.location.href.indexOf("ja_JP") > -1) {
				lang = "JP";
			} else if (window.location.href.indexOf("ko_KR") > -1) {
				lang = "KO";
			}

			//Check promo code
			var totalSeat =
				parseInt(adultNo) +
				parseInt(youthNo) +
				parseInt(childrenNo) +
				parseInt(infantNo);
			var promoCode = $("#Promo_Code").val();

			// for web singapore check promo code
			if (promoCode.toUpperCase() === "TGTATEY30") {
				if (window.location.href.indexOf("en_SG") > -1) {
					if (parseInt(childrenNo) > 0 || parseInt(infantNo) > 0) {
						alert(
							`This campaign doesn't apply to Child and Infant.`,
							"#Promo_Code"
						);
						document.getElementById("Promo_Code");
						return false;
					}
				}
			}

			if (promoCode) {
				var urlStrArray = window.location.pathname.split("/");
				var siteName = urlStrArray[1];

				$.ajax({
					type: "POST",
					url: "/app/bookingbox/api/find_promocode_new",
					data: {
						promo_code: promoCode.toUpperCase(),
						from_city: fromCode.toUpperCase(),
						to_city: toCode.toUpperCase(),
						depart_date: departDate,
						return_date: returnDate,
						total_seat: totalSeat,
						class_type: classTypes,
						traveltype: traveltype,
						adultNo: adultNo,
						youthNo: youthNo,
						childrenNo: childrenNo,
						infantNo: infantNo,
						ex9: ex9_val,
						is_mobile: is_mobile,
						lang: lang,
						site: siteName,
					},
					dataType: "json",
					encode: true,
				})
					.done(function (d) {
						if (d.success) {
							var form_html = atob(d.data);
							//form_html = form_html.replace("extenal_id","external_id");
							$(form_html).appendTo("body").submit();
						} else {
							alert(d.message);
							return CheckOK(
								fromCode,
								toCode,
								traveltype,
								departDate,
								returnDate,
								classTypes,
								adultNo,
								youthNo,
								childrenNo,
								infantNo,
								"",
								"",
								"",
								"",
								"",
								"",
								""
							);
						}
					})
					.error(function (e) {
						return CheckOK(
							fromCode,
							toCode,
							traveltype,
							departDate,
							returnDate,
							classTypes,
							adultNo,
							youthNo,
							childrenNo,
							infantNo,
							"",
							"",
							"",
							"",
							"",
							"",
							""
						);
					});
			} else {
				return CheckOK(
					fromCode,
					toCode,
					traveltype,
					departDate,
					returnDate,
					classTypes,
					adultNo,
					youthNo,
					childrenNo,
					infantNo,
					"",
					"",
					"",
					"",
					"",
					"",
					""
				);
			}
		},twoWeekLater)
		const buttonConfirm = await page.waitForXPath('//button[contains(text(), "I understand")]');
		if (buttonConfirm) {
			await buttonConfirm.click();
		} else {
			console.log('Button confirm not found.');
			return
		}
		await page.waitForTimeout(10000)
		const countPages = await browser.pages();
		const resultPage = countPages[countPages.length - 1];
		const isSolved = await captchaService.solveGeetestBy2Captcha(resultPage);
		if (isSolved) {
			return {
				cookie: await getCookie(resultPage),
				sessionId: randomUserSession
			};
		} else {
			logger.error('Cannot solve captcha')
		}
	} catch (error) {
		logger.error(`An error occurred saveCookie: ` + error.message);
	} finally {
		await browser.close();
	}
}
async function getCookie(page) {
	let result = '';
	const cookies = await page.cookies();
	cookies.forEach((cookie) => {
		if(cookie['name'] === 'JSESSIONID')
			return;
		if (cookie['domain'] !== '.www.thaiairways.com') {
			if (result === '') {
				result = cookie['name'] + '=' + cookie['value'];
			} else {
				result += ';' + cookie['name'] + '=' + cookie['value'];
			}
		}
	})
	return result;
};
async function generateRandomString(length) {
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;

	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}

	return result;
}