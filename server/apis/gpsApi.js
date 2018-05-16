
var nodeGeocoder = require('node-geocoder');
var config = require('./../config/config');

var request = require('request');

var devicePostions = require('./../models/schemas').GpsColl;
var SecretKeyColl = require('./../models/schemas').SecretKeysColl;
var SecretKeyCounterColl = require('./../models/schemas').SecretKeyCounterColl;
var TrucksColl = require('./../models/schemas').TrucksColl;
var gpsSettingsColl = require('./../models/schemas').GpsSettingsColl;
var DeviceColl = require('./../models/schemas').DeviceColl;
var unknownPositions = require('./../models/schemas').unknownPositions;

var mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
var accountGPSSettings ={};
var Gps = function () {
};

Gps.prototype.testProject = function (callback) {
    callback({status:true,message:'success'});
};
/**
 * Module to resolve address using Google. We have installed OSM on
 */
function resolveAddress(position, callback) {
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

/**
 *
 * sample packet from GPS device
 * {"gprmc":"$GPRMC,081302.000,A,1823.8920,N,07746.0511,E,0.00,179.00,120418,,*06","name":"{name}","uniqueId":"358511020498451",
 * "deviceId":"358511020498451","protocol":"gt06","deviceTime":"1523520782000",
 * "fixTime":"1523520782000","valid":"true","latitude":"18.3982",
 * "longitude":"77.76751833333333","altitude":"0.0","speed":"0.0","course":"179.0",
 * "statusCode":"0xF020","attributes":"{\"sat\":7,\"mcc\":404,\"mnc\":0,\"lac\":5680,\"cell\":41781,
 * \"index\":71,\"ip\":\"223.237.42.133\"}","address":"{address}"}
 *
 * @param position
 * @param callback
 * @constructor
 */

Gps.prototype.addDevicePositions = function (currentPosition, callback) {
    var retObj = {
        status: false,
        messages: []
    };
    //If the data structure is bad fix it here(Sometimes position.valid will have latitude data). Don't know why
    if (currentPosition.latitude === 'true' || currentPosition.latitude === 'false') {
        currentPosition.latitude = currentPosition.valid;
        currentPosition.valid = false
    }
    if (currentPosition.attributes) {
        currentPosition.attributes = JSON.parse(currentPosition.attributes);
    }
    currentPosition.location = {};
    currentPosition.location.type = "Point";
    currentPosition.location.coordinates = [currentPosition.longitude, currentPosition.latitude];
    if(parseFloat(currentPosition.speed) == 0){
        currentPosition.isStopped = true;
        currentPosition.isIdle = true;
    }
    currentPosition.speed=(currentPosition.speed*1.852);
    currentPosition.lastUpdated = new Date();
    //Sometimes the latitude and longiture are coming as 0, ignore the position
    if(Number(currentPosition.longitude)!==0 && Number(currentPosition.latitude)!==0) {
        if (!currentPosition.address || currentPosition.address === '{address}') { //if address is not provided by traccar use OSM
            getOSMAddress(currentPosition, function (updatedAddress) {
               if (updatedAddress.status) {
                    findAccountSettingsForIMIE(currentPosition, function (result) {
                        callback(result);
                    })
                } else {
                    callback(retObj);
                }
            });
        }else {
            findAccountSettingsForIMIE(currentPosition, function (result) {
                callback(result);
            })
        }
    }else{
        retObj.messages.push('This is a default position');
        callback(retObj);
    }
};

/**
 * Find the account settings by IMIE code on device
 * @param position
 * @param callback
 */
function findAccountSettingsForIMIE(currentPosition, callback) {
    var retObj = {
        status: false,
        messages: []
    };
    DeviceColl.find({imei:currentPosition.uniqueId},{accountId:1,isIdle:1,"attrs.latestLocation":1},function (err,deviceData) {
        if(err){
            retObj.status=false;
            retObj.messages.push('Error fetching data');
            callback(retObj);
        }else{
            if(!deviceData || deviceData.length == 0) {
                unknownPosition = new unknownPositions({"data":currentPosition});
                unknownPosition.save(function (err, updated) {
                    console.error("No device found for "+ JSON.stringify(deviceData));
                });
            } else {
                if(deviceData[0].attrs.latestLocation.totalDistance == 0) {
                    console.error("error : "+ currentPosition.uniqueId +"  has 0 "+ JSON.stringify(deviceData[0].attrs.latestLocation));
                }
                //check for settings in accountSettigs cache
                var settings = accountGPSSettings[deviceData[0].accountId]
                if(settings) {
                    saveGPSPosition(currentPosition,settings, deviceData[0].attrs.latestLocation, function(saveResponse){
                        //console.log('save response');
                    });
                } else {
                    gpsSettingsColl.findOne({accountId:ObjectId(deviceData[0].accountId)},{},function (err,gpsSettings) {
                        if(err){
                            console.error("error finding GPSSettings "+ JSON.stringify(err));
                        } else {
                            if(gpsSettings&& gpsSettings._doc){
                                accountGPSSettings[deviceData.accountId] = gpsSettings._doc;
                                saveGPSPosition(currentPosition,gpsSettings._doc, deviceData[0].attrs.latestLocation, function(saveResponse){
                                    //console.log('save response');
                                });
                            } else {
                                saveGPSPosition(currentPosition,{}, deviceData[0].attrs.latestLocation, function(saveResponse){
                                    //console.log('save response');
                                });
                            }

                        }
                    });
                }
            }
        }
    })
}

/**
 * We will save the position data in device as well as the truck. For each position we will check and set if the device isIdle, isStopped
 *
 *  * sample packet from GPS device
 * {"gprmc":"$GPRMC,081302.000,A,1823.8920,N,07746.0511,E,0.00,179.00,120418,,*06","name":"{name}","uniqueId":"358511020498451",
 * "deviceId":"358511020498451","protocol":"gt06","deviceTime":"1523520782000",
 * "fixTime":"1523520782000","valid":"true","latitude":"18.3982",
 * "longitude":"77.76751833333333","altitude":"0.0","speed":"0.0","course":"179.0",
 * "statusCode":"0xF020","attributes":"{\"sat\":7,\"mcc\":404,\"mnc\":0,\"lac\":5680,\"cell\":41781,
 * \"index\":71,\"ip\":\"223.237.42.133\"}","address":"{address}"}
 * @param position
 * @param accountSettings
 * @param deviceData
 * @param callback
 */
function saveGPSPosition(currentLocation, accountSettings,lastLocation, callback){
        //we do not have idleTime in UI, so use minStopTime for both idleTime and stopTime
        var idealTime=20 * 60000;
        if(accountSettings && accountSettings.minStopTime){
            idealTime = parseInt(accountSettings.minStopTime) * 60000;
        }
        var stopTime=30 * 60000;
        if(accountSettings && accountSettings.minStopTime){
            stopTime = parseInt(accountSettings.minStopTime) * 60000;
        }

        if(!lastLocation){ //if the device data is not available set it now
            lastLocation = currentLocation;
            lastLocation.isIdle = false;
            lastLocation.isStopped = false;
            lastLocation= currentLocation;
            lastLocation.lastUpdated = new Date();
            lastLocation.totalDistance=0;
            //updateTruckDeviceAndDevicePositions(lastLocation);
        } else { //if the latest location is available on the deivice then compare the current position with it to check if the vehicle is idle
            //no change in position co-ordinates, so it may idle or stoppped
            if(parseFloat(lastLocation.location.coordinates[0]) === parseFloat(currentLocation.location.coordinates[0]) &&
                parseFloat(lastLocation.location.coordinates[1]) === parseFloat(currentLocation.location.coordinates[1])){
                if(lastLocation.isIdle){
                    if(currentLocation.lastUpdated && lastLocation.updatedAt &&  currentLocation.lastUpdated.getTime() - lastLocation.updatedAt.getTime() > stopTime){
                        currentLocation.isIdle = true;
                        currentLocation.isStopped = true;
                    }
                } else {
                    if(currentLocation.lastUpdated && lastLocation.updatedAt && currentLocation.lastUpdated.getTime() - lastLocation.updatedAt.getTime() > idealTime){
                        currentLocation.isIdle = true;
                    } else{
                        currentLocation.isIdle = false;
                        currentLocation.isStopped=false;
                    }
                }
            } else { //calculate the distance travelled
                currentLocation.isIdle = false;
                currentLocation.isStopped = false;
                var lastLatitude=lastLocation.location.coordinates[1];
                var lastLongitude=lastLocation.location.coordinates[0];
                var currentLatitude=currentLocation.location.coordinates[1];
                var currentLongitude=currentLocation.location.coordinates[0];
                //position.distance = 1.609344 * 3956 * 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((latitude-position.location.coordinates[1])*Math.PI/180 /2),2)+Math.cos(latitude*Math.PI/180)*Math.cos(position.location.coordinates[1]*Math.PI/180)*Math.pow(Math.sin((longitude-position.location.coordinates[0])*Math.PI/180/2),2)))
                currentLocation.distance = 1.609344 * 3956 * 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((currentLatitude-lastLatitude)*Math.PI/180 /2),2)+Math.cos(lastLatitude*Math.PI/180)*Math.cos(currentLatitude*Math.PI/180)*Math.pow(Math.sin((currentLongitude-lastLongitude)*Math.PI/180/2),2)))
                if(!currentLocation.distance||isNaN(currentLocation.distance)){
                    currentLocation.distance=0;
                }
                if(isNaN(lastLocation.totalDistance)){
                    console.error(" totalDistance is not found for "+ currentLocation.uniqueId + "   data:"+ JSON.stringify(lastLocation));
                    lastLocation.totalDistance = 0;
                }
                currentLocation.totalDistance=parseFloat(lastLocation.totalDistance)+parseFloat(currentLocation.distance);
                console.log("total distance for device "+ currentLocation.totalDistance +"   distance "+ currentLocation.distance +" old " + lastLocation.totalDistance);
            }
            if(currentLocation.totalDistance == 0){
                console.error(" fucking distance "+ currentLocation.uniqueId);
            } else {
                updateTruckDeviceAndDevicePositions(currentLocation);
            }
        }
}

function updateTruckDeviceAndDevicePositions(currentLocation) {

    //save to device positions
    positionData=new devicePostions(currentLocation);
    positionData.save(function (err, updated) {
        if(err){
            console.error('failed adding new device position')
        }else{
            DeviceColl.update({imei:currentLocation.uniqueId},{$set:{"attrs.latestLocation":updated}},function (error, deviceSaveResponse) {
                if(error){
                    console.error("Error saving latest location in to device")
                } else {
                    if(deviceSaveResponse.nModified !== 1){
                        console.error('Error updating for device imei '+ JSON.stringify(updated));
                    } else {
                       // console.log('Device updated '+ JSON.stringify(deviceSaveResponse));
                    }

                }
            });
            TrucksColl.update({deviceId:currentLocation.uniqueId},{$set:{"attrs.latestLocation":updated}},function (error, truckSaveResponse) {
                if(error){
                    console.error("Error saving latest location in to device")
                } else {
                    if(truckSaveResponse.nModified !== 1){
                        console.error('Error updating for truck for deviceId '+ currentLocation.uniqueId);
                    } else {
                        //console.log('Truck updated ' + JSON.stringify(truckSaveResponse));
                    }
                }
            });
        }
    });
}
//
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
            console.error('Error resolving OSM address');
            callback(retObj);
        } else {
            if(address) {
                try{
                    address = JSON.parse(address.body);
                    position.address = address.display_name;
                }catch(error) {
                    console.error("OSM error "+ JSON.stringify(error));
                }
            }
            retObj.status=true;
            retObj.messages.push('Success');
            callback(retObj);
        }
    });
}

module.exports = new Gps();


// SELECT	@distance := 1.609344 * 3956 * 2 * ASIN(SQRT( POWER(SIN((@lastLatitude - :latitude) *  pi()/180 / 2), 2) +COS(@lastLatitude * pi()/180) * COS(:latitude * pi()/180) * POWER(SIN((@lastLongitude - :longitude) * pi()/180 / 2), 2) ));