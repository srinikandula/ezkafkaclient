var kafka = require('kafka-node'),
    HighLevelProducer = kafka.HighLevelProducer,
    client = new kafka.Client(),
    producer = new HighLevelProducer(client);
var config = require('./../config/config');

// for(var i = 0;i < 1000; i++) payloads[0].messages.push('message'+i);
producer.on('ready', function () {
    console.log("Kafka Producer is connected and ready.");
});

producer.createTopics(['devicePositions'], true, function (err, data) {
    console.log(data);
});

var KafkaService = function () {
};

KafkaService.prototype.sendRecord = function (positions, callback) {
    // console.log(config.devicePositionsTopicName);
    // console.log('producer', positions.longitude, positions.latitude);
    var record = [
        { topic: config.devicePositionsTopicName, messages: [JSON.stringify(positions)] }
    ];
    producer.send(record, function (err, data) {
        if(err) {
            callback(err);
        } else {
            callback(data);
        }
    });
};

module.exports = new KafkaService();