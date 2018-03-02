var GpsColl = require('./../models/schemas').GpsColl;
var gps = require('./../apis/gpsApi');
var config = require('./../config/config');
console.log('Topics Name ',config.devicePositionsTopicName);
var kafka = require('kafka-node'),
    Consumer = kafka.Consumer,
    client = new kafka.Client(),
    consumer = new Consumer(
        client,
        [
            { topic: config.devicePositionsTopicName , partition: 0 }
        ],
        {
            autoCommit: true
            // fromOffset: 1
        }
    );

consumer.on('message', function (message) {
    console.log('consumer', message);
    var position = JSON.parse(message.value);
    gps.AddDevicePositions(position, function (result) {
        // res.send(result);
        console.log(result);
    });
    /*var positionDoc = new GpsColl(position);
    positionDoc.save(function (err,result) {
        if (err) {
            console.log('err');
        } else {
            console.log('saved');
        }
    });*/

});

consumer.on("error", function(err) {
    console.log("error", err);
});