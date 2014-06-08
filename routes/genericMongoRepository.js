var mongo = require('mongodb');
var config = require('./config.json');
var _ = require('underscore');
var BSON = mongo.BSONPure;

var mongoClients = {}, dbs = {};
var serverNames = config.dataSources.map(function(d){
        return d.alias;   
    });

_.each(config.dataSources, function(server){
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

    
    function _connect(callback){
        if(!dbs[_serverName]) {
            if(serverNames.indexOf(_serverName) > -1){
                var server = config.dataSources.filter(function(s){
                    return s.alias === _serverName;
                })[0];
                var instance = new mongo.MongoClient(new mongo.Server(server.serverName, server.port));   
                instance.open(function(err, mongoClient) {
                    if(err){
                        console.log(_serverName + ' connection refused');
                        callback && callback();
                    }else{
                        mongoClients[_serverName] = mongoClient;
                        dbs[_serverName] = {}
                        dbs[_serverName][_name] = mongoClient.db(_name); 
                        console.log('new server: ' + _serverName);
                        callback && callback(dbs[_serverName][_name]);
                    }
                });
            }
            else{
                callback && callback();
                return;
            }
        }
        else{

            if(!dbs[_serverName][_name]){
                dbs[_serverName][_name] = mongoClients[_serverName].db(_name);
                console.log('new');
            }
            console.log('server: ' + _serverName + ' , database: ' + _name); 
            callback && callback(dbs[_serverName][_name]);    
        }
        
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
