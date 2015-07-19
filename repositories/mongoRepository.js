//var mongo = require('mongodb');
var utils = require('../utils/utils');
var queryGenerator = require('../utils/mongoquerygenerator');
var aggregator = require('../utils/aggregator');
var config = require('../routes/config.json');
var baseMongoRepo = require('./baseMongoRepository');
var Q = require('q');

var excludedDatabaseNames = ['local', 'admin', 'db'];
var excludedCollectionNames = ['system.indexes'];

exports.getDatabaseNames = function(datasource){
    var getDbInstance = baseMongoRepo.dbInstance(datasource, 'local');
    return getDbInstance.then(function(db){
        var defer = Q.defer();
        db.admin().listDatabases(function(err, resp){
            if(err){
                defer.reject({code: 500, message:'Error getting database names'});
            }
            else{
                defer.resolve(resp.databases
                    .filter(function(v) {
                        return excludedDatabaseNames.indexOf(v.name) < 0;
                    }).map(function(d){
                        return d.name;
                }));
            }
        });
        return defer.promise;
    });
};

exports.getCollectionNames = function(datasource, database) {
    var getDbInstance = baseMongoRepo.dbInstance(datasource, database);
    return getDbInstance.then(function(db){
        var defer = Q.defer();
        db.listCollections().toArray(function(err, result) {
            if(err){
                defer.reject({code: 500, message: 'Error retreiving collection names'});
            }
            else{
                var returnCollections = result.filter(function(v){
                    return excludedCollectionNames.indexOf(v.name) < 0;
                }).map(function(v){
                    return v.name.replace(database + '.','');
                });
                defer.resolve(returnCollections);
            }
        });
        return defer.promise;
    });
};

exports.findProperties = function(datasource, database, collectionName){
    var getDbInstance = baseMongoRepo.dbInstance(datasource, database);
    return getDbInstance.then(function(db){
        var defer = Q.defer();
        db.collection(collectionName, function(err, collection) {
            if(err){
                defer.reject({code:500, message: 'Error retreiving properties for collection: ' + collectionName});
            }
            else{
                collection.find({$query:{}, $orderby:{$natural:-1}, $maxScan : 100}).toArray(function(err, items) {
                    if(err){
                        defer.reject({code:500, message: 'Error retreiving properties for collection: ' + collectionName});
                    }
                    else{
                        defer.resolve(utils.getUniqueProperties(items));
                    }
                });
            }
        });
        return defer.promise;
    });
};

exports.findCollection = function(datasource, database, collectionName, segment) {
    var getDbInstance = baseMongoRepo.dbInstance(datasource, database);
    return getDbInstance.then(function(db) {
        var defer = Q.defer();
        var query = queryGenerator.getQuery(segment);
        var selectOnly = queryGenerator.getProperties(segment);
        db.collection(collectionName, function(err, collection) {
            if(err) {
                defer.reject({code: 500, message: 'Cannot access collection '+ collectionName, ex: err});
            }
            else {
                collection.find(query, selectOnly).toArray(function(err, items) {
                    if(err) {
                        defer.reject({ code: 500, message: utils.format('Error executing Mongo query on [{0}].[{1}].[{2}]', datasource,database, collectionName), ex: err });
                    }
                    else {
                        var ret = [];
                        for(var i = 0; i < items.length; i++) {
                            ret.push(utils.flatten(items[i]));
                        }
                        try {
                            if(segment.clientAggregation) {
                                defer.resolve(ret);    
                            }
                            else {
                                var graphData = aggregator.getGraphData(segment, ret);
                                defer.resolve(graphData);    
                            }
                            
                        }
                        catch(e) {
                           defer.reject({ code: 500, message: 'Error processing data. Check segmentation.', ex: err });
                        }
                    }
                });
            }
        });
        return defer.promise;
    });
};

exports.pop = function() {
    var maxProps = 5000;
    var data= [];
    var y = [0,0,0,0,0,0,0];
    var ordernumber = 1;
    var geos = ['texas', 'Alabama', 'Misissipi', 'Arizona', 'Minnesota', 'Mindi'];
    var items = ['jeans', 'T Shirt', 'Under wear', 'Skirt', 'Pajama', 'Dress Shirt', 'Scarf', 'Women\'s Jacket'];
    var colors = ['blue', 'gray', 'black', 'white', 'purple'];
    var ageGroups = ['adult', 'baby', 'teen', 'Senior Citizen', 'Mid 40\'s'];
    var startDate = new Date('1/1/1992');
    for(var j = 0; j <= maxProps; j++){
        for(var yy = 0; yy < y.length; yy++){
            y[yy] += Math.floor((Math.random() * 10 - j%10));
        }
        //y += (Math.random() * 10 - j%10);
        ordernumber = 10 + (Math.floor(j/ 3) * (3)); // 3 items per order
        var dd = {
            //ordernumber : ordernumber,
            item : items[Math.floor(Math.random() * items.length)],
            price : Math.abs(y[0]) * 100,
            geography : geos[Math.floor(Math.random() * geos.length)],
            timestamp : new Date(startDate.setMinutes(startDate.getMinutes() + j)),
            sex : Math.random() * 10 > 5 ? 'female': 'male',
            itemsex :  Math.random() * 10 > 6 ? 'female': 'male',
            hasCoupon :  Math.random() * 10 > 7,
            discount: Math.abs(Math.floor(y[1])),
            color : colors[Math.abs(Math.floor(y[1]%5))],
            errorCount: Math.abs(Math.floor(y[2]% 10)),
            pageLoadTime : Math.abs(Math.floor(y[3])) * 500,
            tax : Math.abs(y[0]) * 8,
            shippingPrice: Math.abs(y[0]) * 12,
            itemAgeGroup : ageGroups[Math.abs(y[4] %5)],
            totalItems : Math.floor(Math.abs(y[5]) % 10),
            total: {
                price : Math.abs(y[0]) * 100,
                tax : Math.abs(y[0]) * 8,
                shippingPrice: Math.abs(y[0]) * 12
            }
        };
        
        data.push(dd);
    }
    var getDbInstance = baseMongoRepo
        .dbInstance('drataDemoExternal', 'shopperstop');
        
    return getDbInstance.then(function(db){
        var defer = Q.defer();
        db.collection('shoppercheckout', function(err, collection) {
            if(err){
                console.log(err);
                defer.reject({code: 500, message: 'something went wrong'});
            }
            else {

                // Create ordered bulk, for unordered initializeUnorderedBulkOp()
                
                collection.bulkWrite([
                    { 
                        deleteMany: { 
                            filter: {} 
                        } 
                    }] , {
                        ordered:false, 
                        w: -1
                    }, function(insertErr, r) {
                        if(insertErr){
                            defer.reject({code: 500, message: insertErr});
                        }
                        else {
                            var bulk = collection.initializeOrderedBulkOp();
                            
                            for(var i = 0; i < data.length; i++) {
                                bulk.insert(data[i]);
                            }
                            bulk.execute(function(err, result) {
                                err ? defer.reject(err) : defer.resolve({message: 'shoppercheckout collection populated successfully'});  
                            });
                        }
                });
            }
        });
        return defer.promise;   
    });
};