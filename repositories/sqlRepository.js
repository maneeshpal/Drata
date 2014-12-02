//var mongo = require('mongodb');
var utils = require('./utils');
var aggregator = require('./aggregator');
var config = require('./config.json');


var getConfig = function(datasource, dbname){
    var ds = config.dataSources.filter(function(d){
        return d.alias === datasource;
    })[0];
    return {
        user: ds.username,
        password: ds.password,
        server: ds.serverName,
        database: dbname,
        options: {
            encrypt: false // Use this if you're on Windows Azure
        }
    };
}
var sql = require('mssql'); 

exports.getDatabaseNames = function(req, res){
    res.json(['uShipDevTrunk']);
};

exports.getCollectionNames = function(req, res) {

    var query = 'SELECT TABLE_SCHEMA AS \'schema\', TABLE_NAME As \'name\' FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\' ORDER BY TABLE_SCHEMA, TABLE_NAME';

    var conStr = getConfig(req.params.datasource, req.params.dbname);

    sql.connect(conStr, function(err) {
        var request = new sql.Request();
        request.query(query, function(err, recordset) {
            if(err){
                console.log(JSON.stringify(err, null, '\t'));
                res.send(500);
                return;
            }
            res.json(recordset.map(function(d){
                return d.schema ? d.schema + '.' + d.name : d.name;
            }));
        });
    });
};


exports.findProperties = function(req, res){
    var conStr = getConfig(req.params.datasource, req.params.dbname);
    
    sql.connect(conStr, function(err) {
        var request = new sql.Request();
        var schemaSplit = req.params.collectionName.split('.');
        var query = utils.format('SELECT c.Name as property_name, t.name as datatype FROM sys.columns c JOIN sys.objects o ON o.object_id = c.object_id JOIN sys.types t ON t.user_type_id = c.user_type_id JOIN sys.schemas s ON o.schema_id = s.schema_id WHERE s.name =\'{0}\' AND o.name = \'{1}\'', schemaSplit[0], schemaSplit[1]);
        request.query(query, function(err, recordset) {
            if(err){
                console.log(JSON.stringify(err, null, '\t'));
                res.send(500);
                return;
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
                    converted_datatype = 'string';
                    break;
                    case 'bit':
                    converted_datatype = 'bool';
                    case 'datetime':
                    converted_datatype = 'date';
                    break;
                    default :
                    converted_datatype = 'numeric';
                }

                ret[d.property_name] = converted_datatype;
            }
            
            res.json(ret);
        });
    });
};

exports.findCollection = function(req, res) {
    var conStr = getConfig(req.params.datasource, req.params.dbname);
    var segment = req.body;
    sql.connect(conStr, function(err) {
        var request = new sql.Request();
        var query = utils.getSqlQuery(req.params.dbname, req.params.collectionName, segment);
        
        console.log('sql query : ' + query);
        
        request.query(query, function(err, recordset) {
            if(err){
                console.log(JSON.stringify(err, null, '\t'));
                res.send(500);
                return;
            }
            var graphData;
            try{
                graphData = aggregator.aggregator.getGraphData(segment, recordset);    
            }
            catch(e){
               res.send(500, e); 
               return;
            }
            //console.log('aggregator done : ' + (+(new Date()) - ss));
            
            res.send(graphData);
            
        });
    });
};




