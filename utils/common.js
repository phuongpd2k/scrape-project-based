const moment = require('moment');
const axios = require('axios');
const request = require('request-promise');

exports.getCurrentTime = (pattern) => {
    return moment().format(pattern || 'YYYY-MM-DD HH:mm:ss');
}
exports.getTwoWeekLater = (pattern) => {
    return moment().add(14, 'days').format(pattern || 'YYYY-MM-DD HH:mm:ss');
}

exports.fetchData = (config) => {
    return axios.request(config)
        .then((response) => {
            return response;
        })
        .catch((error) => {
            return error;
        });
}
exports.fetchDataWithProxy = async (config, proxy) => {
    try {
      const requestOptions = proxy
        ? {
            url: config.url,
            method: config.method || 'GET',
            headers: config.headers || {},
            body: config.data ? JSON.stringify(config.data) : undefined,
            proxy: `http://${proxy.auth.username}:${proxy.auth.password}@${proxy.host}:${proxy.port}`,
          }
        : config;
  
      const response = await request(requestOptions);
      return response;
    } catch (error) {
      return error;
    }
  };

exports.sleep = async (ms) => {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

//create array from 1 to n 
exports.initArrayFrom1ToN = (n) => {
    const array = [];
    for (let i = 1; i <= n; i++) {
        array.push(i);
    }
    return array;
}

exports.formatDate = (dateString, inputPattern, outputPattern) => {
    const formattedDate = moment(dateString, inputPattern).format(outputPattern);
    return formattedDate;
}

exports.formatFlightDate = (dateString) => {
    const formattedDate = moment(dateString, 'MMMM DD, YYYY h:mm:ss A').format('YYYY-MM-DD HH:mm:ss');
    return formattedDate;
}