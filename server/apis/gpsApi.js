
var nodeGeocoder = require('node-geocoder');
var config = require('./../config/config');
var async = require('async');
var request = require('request');

var GpsColl = require('./../models/schemas').GpsColl;
var SecretKeyColl = require('./../models/schemas').SecretKeysColl;
var SecretKeyCounterColl = require('./../models/schemas').SecretKeyCounterColl;
var TrucksColl = require('./../models/schemas').TrucksColl;
var archivedDevicePositions = require('./../models/schemas').archivedDevicePositionsColl;
var AccountsColl = require('./../models/schemas').AccountsColl;
var DeviceColl = require('./../models/schemas').DeviceColl;


var Gps = function () {
};

Gps.prototype.testProject = function (callback) {
    callback({status:true,message:'success'});
};

function getAddress(position, callback) {
    var retObj = {
        status: false,
        messages: []
    };
    var options = {
        provider: 'google',
        httpAdapter: 'https'
    };
    var fulldate = new Date();
    var today = fulldate.getDate() + '/' + fulldate.getMonth() + 1 + '/' + fulldate.getFullYear();
    SecretKeyCounterColl.findOne({
        date: today,
        counter: {$lt: config.googleSecretKeyLimit}
    }).populate('secretId', {secret: 1}).exec(function (errsecret, secret) {
        if (errsecret) {
            retObj.messages.push('Error getting secret');
            callback(retObj);
        } else if (secret) {
            options.apiKey = secret.secretId.secret;
            var geocoder = nodeGeocoder(options);
            geocoder.reverse({lat: position.latitude, lon: position.longitude}, function (errlocation, location) {
                if (location) {
                    position.address = location[0]['formattedAddress'];
                }
                SecretKeyCounterColl.findOneAndUpdate({_id: secret._id}, {$inc: {counter: 1}}, function (incerr, increased) {
                    if (incerr) {
                        retObj.messages.push('Error incrementing secret');
                    } else {
                        retObj.status=true;
                        retObj.messages.push('Secret Incremented');
                    }
                    callback(retObj);
                });
            });
        } else {
            retObj.status=true;
            retObj.messages.push('Secrets Completed for today');
            callback(retObj);
        }
    });
}

Gps.prototype.AddDevicePositions = function (position, callback) {
    var retObj = {
        status: false,
        messages: []
    };
    if (position.latitude === 'true' || position.latitude === 'false') {
        position.latitude = position.valid;
        position.valid = false
    }
    if (position.attributes) position.attributes = JSON.parse(position.attributes);
    position.location = {};
    position.location.coordinates = [position.longitude, position.latitude];
    position.speed=(position.speed*1.852);
    if(position.longitude!==0&&position.latitude!==0) {
        if (!position.address || position.address === '{address}') {
            // getAddress(position, function (updatedAddress) {


                // getAddress(position, function (updatedAddress) {
                getOSMAddress(position, function (updatedAddress) {
                    if (updatedAddress.status) {
                        savePositionDoc(position, function (result) {
                            callback(result);
                        })
                    } else {
                        callback(retObj);
                    }

                })

        }else {
            savePositionDoc(position, function (result) {
                callback(result);
            })
        }
    }else{
        retObj.messages.push('This is a default position');
        callback(retObj);
    }
};

function savePositionDoc(position, callback) {
    var retObj = {
        status: false,
        messages: []
    };
    // var positionDoc = new GpsColl(position);
    // positionDoc.save(function (err,result) {
    //     if (err) {
    //         retObj.messages.push('Error saving position');
    //         callback(retObj);
    //     } else {
    //         retObj.status = true;
    //         retObj.messages.push('Successfully saved the position');
    TrucksColl.find({deviceId:position.deviceId},{accountId:1,isIdle:1},function (err,accountId) {
        if(err){
            retObj.status=false;
            retObj.messages.push('Error fetching data');
            callback(retObj);
        }else{
            AccountsColl.findOne({_id:accountId},function (err,settings) {
                if(err){
                    retObj.status=false;
                    retObj.messages.push('Error fetching settings data');
                    callback(retObj);
                }else{
                    var idealTime=20;
                    var stopTime=60;
                    var currentDate=new Date();
                    var isIdle=false;
                    var isStopped=false;
                    var idealDate=new Date((currentDate-0)-(idealTime*60000));
                    async.series({
                        one: function (aCallbackOne) {
                            GpsColl.find({
                                deviceId: position.deviceId,
                                createdAt: {$gte: idealDate, $lte: currentDate}
                            }).sort({createdAt: -1}).exec(function (err, positions) {
                                if (err) {
                                    retObj.status = false;
                                    retObj.messages.push('Error fetching gps positions data');
                                    aCallbackOne(err,retObj);
                                } else {
                                    if (positions.length > 0) {
                                        if (positions[0].location.coordinates[0] === positions[positions.length - 1].location.coordinates[0] && positions[0].location.coordinates[1] === positions[positions.length - 1].location.coordinates[1]) {
                                            isIdle = true;
                                            var stopDate = new Date((currentDate - 0) - (stopTime * 60000));
                                            GpsColl.find({
                                                deviceId: position.deviceId,
                                                createdAt: {$gte: stopDate, $lte: currentDate}
                                            }).sort({createdAt: -1}).exec(function (err, positions) {
                                                if (err) {
                                                    retObj.status = false;
                                                    retObj.messages.push('Error fetching gps positions data');
                                                    aCallbackOne(err,retObj);
                                                } else {
                                                    if (positions.length > 0) {
                                                        if (positions[0].location.coordinates[0] === positions[positions.length - 1].location.coordinates[0] && positions[0].location.coordinates[1] === positions[positions.length - 1].location.coordinates[1]) {
                                                            isStopped = true;
                                                            aCallbackOne(null,{isIdle:isIdle,isStopped:isStopped})

                                                        } else {
                                                            isStopped = false;
                                                            aCallbackOne(null,{isIdle:isIdle,isStopped:isStopped})
                                                        }
                                                    } else {
                                                        isIdle = true;
                                                        isStopped = true;
                                                        aCallbackOne(null,{isIdle:isIdle,isStopped:isStopped})
                                                    }
                                                }
                                            })
                                        } else {
                                            isIdle = false;
                                            isStopped = false;
                                            aCallbackOne(null,{isIdle:isIdle,isStopped:isStopped})
                                        }

                                    } else {
                                        isIdle = true;
                                        isStopped = true;
                                        aCallbackOne(null,{isIdle:isIdle,isStopped:isStopped})
                                    }
                                }
                            })

                        },
                        two:function (aCallbackTwo) {
                            var retObj1={status:false,
                                messages:[]};
                            position.isIdle=isIdle;
                            position.isStopped=isStopped;
                            var positionData=new GpsColl(position);
                            TrucksColl.findOne({deviceId:position.deviceId},function (err,trucks) {
                                if(err){
                                    retObj1.status=false;
                                    retObj1.messages.push('Error updating truck status');
                                    aCallbackTwo(err,retObj1);
                                }else{
                                    var latitude=trucks.attrs.latestLocation.location.coordinates[1];
                                    var longitude=trucks.attrs.latestLocation.location.coordinates[0];
                                    position.distance = 1.609344 * 3956 * 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((latitude-position.location.coordinates[1])*Math.PI/180 /2),2)+Math.cos(latitude*Math.PI/180)*Math.cos(position.location.coordinates[1]*Math.PI/180)*Math.pow(Math.sin((longitude-position.location.coordinates[0])*Math.PI/180/2),2)))
                                    position.totalDistance=trucks.attrs.latestLocation.totalDistance+position.distance;
                                    positionData=new GpsColl(position);
                                    TrucksColl.update({deviceId:positionData.deviceId},{$set:{isIdle:isIdle,isStopped:isStopped,"attrs.latestLocation":positionData}},function (err,truckResult) {
                                        if(err){
                                            retObj1.status=false;
                                            retObj1.messages.push('Error updating truck status');
                                            aCallbackTwo(err,retObj1);
                                        }else{
                                            // retObj.results={isStopped:isStopped,isIdle:isIdle};
                                            // DeviceColl.update({imei:positionData.deviceId},{$set:{"attrs.latestLocation":positionData}})
                                            positionData.save(function (err) {
                                                if(err){
                                                    retObj1.status=false;
                                                    retObj1.messages.push('Error updating device position status');
                                                    aCallbackTwo(err,retObj1);
                                                }else{
                                                    retObj1.status=true;
                                                    retObj1.messages.push('Success');
                                                    aCallbackTwo(null,retObj1);
                                                }
                                            });
                                        }
                                    })

                                }
                            });
                        }
                    },function (err,results) {
                        if(err){
                            retObj.status=false;
                            retObj.messages.push('Error updating truck status');
                            callback(retObj);
                        }else{
                            retObj.status=true;
                            retObj.messages.push('Success');
                            retObj.results=results.one;
                            callback(retObj);
                        }
                    })
                }
            })
        }

    })
    // TrucksColl.findOneAndUpdate({deviceId:positionDoc.deviceId},{$set:{"attrs.latestLocation":positionDoc}},function (truUpderr,result) {
    //     if(truUpderr){
    //         retObj.messages.push('Error updating the truck position');
    //         callback(retObj);
    //     }else{
    //         retObj.status = true;
    //         retObj.messages.push('Successfully updated the truck position');
    //         callback(retObj);
    //     }
    // });
    // }
    // });
}

function getOSMAddress(position, callback) {
    var retObj = {
        status: false,
        messages: []
    };
    request({
        method: 'GET',
        url: 'http://13.127.89.224/reverse.php?format=json&lat='+position.latitude+'&lon='+position.longitude
    }, function (errAddress, address) {  //{"error":"Unable to geocode"}
        if(errAddress) {
            retObj.messages.push('Error getting secret');
            callback(retObj);
        } else {
            if(address) {
                address = JSON.parse(address.body);
                position.address = address.display_name;
            }
            retObj.status=true;
            retObj.messages.push('Success');
            callback(retObj);
        }
    });
}

module.exports = new Gps();


// SELECT	@distance := 1.609344 * 3956 * 2 * ASIN(SQRT( POWER(SIN((@lastLatitude - :latitude) *  pi()/180 / 2), 2) +COS(@lastLatitude * pi()/180) * COS(:latitude * pi()/180) * POWER(SIN((@lastLongitude - :longitude) * pi()/180 / 2), 2) ));