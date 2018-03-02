var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');

var app = express();

var config = require('./server/config/config');
var Gps = require('./server/routes/gpsRoutes');
var kafkaConsumer = require('./server/kafka/kafkaConsumer');

app.set('port', 7000);

app.use(bodyParser.json({limit: config.bodyParserLimit}));
app.use(bodyParser.urlencoded({limit: config.bodyParserLimit, extended: true}));

app.use('/v1/gps', Gps.OpenRouter);

var server = app.listen(app.get('port'), function () {
    console.log('Listening on port ' + server.address().port);
});

module.exports = app;