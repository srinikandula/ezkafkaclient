var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');

var app = express();

var config = require('./server/config/config');
var Gps = require('./server/routes/gpsRoutes');
var kafkaConsumerGroup = require('./server/kafka/kafkaConsumerGroup');
var kafkaConsumer = require('./server/kafka/kafkaConsumer');
var kafkaConsumer2 = require('./server/kafka/kafkaConsumer2');
var kafkaConsumer3 = require('./server/kafka/kafkaConsumer3');

app.set('port', 8000);

app.use(bodyParser.json({limit: config.bodyParserLimit}));
app.use(bodyParser.urlencoded({limit: config.bodyParserLimit, extended: true}));

app.use('/v1/gps', Gps.OpenRouter);

var server = app.listen(app.get('port'), function () {
    console.log('Listening on port ' + server.address().port);
});

module.exports = app;