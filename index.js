const express = require('express');
const server = express();
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const routers = require('./controller');
const redisClient = require('./config/redisClient');
const crawl = require('./job/crawl');
const logger = require('./utils/logger');

//Setup
server.use(helmet());
server.use(cors());
server.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
server.use(bodyParser.json({ limit: '50mb' }));

// Move the following two lines before the `routers` middleware
server.use(express.json()); // Parse JSON-encoded bodies
server.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

server.use(routers);

server.listen(3003, async () => {
  await redisClient.connect();
  crawl.process();
});

logger.info('Server is running on port ' + 3003);

server.on('error', err => {
  console.error(err);
});
