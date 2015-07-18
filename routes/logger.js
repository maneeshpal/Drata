

var UAParser = require('ua-parser-js');
var parser = new UAParser();
var MongoClient = require('mongodb').MongoClient;
var config = require('../routes/config.json');
var Q = require('q');
var utils = require('../utils/utils');
var baseMongoRepository = require('../repositories/baseMongoRepository');

var openConnection = function() {
    return baseMongoRepository.dbInstance(config.drataInternal.alias, config.drataInternal.databaseName);
};


var connectToCollection = function(name) {
    return openConnection()
    .then(function(db) {
        var defer = Q.defer();
        db.collection(name, function(err, collection) {
            if(err){
                defer.reject({code:500, message: 'connection to logging failed'});
            }
            else{
                defer.resolve(collection);
            }
        });
        return defer.promise;
    });
};

var requestLogConnection = connectToCollection('requestlog');

var getLoggingInformation = function(req, events) {
    var log = {
        dateLogged: new Date(),
        url: req.url,
        ipAddress: req.headers['x-forwarded-for'] || 
            req.connection.remoteAddress || 
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress,
        userAgent: parser.setUA(req.headers['user-agent']).getResult()
    }
    if(events) log.events = utils.clone(events);

    return log;
};

exports.logRequest = function(req, events) {
    var promise = requestLogConnection.then(function(collection) {
        var defer = Q.defer();
        var info = getLoggingInformation(req, events);
        collection.insertOne(info, function(err, result) {
            err ? defer.reject({code: 500, message: 'loggin failed'}) : defer.resolve(result);
        });
        return defer.promise;
    });

    // promise.done(function() {
    //     console.log('logged');
    // }, function(err) {
    //     console.log(err);
    // });
}


