var kafka = require('kafka-node');
var config = require('../config/config');

var options = {
    host: 'zookeeper:2181',  // zookeeper host omit if connecting directly to broker (see kafkaHost below)
    kafkaHost: 'broker:9092', // connect directly to kafka broker (instantiates a KafkaClient)
    groupId: config.devicePositionsTopicName,
    sessionTimeout: 15000,
    // An array of partition assignment protocols ordered by preference.
    // 'roundrobin' or 'range' string for built ins (see below to pass in custom assignment protocol)
    protocol: ['roundrobin'],

    // Offsets to use for new groups other options could be 'earliest' or 'none' (none will emit an error if no offsets were saved)
    // equivalent to Java client's auto.offset.reset
    fromOffset: 'latest', // default

    // how to recover from OutOfRangeOffset error (where save offset is past server retention) accepts same value as fromOffset
    outOfRangeOffset: 'earliest', // default
    migrateHLC: false,    // for details please see Migration section below
    migrateRolling: true,
    // Callback to allow consumers with autoCommit false a chance to commit before a rebalance finishes
    // isAlreadyMember will be false on the first connection, and true on rebalances triggered after that
    /*onRebalance: (isAlreadyMember, function (callback) {
        callback();
    })*/
};

var consumerGroup = new kafka.ConsumerGroup(options, config.devicePositionsTopicName);