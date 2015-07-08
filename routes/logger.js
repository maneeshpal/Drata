

var UAParser = require('ua-parser-js');
var parser = new UAParser();
var mongo = require('mongodb');
var config = require('../routes/config.json');
var Q = require('q');

var mongoClient = new mongo.MongoClient(new mongo.Server(config.drataInternal.serverName, config.drataInternal.port));

var openConnection = function() {
    var defer = Q.defer();
    mongoClient.open(function(err, mongoClient) {
        if(!err){
            var db = mongoClient.db(config.drataInternal.databaseName);
            defer.resolve(db);
        }else{
            defer.reject('cannot open connection');
        }
    });
    return defer.promise;
}


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


var getLoggingInformation = function(req) {
    return {
        url: req.url,
        ipAddress: req.headers['x-forwarded-for'] || 
            req.connection.remoteAddress || 
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress,
        userAgent: parser.setUA(req.headers['user-agent']).getResult()
    }
};

exports.logRequest = function(req) {
    if(!config.logRequests) return;
    
    var promise = connectToCollection('requestlog').then(function(collection) {
        var defer = Q.defer();
        var info = getLoggingInformation(req);
        collection.save(info, function(err, result) {
            err ? defer.reject({code: 500, message: 'loggin failed'}) : defer.resolve(result);
        });
        return defer.promise;
    });

    promise.done(function() {
        console.log('logged');
    }, function(err) {
        console.log(err);
    });
}


