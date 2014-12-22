//var mongo = require('mongodb');
var utils = require('../utils/utils');
var aggregator = require('../utils/aggregator');
var config = require('../routes/config.json');
var Q = require('q');
var _ = require('underscore');
var sql = require('mssql');

var getConfig = function(datasource, database){
    var ds = _.find(config.dataSources, function(d){
        return d.alias === datasource;
    });
    return {
        user: ds.username,
        password: ds.password,
        server: ds.serverName,
        database: database,
        options: {
            encrypt: false
        }
    };
}

var connectToDatabase = function(datasource, database) {
    var conStr = getConfig(datasource, database);
    //console.log(JSON.stringify(conStr, null, '\t'));
    var defer = Q.defer();
    var connection = sql.connect(conStr, function(err) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            defer.reject({code:500, message: utils.format('Error connecting to Sql Server: {0}, database: {1}', datasource, database)});
        }
        else{
            defer.resolve(new sql.Request(connection));
        }
    });
    return defer.promise;
};

exports.getDatabaseNames = function(datasource){
    return connectToDatabase(datasource, 'master').then(function(request){
        var defer = Q.defer();
        var query = 'SELECT name FROM sysdatabases WHERE name NOT IN (\'master\', \'tempdb\', \'model\', \'msdb\')';
        request.query(query, function(err, recordset) {
            if(err){
                defer.reject({code: 500, message:utils.format('Error retrieving database names for Sql Server: {0}', datasource)});
            }
            else{
                //console.log(JSON.stringify(recordset, null, '\t'));
                defer.resolve(recordset.map(function(d){
                    return d.name;
                }));
            }
        });
        return defer.promise;
    });
};

exports.getCollectionNames = function(datasource, database) {
    return connectToDatabase(datasource, database).then(function(request){
        var defer = Q.defer();
        var query = 'SELECT TABLE_SCHEMA AS \'schema\', TABLE_NAME As \'name\' FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\' ORDER BY TABLE_SCHEMA, TABLE_NAME';
        request.query(query, function(err, recordset) {
            if(err){
                defer.reject({code: 500, message:utils.format('Error retrieving table names for Sql Server: {0}, database: {1}', datasource, database)});
            }else{
                //console.log(JSON.stringify(recordset, null, '\t'));
                defer.resolve(recordset.map(function(d){
                    return d.schema ? d.schema + '.' + d.name : d.name;
                })); //json
            }
        });
        return defer.promise; 
    });
};

exports.findProperties = function(datasource, database, collectionName){
    return connectToDatabase(datasource, database).then(function(request){
        var defer = Q.defer();
        var schemaSplit = collectionName.split('.');
        var query = utils.format('SELECT c.Name as property_name, t.name as datatype FROM sys.columns c JOIN sys.objects o ON o.object_id = c.object_id JOIN sys.types t ON t.user_type_id = c.user_type_id JOIN sys.schemas s ON o.schema_id = s.schema_id WHERE s.name =\'{0}\' AND o.name = \'{1}\'', schemaSplit[0], schemaSplit[1]);
        request.query(query, function(err, recordset) {
            if(err){
                //console.log(JSON.stringify(err, null, '\t'));
                defer.reject({code:500, message: utils.format('Error retreiving properties for table: {0}', collectionName)});
            }

            var ret = {}, d, converted_datatype;
            for(var i=0;i<recordset.length;i++){
                d = recordset[i];
                switch(d.datatype){
                    case 'varchar':
                    case 'xml':
                    case 'image':
                    case 'unique_identifier':
                    case 'varbinary':
                    case 'nvarchar':
                    case 'nchar':
                        converted_datatype = 'string';
                        break;
                    case 'bit':
                        converted_datatype = 'bool';
                        break;
                    case 'datetime':
                    case 'date':
                        converted_datatype = 'date';
                        break;
                    default :
                        converted_datatype = 'numeric';
                }

                ret[d.property_name] = converted_datatype;
            }
            
            defer.resolve(ret); //json
        });
        return defer.promise;
    });
};

exports.findCollection = function(datasource, database, collectionName, segment) {
    return connectToDatabase(datasource, database).then(function(request){
        var defer = Q.defer();
        var query = utils.getSqlQuery(database, collectionName, segment);
        request.query(query, function(err, recordset) {
            if(err){
                //console.log(JSON.stringify(err, null, '\t'));
                defer.reject({code: 500, message: utils.format('Error executing Sql query on [{0}].[{1}].[{2}]', datasource,database, collectionName)});
            }
            try{
                defer.resolve(aggregator.getGraphData(segment, recordset));
            }
            catch(e){
               defer.reject({code: 500, message: 'Error processing data. Check the segmentation.'});
            }
        });
        return defer.promise;
    });
};