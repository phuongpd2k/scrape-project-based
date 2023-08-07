const redisService = require('../services/redis.service');
const Flight = require('../model/response/flight.dto.js');
const Response = require('../model/response/response.dto.js');
const common = require('../utils/common');
const logger = require('../utils/logger');
const qs = require('qs');
const constant = require('../constants/constants')
exports.process = async (req, res) => {
    const flightInfo = await getOnewayFareFlight(req);
    return res.status(200).json(flightInfo);
}
async function getOnewayFareFlight(req) {
    const cookieIndex = await redisService.getCookieIndex();
    if (cookieIndex === -1) {
        return Response.SERVER_MAINTAINING;
    }
    const searchForm = await createSearchForm(req, cookieIndex);
    if (searchForm === undefined) {
        return Response.SOLD_OUT;
    } else {
        return await getFlightInfo(req, searchForm, cookieIndex);
    }
}
async function generatePassenger(json, type, startIndex, endIndex) {
    const key = type === 'INFANT' ? "HAS_INFANT" : "TRAVELLER_TYPE";
    for (let i = startIndex; i <= endIndex; i++) {
        json[`${key}_${i}`] = type === 'INFANT' ? "TRUE" : type;
    }
    return json;
}
async function createSearchForm(req, cookieIndex) {
    let cookie = await redisService.getCookieByIndex(cookieIndex);
    const proxy = {
        host: constant.PROXY_HOST,
        port: constant.PROXY_PORT,
        auth: {
          username: constant.PROXY_USER.replace('[SESSION_ID]',cookie.sessionId),
          password: constant.PROXY_PASSWORD
        }
    };
    if (cookie === undefined) {
        await redisService.pushCookieExpired(cookieIndex);
        return await getOnewayFareFlight(req);
    }
    const body = req.body;
    const dptDate = common.formatDate(body.dptDate, 'YYYY-MM-DD', 'YYYYMMDD0000');
    let initData = {
        "MRCVI": "7.6",
        "CABIN_CLASS": "PE",
        "DATE_RANGE_VALUE_1": "3",
        "CABIN": "PE",
        "LANGUAGE": "GB",
        "TRIP_TYPE": "O",
        "COUNTRY_SITE": "VN",
        "APPV": "7.6",
        "E_LOCATION_1": body.dest,
        "B_LOCATION_1": body.origin,
        "DATE_RANGE_QUALIFIER_1": "C",
        "B_DATE_1": dptDate
    };
    let generateADT = await generatePassenger(initData, "ADT", 1, body.adult);
    let generateCHD = await generatePassenger(generateADT, "CHD", body.adult + 1, body.child + body.adult);
    let generateINF = await generatePassenger(generateCHD, "INFANT", 1, body.infant > body.adult ? body.adult : body.infant);
    const finalData = generateINF;
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://www.thaiairways.com/AIP_ENCTRIPNEW1/tripFlowIEncrypt',
        headers: {
            'Host': 'www.thaiairways.com',
            'accept': '*/*',
            'channel': 'MRCVI',
            'content-type': 'application/json',
            'x-d-token': '3:Gs6tBA7XtRdt7e3engEjBQ==:etlFbs4uCrKyQyuqJ5Jm70KE7+9C8Yso4o7Ki32xn5oFHXRknsHrvwq41PNXYaGMxqPKDK+UFo6oUxLFzb2sg9dqgCrNR+2/bLOU7zk6VUqKS7+mqbr+GlBL+Nh4dgVVIgjFLJ67oXWrfDBdcomY86QBVCmvDGc0gS9J3/zT8YzUSqAccvtQ+vpgY0iwmZQV3qXTLxx99qcJLqgDOclKmL9wwvwnFp5JCb3EIxh6ZaGfVGE90wsbCIoxTUo3M7V7+UcVK9JHUDzTcr1qEg8HyjIXcY013VjvtSXATkz8orBD0uqoyixSbVNFRylEqF/FwT+geem32HBPSBRqCEx65OWVGV0wwmc/+Ge997HcW6wVYOrYC6YrEPTwaFFWw6jqfF5CBSTCKLtEKI1ps3m7+mfNIP85W++nUMTCKZUiXIhEpWGGHfQSdtpjyICAs9p1w6BUj6+ueLpszdLLUG71dg==:YsUPPeCz1pIXFJBx7+TaGBAYdvctt6TJtXS+KyJ8tak=.Y-oX5VOZGNIKqEZK',
            'user-agent': 'MDesApp/7.6 (com.thaiairways.mobile; build:9.0; iOS 16.5.1) Alamofire/7.6',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'Cookie': cookie.cookie
        },
        data: finalData
    };
    const searchResponse = await common.fetchDataWithProxy(config, proxy);
    const responseData = searchResponse.data;
    if (responseData && responseData.toString().includes('Incapsula')) {
        logger.warning(`Cookie ${cookieIndex} expried`);
        await redisService.pushCookieExpired(cookieIndex);
        return await getOnewayFareFlight(req);
    }
    return searchResponse.data.params;
}
async function getFlightInfo(req, searchForm, cookieIndex) {
    const dptMap = new Map();
    let cookie = await redisService.getCookieByIndex(cookieIndex);
    const proxy = {
        host: constant.PROXY_HOST,
        port: constant.PROXY_PORT,
        auth: {
          username: constant.PROXY_USER.replace('[SESSION_ID]',cookie.sessionId),
          password: constant.PROXY_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    };
    if (cookie !== undefined && cookie !== null) {
        logger.info(`Has cookie ${cookieIndex}`)
    } else {
        logger.warning(`Has no cookie index ${cookieIndex}`)
        await redisService.pushCookieExpired(cookieIndex);
        return await getOnewayFareFlight(req);
    }
    const data = `ENC=${searchForm.ENC}&SITE=${searchForm.SITE}&SO_SITE_ENABLE_ERR_REDIRECT=FALSE&LANGUAGE=${searchForm.LANGUAGE}&MRCVI=7.6&ENCT=${searchForm.ENCT}&EMBEDDED_TRANSACTION=${searchForm.EMBEDDED_TRANSACTION}`;
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://book.thaiairways.com/plnext/tgpnextDX/Override.action',
        headers: {
            'Host': 'book.thaiairways.com',
            'Cookie': cookie.cookie,
            'content-type': 'application/x-www-form-urlencoded',
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'channel': 'MRCVI',
            'sec-fetch-site': 'none',
            'x-d-token': '3:Gs6tBA7XtRdt7e3engEjBQ==:etlFbs4uCrKyQyuqJ5Jm70KE7+9C8Yso4o7Ki32xn5oFHXRknsHrvwq41PNXYaGMxqPKDK+UFo6oUxLFzb2sg9dqgCrNR+2/bLOU7zk6VUqKS7+mqbr+GlBL+Nh4dgVVIgjFLJ67oXWrfDBdcomY86QBVCmvDGc0gS9J3/zT8YzUSqAccvtQ+vpgY0iwmZQV3qXTLxx99qcJLqgDOclKmL9wwvwnFp5JCb3EIxh6ZaGfVGE90wsbCIoxTUo3M7V7+UcVK9JHUDzTcr1qEg8HyjIXcY013VjvtSXATkz8orBD0uqoyixSbVNFRylEqF/FwT+geem32HBPSBRqCEx65OWVGV0wwmc/+Ge997HcW6wVYOrYC6YrEPTwaFFWw6jqfF5CBSTCKLtEKI1ps3m7+mfNIP85W++nUMTCKZUiXIhEpWGGHfQSdtpjyICAs9p1w6BUj6+ueLpszdLLUG71dg==:YsUPPeCz1pIXFJBx7+TaGBAYdvctt6TJtXS+KyJ8tak=.300xsZk14eGnWi7p',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'sec-fetch-mode': 'navigate',
            'origin': 'null',
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
            'sec-fetch-dest': 'document'
        },
        data: data
    };
    const searchResponse = await common.fetchDataWithProxy(config,proxy);
    if (searchResponse.data === null || searchResponse.data === undefined) {
        await redisService.pushCookieExpired(cookieIndex);
        return await getOnewayFareFlight(req);
    }
    const pattern = /{"siteConfiguration"\s*:\s*{[^]*}}}/g;
    const cleanedData = searchResponse.data.replace(/\r?\n|\r/g, '');
    const matches = cleanedData.match(pattern);
    const jsonObject = JSON.parse(matches);
    if (jsonObject === null) {
        logger.warning(`Cookie ${cookieIndex} expried`);
        await redisService.pushCookieExpired(cookieIndex);
        return await getOnewayFareFlight(req);
    }
    const setCookieHeader = searchResponse.headers['set-cookie'];
    const umJstCookie = setCookieHeader.find(cookie => cookie.includes('um_jst'));
    if(umJstCookie !== undefined){
        const umJstValue = /um_jst=([^;]+)/.exec(umJstCookie)[1];
        cookie = `um_jst=${umJstValue};${cookie};`;
    }
    const bigIpServerCookie = setCookieHeader.find(cookie => cookie.includes('BIGipServer~ETV~RD1_ns_bibi-prd_praxis_80_pool'));
    const bigIpServerValue = /BIGipServer~ETV~RD1_ns_bibi-prd_praxis_80_pool=([^;]+)/.exec(bigIpServerCookie)[1];
    cookie=`${cookie}BIGipServer~ETV~RD1_ns_bibi-prd_praxis_80_pool=${bigIpServerValue};`;
    let availability = jsonObject.pageDefinitionConfig.pageData.business.Availability;
    if (availability === undefined) {
        const baseFacts = jsonObject.pageDefinitionConfig.pageData.basefacts;
        const body = req.body;
        let initData = {
            'DATE_RANGE_QUALIFIER_2': baseFacts['request.DATE_RANGE_QUALIFIER_2'],
            'COUNTRY_SITE': baseFacts['request.COUNTRY_SITE'],
            'INITIAL_TRIP_TYPE': 'O',
            'DATE_RANGE_QUALIFIER_1': baseFacts['request.DATE_RANGE_QUALIFIER_1'],
            'EXTERNAL_ID#9': baseFacts['request.EXTERNAL_ID#9'],
            'B_ANY_TIME_1': baseFacts['request.B_ANY_TIME_1'],
            'search': '',
            'TRIP_FLOW': baseFacts['request.TRIP_FLOW'],
            'EXTERNAL_ID': baseFacts['request.EXTERNAL_ID'],
            'TYPE': baseFacts['request.TYPE'],
            'LANGUAGE': baseFacts['request.LANGUAGE'],
            'ARRANGE_BY': baseFacts['request.ARRANGE_BY'],
            'COMMERCIAL_FARE_FAMILY_1': baseFacts['request.COMMERCIAL_FARE_FAMILY_1'],
            'SITE': baseFacts['request.SITE'],
            'PAYMENT_TYPE': baseFacts['request.PAYMENT_TYPE'],
            'E_LOCATION_1': baseFacts['request.E_LOCATION_1'],
            'TRIP_TYPE': baseFacts['request.TRIP_TYPE'],
            'OFFICE_ID': baseFacts['request.OFFICE_ID'],
            'DATE_RANGE_VALUE_1': 0,
            'ENCT': baseFacts['request.ENCT'],
            'DATE_RANGE_VALUE_2': 0,
            'SESSION_ID': baseFacts['request.SESSION_ID'],
            'B_LOCATION_1': baseFacts['request.B_LOCATION_1'],
            'B_DATE_1': baseFacts['request.B_DATE_1'],
            'B_ANY_TIME_2': baseFacts['request.B_ANY_TIME_2'],
            'PRICING_TYPE': 'O',
            'PLTG_IS_UPSELL': 'true',
            'DISPLAY_TYPE': baseFacts['request.DISPLAY_TYPE'],
            'FORCE_CALENDAR': 'FALSE',
            'PAGE_TICKET': '0',
            'BOOKING_FLOW': ''
        };
        let generateADT = await generatePassenger(initData, "ADT", 1, body.adult);
        let generateCHD = await generatePassenger(generateADT, "CHD", body.adult + 1, body.child + body.adult);
        let generateINF = await generatePassenger(generateCHD, "INFANT", 1, body.infant > body.adult ? body.adult : body.infant);
        const finalData = qs.stringify(generateINF);
        const jsessionidCookie = setCookieHeader.find(cookie => cookie.includes('JSESSIONID'));
        const jsessionidValue = /JSESSIONID=([^;]+)/.exec(jsessionidCookie)[1];
        let reConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://book.thaiairways.com/plnext/tgpnextDX/FlexPricerAvailabilityDispatcherPui.action;jsessionid=${jsessionidValue.split('.')[0]}?X-Accept-Charset=iso-8859-1`,
            headers: {
                'authority': 'book.thaiairways.com',
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'cache-control': 'max-age=0',
                'content-type': 'application/x-www-form-urlencoded',
                'cookie': cookie.cookie,
                'origin': 'https://book.thaiairways.com',
                'referer': 'https://book.thaiairways.com/plnext/tgpnextDX/Override.action',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            },
            data: finalData
        };
        const reSearch = await common.fetchDataWithProxy(reConfig,proxy);
        if (reSearch.data === null || reSearch.data === undefined) {
            await redisService.pushCookieExpired(cookieIndex);
            return await getOnewayFareFlight(req);
        }
        const reCleanedData = reSearch.data.replace(/\r?\n|\r/g, '');
        const reMatches = reCleanedData.match(pattern);
        const reJsonObject = JSON.parse(reMatches);
        if (reJsonObject === null) {
            logger.warning(`Cookie ${cookieIndex} expried`);
            await redisService.pushCookieExpired(cookieIndex);
            return await getOnewayFareFlight(req);
        }
        availability = reJsonObject.pageDefinitionConfig.pageData.business.Availability;
    }
    if (availability === undefined) {
        logger.warning(`No availability flights ${cookieIndex}`)
        return Response.SOLD_OUT;
    }
    const responseFlight = new Array();
    const recommendationList = availability.recommendationList;
    const proposedBounds = availability.proposedBounds;
    const dptFlights = proposedBounds[0].proposedFlightsGroup;
    for (flightIndex in dptFlights) {
        const flightObject = new Flight();
        const recomendList = recommendationList.filter(recommendation => recommendation.bounds[0].flightGroupList.find(flight => flight.flightId === dptFlights[flightIndex].proposedBoundId))
        const recomend = recomendList.reduce((smallestObj, currentObj) => {
            if (!smallestObj || currentObj.bounds[0].travellerPrices.ADT < smallestObj.bounds[0].travellerPrices.ADT) {
                return currentObj;
            }
            return smallestObj;
        }, null);
        const dptSegments = dptFlights[flightIndex].segments;
        if (dptSegments.length > 2) continue;
        const flight = recomend.bounds[0].flightGroupList.find(flight => flight.flightId === dptFlights[flightIndex].proposedBoundId);
        if (flight === undefined || flight === null) continue;
        const fareFamily = availability.fareFamilyList.find(fare => fare.ffCode === recomend.ffCode)
        // logger.info(bookingClass)
        const dptTravellerPrices = {
            ADT: recomend.bounds[0].travellerPrices.ADT,
            CHD: recomend.bounds[0].travellerPrices.CHD,
            INF: recomend.bounds[0].travellerPrices.INF
        }
        let dptDepartDateTime = null;
        let dptArrivalDateTime = null;
        let dptTransitDepartDateTime = null;
        let dptTransitArrivalDateTime = null;
        let dptDepartTerminal = null;
        let dptArrivalTerminal = null;
        let dptTransitDepartTerminal = null;
        let dptTransitArrivalTerminal = null;
        if (dptSegments.length == 2) {
            dptDepartDateTime = common.formatFlightDate(dptSegments[0].beginDate);
            dptArrivalDateTime = common.formatFlightDate(dptSegments[1].endDate);
            dptTransitDepartDateTime = common.formatFlightDate(dptSegments[1].beginDate);
            dptTransitArrivalDateTime = common.formatFlightDate(dptSegments[0].endDate);
            dptDepartTerminal = dptSegments[0].beginTerminal;
            dptArrivalTerminal = dptSegments[1].endTerminal;
            dptTransitDepartTerminal = dptSegments[1].beginTerminal;
            dptTransitArrivalTerminal = dptSegments[0].endTerminal;
        }
        if (dptSegments.length < 2) {
            const segment = dptSegments[0];
            flightObject.flightCode = segment.airline.code + segment.flightNumber;
            flightObject.type = 'direct'
            flightObject.departTerminal = segment.beginTerminal;
            flightObject.departDateTime = common.formatFlightDate(segment.beginDate);
            flightObject.arrivalTerminal = segment.endTerminal;
            flightObject.arrivalDateTime = common.formatFlightDate(segment.endDate);
            flightObject.cabinClass = fareFamily.ffName.replace('<br>', ' ');
            flightObject.bookingClass = flight.rbd;
            flightObject.class = flight.rbd;
            flightObject.currency = availability.currencyBean.code;
            flightObject.aircraftName = segment.equipment.name;
            flightObject.aircraftIata = segment.equipment.code;
            let match = segment.equipment.name.match(/ [^]*-/g)
            if (match !== null) {
                flightObject.aircraftIcao = match[0].slice(1, -1);
            } else {
                match = segment.equipment.name.match(/ [^]*/g);
                if (match !== null) {
                    flightObject.aircraftIcao = match[0].slice(1);
                }
            }
            flightObject.operatingAirline = segment.opAirline.name
            flightObject.priceAdult = (dptTravellerPrices.ADT === undefined) ? 0 : dptTravellerPrices.ADT;
            flightObject.priceChild = (dptTravellerPrices.CHD === undefined) ? 0 : dptTravellerPrices.CHD;
            flightObject.priceInfant = (dptTravellerPrices.INF === undefined) ? 0 : dptTravellerPrices.INF;
        } else {
            dptSegments.forEach(segment => {
                if (segment.endLocation.locationCode !== req.body.dest) {
                    flightObject.flightCode = segment.airline.code + segment.flightNumber;
                    flightObject.type = 'direct'
                    flightObject.departTerminal = segment.beginTerminal;
                    flightObject.departDateTime = common.formatFlightDate(segment.beginDate);
                    flightObject.arrivalTerminal = segment.endTerminal;
                    flightObject.arrivalDateTime = common.formatFlightDate(segment.endDate);
                    flightObject.cabinClass = fareFamily.ffName.replace('<br>', ' ');
                    flightObject.bookingClass = flight.rbd;
                    flightObject.class = flight.rbd;
                    flightObject.currency = availability.currencyBean.code;
                    flightObject.aircraftName = segment.equipment.name;
                    flightObject.aircraftIata = segment.equipment.code;
                    let match = segment.equipment.name.match(/ [^]*-/g)
                    if (match !== null) {
                        flightObject.aircraftIcao = match[0].slice(1, -1);
                    } else {
                        match = segment.equipment.name.match(/ [^]*/g);
                        if (match !== null) {
                            flightObject.aircraftIcao = match[0].slice(1);
                        }
                    }
                    flightObject.operatingAirline = segment.opAirline.name
                    flightObject.priceAdult = (dptTravellerPrices.ADT === undefined) ? 0 : dptTravellerPrices.ADT;
                    flightObject.priceChild = (dptTravellerPrices.CHD === undefined) ? 0 : dptTravellerPrices.CHD;
                    flightObject.priceInfant = (dptTravellerPrices.INF === undefined) ? 0 : dptTravellerPrices.INF;
                } else {
                    flightObject.type = 'transit'
                    flightObject.transitFlightCode = segment.airline.code + segment.flightNumber;
                    flightObject.transitDepartTerminal = dptTransitDepartTerminal
                    flightObject.transitArrivalTerminal = dptTransitArrivalTerminal
                    flightObject.departTerminal = dptDepartTerminal;
                    flightObject.arrivalTerminal = dptArrivalTerminal;
                    flightObject.transitAirport = segment.beginLocation.locationCode;
                    flightObject.departDateTime = dptDepartDateTime;
                    flightObject.arrivalDateTime = dptArrivalDateTime
                    flightObject.transitDepartDateTime = dptTransitDepartDateTime
                    flightObject.transitArrivalDateTime = dptTransitArrivalDateTime
                    flightObject.transitOperatingAirline = segment.opAirline.name
                }
            });
        }

        if (!dptMap.has('' + flightObject._flightCode + flightObject._transitFlightCode)) {
            responseFlight.push(flightObject.toJson())
            dptMap.set('' + flightObject._flightCode + flightObject._transitFlightCode)
        }
    }
    return responseFlight;

}