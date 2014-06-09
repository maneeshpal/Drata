//var mongo = require('mongodb');
var utils = require('./utils');
var aggregator = require('./aggregator');
var config = require('./config.json');
var baseMongoRepo = require('./genericMongoRepository');
//var BSON = mongo.BSONPure;

//var mongoClients = {};
var serverNames = config.dataSources.map(function(d){
    return d.alias;   
});

exports.pop = function(req, res){
    populateDB(req, res);
};

exports.getDataSourceNames = function(req, res){
    res.json(serverNames);
};

exports.getDatabaseNames = function(req, res){
    baseMongoRepo.dbInstance().serverName(req.params.datasource).dbName('local')(function(db){
        if(!db){
            res.send(500, 'Database connection failure.');
            return;
        }
        db.admin().listDatabases(function(err, resp){
            if(err){
                res.send(500);
                return;
            }
            res.json(resp.databases.map(function(d){
                return d.name;
            }));    
        });
    });
};

exports.getCollectionNames = function(req, res) {
    baseMongoRepo.dbInstance().serverName(req.params.datasource).dbName(req.params.dbname)(function(db){
        if(!db){
            res.send(500, 'Database connection failure.');
            return;
        }
        db.collectionNames(function(err, result) {
            if(err){
                res.send(500);
                return;
            }
            //console.log('getting collections');
            //console.log(JSON.stringify(result, null, '\t'));
            var returnCollections = result.filter(function(v){
                return v.name.indexOf('.system.') < 0;
            }).map(function(v){
                return v.name.replace(req.params.dbname + '.','');
            });
            res.send(returnCollections);
            //db.close();
        });
    });
};

exports.findProperties = function(req, res){
    baseMongoRepo.dbInstance().serverName(req.params.datasource).dbName(req.params.dbname)(function(db){
        if(!db){
            res.send(500, 'Database connection failure.');  
            return;
        }
        var collectionName = req.params.collectionName;
        db.collection(collectionName, function(err, collection) {
            if(err){
                res.send(500);
                return;
            }
            collection.find({$query:{}, $orderby:{$natural:-1}, $maxScan : 100}).toArray(function(err, items) {
                if(err){
                    res.send(500);
                    return;
                }
                res.send(utils.getUniqueProperties(items));
                //db.close();
            });
        });
    });
};

exports.findCollection = function(req, res) {
    baseMongoRepo.dbInstance().serverName(req.params.datasource).dbName(req.params.dbname)(function(db){
        if(!db){
            res.send(500, 'Database connection failure.');
            return;
        }
        var collectionName = req.params.collectionName;
        var segment = req.body;
        //console.log('my segment :' + JSON.stringify(segment, 'null', '\t'));
        var query = utils.getMongoQuery(segment);
        var selectOnly = utils.buildReturnPoperties(segment);
        //console.log('mongo query :' + JSON.stringify(query, null, '\t'));
        //console.log('select only :' + JSON.stringify(selectOnly, null, '\t'));
        var ss = +(new Date());
        db.collection(collectionName, function(err, collection) {
            if(err){
                res.send(500, 'Cannot access collection '+ collectionName);
                return;
            }
            collection.find(query, selectOnly, {sort:segment.dataFilter.dateProp}).toArray(function(err, items) {
                if(err){
                    res.send(500);
                    return;
                }
                console.log('got response : ' + (+(new Date()) - ss));
                ss = +(new Date());
                var ret = [];
                for(var i = 0; i< items.length; i++){
                    ret.push(utils.flatten(items[i]));
                }
                console.log('flattened result : ' + (+(new Date()) - ss));
                ss = +(new Date());
                
                var graphData;
                try{
                    graphData = aggregator.aggregator.getGraphData(segment, ret);    
                }
                catch(e){
                   res.send(500, e); 
                   return;
                }
                console.log('aggregator done : ' + (+(new Date()) - ss));
                
                res.send(graphData);
                //db.close();
            });
            
        });
    });
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Populate database with sample data -- Only used once: the first time the application is started.
// You'd typically not find this code in a real-life app, since the database would already exist.
var populateDB = function(req, res) {
    var maxProps = 500;
    var data= [];
    var y = [0,0,0,0,0,0,0];
    var ordernumber = 1;
    var geos = ['texas', 'Alabama', 'Misissipi', 'Arizona', 'Minnesota'];
    var items = ['jeans', 'T Shirt', 'Under wear', 'Skirt', 'Pajama', 'Dress Shirt', 'Scarf', 'Women\'s Jacket'];
    var colors = ['blue', 'gray', 'black', 'white', 'purple'];
    var ageGroups = ['adult', 'baby', 'teen', 'Senior Citizen', 'Mid 40\'s'];
    var startDate = new Date('6/10/2009');
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
            timestamp : new Date(startDate.setHours(startDate.getHours() + j)),
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
        //console.log(dd.timestamp);
        data.push(dd);
    }
    baseMongoRepo.dbInstance().serverName('drataDemoExternal').dbName('shopperstop')(function(db){
        db.collection('shoppercheckout', function(err, collection) {
            if(err){
                res.send('something went wrong');
            }
            else{
                collection.insert(data, {safe:true}, function(err, result) {});
                res.send('done');    
            }
        });    
    });
};