var kafka = require('kafka-node'),
    HighLevelProducer = kafka.HighLevelProducer,
    client = new kafka.Client(),
    producer = new HighLevelProducer(client);
var config = require('./../config/config');

//https://stackoverflow.com/questions/31588430/brokernotavailableerror-could-not-find-the-leader-exception-while-spark-streami

client.refreshMetadata(['devicePositions'], function(err,data){
    if (err) {
        console.warn('Error refreshing kafka metadata', err);
    }
});

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
   // console.log("producer: writing to kafka: "+config.devicePositionsTopicName);
    // console.log('producer', positions.longitude, positions.latitude);
    var record = [
        { topic: config.devicePositionsTopicName, messages: [JSON.stringify(positions)] }
    ];
    producer.send(record, function (err, data) {
        if(err) {
            console.error("producer: error writing to kafka "+ JSON.stringify(err));
            callback(err);
        } else {
           // console.log('producer: done');
            callback(data);
        }
    });
};

module.exports = new KafkaService();