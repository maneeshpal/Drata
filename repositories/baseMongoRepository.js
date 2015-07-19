var MongoClient = require('mongodb').MongoClient;
var config = require('../routes/config.json');
var utils = require('../utils/utils');
var _ = require('underscore');
var Q = require('q');
var BSON = require('mongodb').BSONPure;

var dataSources = {};

config.dataSources.filter(function(d){
    return d.type === 'mongodb';
}).forEach(function(dataSource) {
    dataSources[dataSource.alias] =  dataSource;
});

dataSources[config.drataInternal.alias] = config.drataInternal;

var dbInstances = {};
function resetConnection (key) {
	if(!dbInstances[key]) return;

    console.log('max connection reached.'+ key + '. Resetting..');
    dbInstances[key].dbInstance.close();
    dbInstances[key].dbInstance = undefined;
    dbInstances[key].connectionCount = 0;
}

exports.dbInstance = function (serverName, dbName) {
    var defer = Q.defer();
    var key = serverName + dbName;
    var dataSource = dataSources[serverName];
    if(dbInstances[key] && dbInstances[key].connectionCount >= 9) {
        resetConnection(key);
    }
    if(dbInstances[key] && dbInstances[key].dbInstance) {
        dbInstances[key].connectionCount ++;
        defer.resolve(dbInstances[key].dbInstance);
    }
    else {
	    var url = utils.format('mongodb://{0}:{1}/{2}', dataSource.serverName, dataSource.port, dbName);
	    MongoClient.connect(url,
	        { 
	            server: {
	                poolSize: 10
	            }
	        }, function(err, db) {
        	if (err) {
        		defer.reject({ code: 500, message: err.message + '; Cannot connect to: '+ url });
        		resetConnection(key);
        	} else {
    			dbInstances[key] = {
    				dbInstance: db,
    				connectionCount: 0
    			}
        		defer.resolve(db);
        	}
	    })
	}

    return defer.promise;
};