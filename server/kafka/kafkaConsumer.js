var GpsColl = require('./../models/schemas').GpsColl;
var gps = require('./../apis/gpsApi');
var config = require('./../config/config');
var kafka = require('kafka-node'),
    Consumer = kafka.Consumer,
    client = new kafka.Client();
console.log('consumer1 :'+ config.consumerGroupId);
var consumer1 = new Consumer(client, [{topic: config.devicePositionsTopicName}], {groupId: config.consumerGroupId, autoCommit: true});
        // fromOffset: 1
consumer1.on('message', function (message) {
    var position = JSON.parse(message.value);
    //console.log('consumer1 :'+ position.longitude, position.latitude);
    gps.addDevicePositions(position, function (result) {
       // console.log('consumer1 :saved poistion');
    });

});
consumer1.on("error", function (err) {
    console.log("error", err);
});