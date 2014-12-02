
var config = require('./config.json'),
    mongoRepository = require('../repositories/mongoRepository'),
    sqlRepository = require('../repositories/sqlRepository'),
    Q = require('q');

var getInstance = function(datasource){
    var defer = Q.defer();
    var dataSourceType = config.dataSources.filter(function(item){
        return item.alias === datasource;
    });

    if(!dataSourceType || dataSourceType.length === 0){
        defer.reject();
        return;
    }

    switch (dataSourceType[0].type){
        case 'mongodb':
            defer.resolve(mongoRepository);
        break;
        case 'sqlserver':
            defer.resolve(sqlRepository);
        default:
            defer.reject();
        break;
    }
    return defer.promise;
};

exports.getDatabaseNames = function(req, res){
    getInstance(req.params.datasource)
    .then(function(instance){
        instance.getDatabaseNames(req.params.datasource)
        .then(function(result){
            res.send(result);
        }, function(err){
            res.send(err.code, err.message);
        });
    }, function(err){
        res.send(404);
    });
};

exports.getCollectionNames = function(req, res){
    getInstance(req.params.datasource)
    .then(function(instance){
        instance.getCollectionNames(req, res);
    }, function(err){
        res.send(404);
    });
};

exports.findProperties = function(req, res){
    getInstance(req.params.datasource)
    .then(function(instance){
        instance.findProperties(req, res);
    }, function(err){
        res.send(404);
    });
};

exports.findCollection = function(req, res){
    getInstance(req.params.datasource)
    .then(function(instance){
        instance.findCollection(req, res);
    }, function(err){
        res.send(404);
    });
};