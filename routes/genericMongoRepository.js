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


// var getServer = function(alias){
//     return config.dataSources.filter(function(s){
//         return s.alias === alias;
//     })[0];
// }
var connectionCount = 0;
exports.dbInstance = function(){
    var _name, _serverName;

    function _connect(callback){
        if(!dbs[_serverName]) {
            callback && callback();
            return;
        }

        if(!dbs[_serverName][_name]){
            dbs[_serverName][_name] = mongoClients[_serverName].db(_name);
            console.log('new');
        }
        console.log('server: ' + _serverName + ' , database: ' + _name); 
        callback && callback(dbs[_serverName][_name]);
    }

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
