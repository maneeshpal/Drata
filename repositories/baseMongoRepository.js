var mongo = require('mongodb');
var config = require('../routes/config.json');
var _ = require('underscore');
var Q = require('q');
var BSON = mongo.BSONPure;

var mongoClients = {}, dbs = {};
var serverNames = config.dataSources.map(function(d){
        return d.alias;   
    });

var mongoSources = config.dataSources.filter(function(d){
    return d.type === 'mongodb';
});

_.each(mongoSources, function(server){
    var instance = new mongo.MongoClient(new mongo.Server(server.serverName, server.port));   
    instance.open(function(err, mongoClient) {
        if(err){
            console.log(server.alias + ' connection refused');
        }else{
            mongoClients[server.alias] = mongoClient;
            dbs[server.alias] = {}; 
            console.log('new server: ' + server.alias); 
        }
    });
})

var connectionCount = 0;
exports.dbInstance = function(){
    var _name, _serverName;
    function _connect(){
        var defer = Q.defer();
        if(!dbs[_serverName]) {
            if(serverNames.indexOf(_serverName) > -1){
                var server = _.find(config.dataSources, function(s){
                    return s.alias === _serverName;
                });
                var instance = new mongo.MongoClient(new mongo.Server(server.serverName, server.port));   
                instance.open(function(err, mongoClient) {
                    if(err){
                        console.log(_serverName + ' connection refused');
                        defer.reject({code: 500, message:_serverName + ' connection refused'});
                    }else{
                        mongoClients[_serverName] = mongoClient;
                        dbs[_serverName] = {}
                        dbs[_serverName][_name] = mongoClient.db(_name); 
                        console.log('new server: ' + _serverName);
                        defer.resolve(dbs[_serverName][_name]);
                    }
                });
            }
            else{
                defer.reject({code: 500, message: _serverName +' not found'});
            }
        }
        else{
            if(!dbs[_serverName][_name]){
                dbs[_serverName][_name] = mongoClients[_serverName].db(_name);
            }
            defer.resolve(dbs[_serverName][_name]);    
        }
        return defer.promise;
    };

    _connect.dbName = function(val){
        if(!_serverName) throw "Server not speficied";
        if (!arguments.length) return _name;
        _name = val;
        return _connect;
    };

    _connect.serverName = function(val){
        if (!arguments.length) return _serverName;
        _serverName = val;
        return _connect;
    };
    return _connect;
};
