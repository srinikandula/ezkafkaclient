var express = require('express');
var AuthRouter = express.Router();
var OpenRouter = express.Router();

var gps = require('../apis/gpsApi');

OpenRouter.get('/testProject',function (req,res) {
    gps.testProject(function (result) {
        res.json(result);
    })
});

module.exports = {
    AuthRouter: AuthRouter,
    OpenRouter: OpenRouter
};