
var nodeGeocoder = require('node-geocoder');
var config = require('./../config/config');

var request = require('request');


var devicePostions = require('./../models/schemas').GpsColl;
var SecretKeyColl = require('./../models/schemas').SecretKeysColl;
var SecretKeyCounterColl = require('./../models/schemas').SecretKeyCounterColl;
var TrucksColl = require('./../models/schemas').TrucksColl;
var archivedDevicePositions = require('./../models/schemas').archivedDevicePositionsColl;
var gpsSettingsColl = require('./../models/schemas').GpsSettingsColl;
var DeviceColl = require('./../models/schemas').DeviceColl;


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

Gps.prototype.addDevicePositions = function (position, callback) {
    var retObj = {
        status: false,
        messages: []
    };
    //If the data structure is bad fix it here(Sometimes position.valid will have latitude data). Don't know why
    if (position.latitude === 'true' || position.latitude === 'false') {
        position.latitude = position.valid;
        position.valid = false
    }
    if (position.attributes) {
        position.attributes = JSON.parse(position.attributes);
    }
    position.location = {};
    position.location.type = "Point";
    position.location.coordinates = [position.longitude, position.latitude];
    position.speed=(position.speed*1.852);
    currentPosition = {"position":position};
    currentPosition.position.lastUpdated = new Date();
    //Sometimes the latitude and longiture are coming as 0, ignore the position
    if(Number(position.longitude)!==0 && Number(position.latitude)!==0) {
        if (!position.address || position.address === '{address}') { //if address is not provided by traccar use OSM
            getOSMAddress(position, function (updatedAddress) {
                if (updatedAddress.status) {
                    findAccountSettingsForIMIE(currentPosition, function (result) {
                        callback(result);
                    })
                } else {
                    callback(retObj);
                }
            })
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
    DeviceColl.find({imei:currentPosition.position.uniqueId},{accountId:1,isIdle:1,"attrs.latestLocation":1},function (err,deviceData) {
        if(err){
            retObj.status=false;
            retObj.messages.push('Error fetching data');
            callback(retObj);
        }else{
            if(!deviceData) {
                console.error("No device found for "+ JSON.stringify(deviceData));
            } else {
                var settings = accountGPSSettings[deviceData[0].accountId]
                if(settings) {
                    saveGPSPosition(currentPosition,settings, deviceData[0].attrs.latestLocation, function(saveResponse){
                        console.log('save response');
                    });
                } else {
                    console.log('looking up account settings '+ deviceData[0].accountId);
                    gpsSettingsColl.findOne({accountId:deviceData.accountId},{},function (err,gpsSettings) {
                        accountGPSSettings[deviceData.accountId] = gpsSettings;
                        saveGPSPosition(currentPosition,gpsSettings, deviceData[0].attrs.latestLocation, function(saveResponse){
                            console.log('save response');
                        });
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
        var idealTime=(accountSettings.idealTime || 20) * 60000;
        var stopTime=(accountSettings.idealTime || 60) * 60000;
        if(!lastLocation){ //if the device data is not available set it now
            lastLocation = {};
            lastLocation.isIdle = false;
            lastLocation.isStopped = false;
            lastLocation.position = currentLocation;
            lastLocation.position.lastUpdated = new Date();
            console.log('No old location found for Device:imei:'+JSON.stringify(currentLocation))
            updateTruckDeviceAndDevicePositions(lastLocation);
        } else { //if the latest location is available on the deivice then compare the current position with it to check if the vehicle is idle

            //no change in position co-ordinates, so it may idle or stoppped
            if(lastLocation.position.location.coordinates[0] === currentLocation.position.location.coordinates[0] &&
                lastLocation.position.location.coordinates[1] === currentLocation.position.location.coordinates[1]){
                if(lastLocation.isIdle){
                    if(currentLocation.position.lastUpdated && lastLocation.position.lastUpdated &&  currentLocation.position.lastUpdated.getMilliseconds() - lastLocation.position.lastUpdated.getMilliseconds() > stopTime){
                        currentLocation.isStopped = true;
                    }
                } else {
                    if(currentLocation.position.lastUpdated && lastLocation.position.lastUpdated && currentLocation.position.lastUpdated.getMilliseconds() - lastLocation.position.lastUpdated.getMilliseconds() > idealTime){
                        currentLocation.isIdle = true;
                    }
                }
            } else { //calculate the distance travelled
                var lastLatitude=lastLocation.location.coordinates[1];
                var lastLongitude=lastLocation.location.coordinates[0];
                var currentLatitude=currentLocation.location.coordinates[1];
                var currentLongitude=currentLocation.location.coordinates[0];
                //position.distance = 1.609344 * 3956 * 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((latitude-position.location.coordinates[1])*Math.PI/180 /2),2)+Math.cos(latitude*Math.PI/180)*Math.cos(position.location.coordinates[1]*Math.PI/180)*Math.pow(Math.sin((longitude-position.location.coordinates[0])*Math.PI/180/2),2)))
                currentLocation.distance = 1.609344 * 3956 * 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((currentLatitude-lastLatitude)*Math.PI/180 /2),2)+Math.cos(lastLatitude*Math.PI/180)*Math.cos(currentLatitude*Math.PI/180)*Math.pow(Math.sin((currentLongitude-lastLongitude)*Math.PI/180/2),2)))
                currentLocation.totalDistance=lastLocation.totalDistance+currentLocation.distance;
            }
            updateTruckDeviceAndDevicePositions(currentLocation);
        }

}

function updateTruckDeviceAndDevicePositions(currentLocation) {
    DeviceColl.update({imei:currentLocation.position.uniqueId},{$set:{"attrs.latestLocation":currentLocation}},function (error, deviceSaveResponse) {
        if(error){
            console.error("Error saving latest location in to device")
        } else {
            if(deviceSaveResponse.nModified !== 1){
                console.error('Error updating for device imei '+ currentLocation.position.uniqueId);
            } else {
                console.log('Device updated');
            }

        }
    });
    TrucksColl.update({deviceId:currentLocation.position.uniqueId},{$set:{"attrs.latestLocation":currentLocation}},function (error, truckSaveResponse) {
        if(error){
            console.error("Error saving latest location in to device")
        } else {
            if(truckSaveResponse.nModified !== 1){
                console.error('Error updating for truck for deviceId '+ currentLocation.position.uniqueId);
            } else {
                console.log('Truck updated');
            }
        }
    });
    //save to device positions
    positionData=new devicePostions(currentLocation.position);
    positionData.save(function (err, updated) {
        if(err){
            console.log('failed adding new device position')
        }else{
            console.log('Device position saved '+ updated);
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