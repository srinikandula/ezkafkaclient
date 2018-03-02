var express = require('express');
var AuthRouter = express.Router();
var OpenRouter = express.Router();

var gps = require('../apis/gpsApi');
var kafka=require('../kafka/kafkaProducer');


OpenRouter.get('/testProject',function (req,res) {
    gps.testProject(function (result) {
        res.json(result);
    })
});

OpenRouter.get('/AddDevicePositions', function (req, res) {
    kafka.sendRecord(req.query, function (result) {
        res.send(result);
    });
});

module.exports = {
    AuthRouter: AuthRouter,
    OpenRouter: OpenRouter
};