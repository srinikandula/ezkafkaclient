var GpsColl = require('./../models/schemas').GpsColl;
var gps = require('./../apis/gpsApi');
var config = require('./../config/config');
console.log('Topics Name ', config.devicePositionsTopicName);

var kafka = require('kafka-node'),
    Consumer = kafka.Consumer,
    client = new kafka.Client();
console.log('consumer3', config.consumerGroupId);

var consumer2 = new Consumer(client, [{topic: config.devicePositionsTopicName,  partition: 1}], {groupId: config.consumerGroupId, autoCommit: true});
// fromOffset: 1
consumer2.on('message', function (message) {
    var position = JSON.parse(message.value);
    console.log('consumer3', position.longitude, position.latitude);
    gps.AddDevicePositions(position, function (result) {
        // res.send(result);
        // console.log(result);
    });

});
consumer2.on("error", function (err) {
    console.log("error", err);
});