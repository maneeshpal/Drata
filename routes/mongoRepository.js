var mongo = require('mongodb');
var utils = require('./utils');
var config = require('./config.json');
//var Server = mongo.Server;
//var Db = mongo.Db;
var BSON = mongo.BSONPure;

//var databaseName = 'shopperstop';
//var server = new Server('localhost', 27017, {auto_reconnect: true});
//var db = new Db(databaseName, server);

var mongoClient = new mongo.MongoClient(new mongo.Server(config.mongo.serverName, config.mongo.port));

var dbs = {};

mongoClient.open(function(err, mongoClient) {
    if(!err){
        console.log('mongo connection opened');
    }
});

var dbInstance = function(name){
    var _name = name;

    function connecta(callback){
        // var db = new Db(_name, server);
        // db.open(function(err, db){
        //     callback && callback(db);
        //     console.log('closing my connection');
        //     //db.close();
        // });
        //mongoClient.open(function(err, mongoClient) {
            dbs[_name] = dbs[_name] || mongoClient.db(_name);
            callback && callback(dbs[_name]);
            //mongoClient.close();
        //});
    }

    // connecta.name = function(val){
    //     if (!arguments.length) return _name;
    //     _name = val;
    //     return connecta;
    // };
    return connecta;
};

// var dbOpen = function(onSuccess){
//     mongoClient.open(function(err, mongoClient) {
//       var db1 = mongoClient.db("mydb");

//       mongoClient.close();
//     });

//     db.open(function(err, db) {
//         if(!err) {
//             onSuccess && onSuccess
//         }
//         else{
//             console.log(err);
//         }
//     });
// };


exports.pop = function(req, res){
    populateDB(req, res);
};

exports.getDataSourceNames = function(req, res){
    dbInstance('local')(function(db){
        db.admin().listDatabases(function(err, resp){
            if(err) res.send(404);

            res.json(resp.databases.map(function(d){
                return d.name;
            }));    
        });
    });
    //res.json(['shopperstop']);
};

exports.getCollectionNames = function(req, res) {
    dbInstance(req.params.dbname)(function(db){
        //console.log('got my db');
        db.collectionNames(function(err, result) {
            if(err){
                res.send(404);
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
    dbInstance(req.params.dbname)(function(db){
        var collectionName = req.params.collectionName;
        db.collection(collectionName, function(err, collection) {
            collection.find({$query:{}, $orderby:{$natural:-1}, $maxScan : 100}).toArray(function(err, items) {
                res.send(utils.getUniqueProperties(items));
                //db.close();
            });
        });
    });
};

exports.findCollection = function(req, res) {
    dbInstance(req.params.dbname)(function(db){
        var collectionName = req.params.collectionName;
        var segment = req.body;
        console.log('my segment :' + JSON.stringify(segment, 'null', '\t'));
        var query = utils.getMongoQuery(segment);
        var selectOnly = utils.buildReturnPoperties(segment);
        //console.log('mongo query :' + JSON.stringify(query, null, '\t'));
        //console.log('select only :' + JSON.stringify(selectOnly, null, '\t'));
        db.collection(collectionName, function(err, collection) {
            if(!err){
                collection.find(query, selectOnly, {sort:'timestamp'}).toArray(function(err, items) {
                    res.send(items);
                    //db.close();
                });
            }
            else{
                res.send(404);
            }
        });
    });
};

/*--------------------------------------------------------------------------------------------------------------------*/
// Populate database with sample data -- Only used once: the first time the application is started.
// You'd typically not find this code in a real-life app, since the database would already exist.
var populateDB = function(req, res) {
    var maxProps = 300;
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
        console.log(dd.timestamp);
        data.push(dd);
    }
    dbInstance('shopperstop')(function(db){
        db.collection('shoppercheckout', function(err, collection) {
            if(err){
                res.send('somethig went wrong');
            }
            else{
                collection.insert(data, {safe:true}, function(err, result) {});
                res.send('done');    
            }
        });    
    });
};