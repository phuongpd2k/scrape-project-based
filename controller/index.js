const   express     = require('express'),
        router      = express.Router(),
        logger       = require('../utils/logger'),
        oneWay       = require('../services/direct.service');
        roundWay       = require('../services/round.service');

logger.info('[POST] = /one-way')
logger.info('[POST] = /round-way')

router.post('/one-way', oneWay.process);
router.post('/round-way', roundWay.process);

module.exports = router;