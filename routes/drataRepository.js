var mongo = require('mongodb');
var utils = require('./utils');
var socket = require('./socket');
var config = require('./config.json');
var BSON = mongo.BSONPure;
var _ = require('underscore');

var mongoClient = new mongo.MongoClient(new mongo.Server(config.drataInternal.serverName, config.drataInternal.port));

var db, io;

mongoClient.open(function(err, mongoClient) {
    if(!err){
        console.log('drataStore connection opened');
        db = mongoClient.db(config.drataInternal.databaseName);
    }else{
        res.send(500, 'Database connection failure.');
    }
});

var findObject = function(collectionName, id, callback){
    db.collection(collectionName,function(err, collection) {
        if(err){
            callback(null);
        }
        else{
            collection.findOne({'_id' : mongo.ObjectID(id)}, function(err, result) {
                // console.log(JSON.stringify(err, null, '\t'));
                // console.log(JSON.stringify(result, null, '\t'));
                if(err || !result){
                    //console.log(collectionName + ' not found :' + id);
                    callback(null);
                }else{
                    //console.log(collectionName + ' found :' + id);
                    callback(result);   
                }
            });
        }
    });
};

var getDashboard = function(dashboardId, callback){
    findObject('dashboard', dashboardId, callback);
};

var getWidget = function(widgetId, callback){
    findObject('widget', widgetId, callback);
};

exports.setIO = function(socketio){
    io = socketio;
}

exports.pop = function(req, res){
    db.collection('dashboard',function(err, collection) {
        if(err){
            res.send(404);
        }
        else{
            // collection.update({},
            //    { $set: { dateUpdated: new Date().toISOString() } },
            //    { multi: true },function(err, result) {
            //     res.send(result);
            // });

            // collection.update({_id: mongo.ObjectID('53531185b6cdcec0069a6530')},
            //    { $set: { name: 'maneesh'} },function(err, result) {
            //     res.send(result);
            // });
        }
    });
};

exports.findDashboard = function(req, res) {
    getDashboard(req.params.dashboardId, function(result){
        if(!result) {
            res.send(404);
        }
        else{
            res.send(result);
        }
    });
};

exports.findWidget = function(req, res) {
    getWidget(req.params.widgetId, function(result){
        if(!result) {
            res.send(404);
        }
        else{
            res.send(result);
        }
    });
};

exports.findWidgetsOfDashboard = function(req, res) {
    var dashboardId = req.params.dashboardId;
    db.collection('widget',function(err, collection) {
        if(err){
            res.send(404);
        }
        else{
            collection.find({'dashboardId' : dashboardId}).toArray(function(err, result) {
                res.send(result);
            });
        }
    });
};

exports.upsertWidget = function(req, res){
    //console.log(req.headers);
    db.collection('widget',function(err, collection) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            var widgetModel = req.body;
            var isNew = !widgetModel._id;
            function _temp(){
                getDashboard(widgetModel.dashboardId, function(result){
                    if(!result) {
                        res.send(404);
                        return;
                    }
                    var widgetId = widgetModel._id;
                    if(!isNew){
                        widgetModel._id = mongo.ObjectID(widgetId);
                        widgetModel.dateCreated = new Date();
                    }

                    widgetModel.dateUpdated = new Date();
                    
                    //delete widgetModel._id;
                    collection.save(widgetModel, {safe:true}, function(err, result) {
                        //console.log(JSON.stringify(err));
                        if(err) res.send(404);
                        //console.log(JSON.stringify(result));
                        if(isNew){
                            res.send(result);
                            // socket.emitEvent('widgetcreated', {
                            //     widgetId : result._id, 
                            //     dashboardId: result.dashboardId, 
                            //     clientId: req.headers.clientid
                            // });
                        }
                        else{
                            res.send(200);
                            // socket.emitEvent('widgetupdated', {
                            //     widgetId : widgetId, 
                            //     dashboardId: widgetModel.dashboardId, 
                            //     clientId: req.headers.clientid
                            // });
                        }
                    });
                });    
            }
            if(!isNew){
                getWidget(widgetModel._id, function(result){
                    if(!result) {
                        res.send(404);
                        return;
                    }
                    _temp();
                });
            }else{
                _temp();
            }
        }
    });
};

exports.updateWidget = function(req, res){
    //console.log(JSON.stringify(req.body, null, '\t'));
    db.collection('widget',function(err, collection) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            var widgetModel = req.body;
            if(!widgetModel._id) res.send(404);
            getDashboard(widgetModel.dashboardId, function(result){
                if(!result) {
                    res.send(404);
                    return;
                }
                var widgetId = mongo.ObjectID(widgetModel._id);
                delete widgetModel._id;
                widgetModel.dateUpdated = new Date();
                
                collection.update({_id: widgetId}, widgetModel, {safe:true, multi: false}, function(err, result) {
                    //console.log(JSON.stringify(err));
                    if(err) {
                        res.send(404);
                        return;
                    }
                    //console.log(JSON.stringify(result));
                    
                    res.send(result);
                });
            });
        }
    });
};

exports.deleteWidget = function(req, res){
    var widgetId = mongo.ObjectID(req.params.widgetId);
    db.collection('widget',function(err, collection) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            collection.remove({_id : widgetId}, {safe:true,justOne:true}, function(err, result) {
                //console.log(JSON.stringify(werr));
                //console.log('deleted ' + req.params.widgetId);
                res.send(200);
            });
        }
    });
};

exports.upsertDashboard = function(req, res){
    db.collection('dashboard',function(err, collection) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            var dashboardModel = req.body;
            if(dashboardModel._id){
                dashboardModel._id = mongo.ObjectID(dashboardModel._id);
            }
            if(!dashboardModel.dateCreated){
                dashboardModel.dateCreated = new Date();
            }
            dashboardModel.dateUpdated = new Date();
            collection.save(dashboardModel, {safe:true}, function(err, result) {
                //console.log(JSON.stringify(err));
                if(err) res.send(404);
                //console.log(JSON.stringify(result));
                
                res.send(result);
            });
        }
    });
};

exports.deleteDashboard = function(req, res){
    var dashboardId = mongo.ObjectID(req.params.dashboardId);
    db.collection('dashboard',function(err, collection) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            collection.remove({_id : dashboardId}, {safe:true,justOne:true}, function(err, result) {
                res.send(200);
            });
        }
    });
};

exports.getAllDashboards = function(req, res) {
    db.collection('dashboard',function(err, collection) {
        if(err){
            res.send(404);
        }
        else{
            collection.find().toArray(function(err, result) {
                res.send(result);
            });
        }
    });
};

exports.getWidgets = function(req, res) {
    db.collection('widget',function(err, collection) {
        if(err){
            res.send(404);
        }
        else{
            //console.log('before query' + JSON.stringify(req.body));
            var q = utils.getwidgetListMongoQuery(req.body);
            //console.log(JSON.stringify(q));
            collection.find(q).toArray(function(err, result) {
                res.send(result);
            });
        }
    });
};

exports.getAllTags = function(req, res){
    db.collection('tags',function(err, collection) {
        if(err){
            res.send(404);
        }
        else{
            collection.find().toArray(function(err, result) {
                res.send(result);
            });
        }
    });
};

exports.getAllTagsOfDashboard = function(req, res){
    var dashboardId = req.params.dashboardId;
    db.collection('tags',function(err, collection) {
        if(err){
            res.send(404);
        }
        else{
            collection.find({dashboardId: dashboardId}).toArray(function(err, result) {
                res.send(result);
            });
        }
    });
};

exports.addTag = function(req, res){
    db.collection('tags',function(err, collection) {
        if(err){
            res.send(404);
        }
        else{
            var tagModel = req.body;
            if(!tagModel)
                res.send(404);
            delete tagModel._id;
            collection.update({
                tagName: tagModel.tagName,
                dashboardId: tagModel.dashboardId
            },
            tagModel,
            { upsert: true },
            function(err, result){
                if(err){
                  res.send(404);
                  return;  
                }
                res.send(200);
            });
        }
    });
};

exports.removeTag = function(req, res){
    var tagId = mongo.ObjectID(req.params.tagId);
    db.collection('tags',function(err, collection) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            collection.remove({_id : tagId}, {safe:true,justOne:true}, function(err, result) {
                //console.log(JSON.stringify(werr));
                //console.log('deleted ' + req.params.widgetId);
                res.send(200);
            });
        }
    });
};

exports.deleteAllTagsDashboard = function(req, res){
    var dashboardId = req.params.dashboardId;
    db.collection('tags',function(err, collection) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            collection.remove({dashboardId : dashboardId}, {safe:true}, function(err, result) {
                //console.log(JSON.stringify(result));
                res.send(200);
            });
        }
    });
};


exports.deleteAllWidgetsDashboard = function(req, res){
    var dashboardId = req.params.dashboardId;
    db.collection('widget',function(err, collection) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            collection.remove({dashboardId : dashboardId}, {safe:true}, function(err, result) {
                //console.log(JSON.stringify(result));
                res.send(200);
            });
        }
    });
};

var populateDB = function(req, res) {
    var maxProps = 20;
    var data= [];
    var y = [0,0,0,0,0,0,0];
    var ordernumber = 1;
    var geos = ['texas', 'Alabama', 'Misissipi', 'Arizona', 'Minnesota'];
    var items = ['jeans', 'T Shirt', 'Under wear', 'Skirt', 'Pajama', 'Dress Shirt', 'Scarf', 'Women\'s Jacket'];
    var colors = ['blue', 'gray', 'black', 'white', 'purple'];
    var ageGroups = ['adult', 'baby', 'teen', 'Senior Citizen', 'Mid 40\'s'];
    var startDate = new Date('3/10/2014');
    for(var j = 0; j <= maxProps; j++){
        for(var yy = 0; yy < y.length; yy++){
            y[yy] += Math.floor((Math.random() * 10 - j%10));
        }
        //y += (Math.random() * 10 - j%10);
        ordernumber = 10 + (Math.floor(j/ 3) * (3)); // 3 items per order
        data.push({
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
        });
    }
 
    db.collection('shoppercheckout', function(err, collection) {
        if(err){
            res.send('somethig went wrong');
        }
        else{
            //collection.remove();
            collection.insert(data, {safe:true}, function(err, result) {});
            res.send('done');    
        }
    });
};

/*--------------------------------------------------------------------------------------------------------------------*/
// var populateDB = function(req, res) {
//     var widgetModel = [
//     '{"selectedDataKey":"shoppercheckout","segmentModel":{"selection":[{"groupType":"selection","groups":[],"logic":"+","groupBy":"value","selectedProp":"price","isComplex":false}],"dataGroup":{"hasGrouping":true,"groupByProp":"itemAgeGroup","xAxisType":"date","xAxisProp":"timestamp","timeseriesInterval":"300000","errors":[]},"group":[],"dataFilter":{"intervalKind":"day","intervalType":"dynamic","min":19,"max":60,"dateProp":"timestamp"},"chartType":"scatter"},"sizex":"4","sizey":"1"}',
//     '{"selectedDataKey":"shoppercheckout","segmentModel":{"selection":[{"groupType":"selection","groups":[],"logic":"+","groupBy":"value","selectedProp":"price","isComplex":false}],"dataGroup":{"hasGrouping":true,"groupByProp":"itemAgeGroup","xAxisType":"date","xAxisProp":"timestamp","timeseriesInterval":"300000","errors":[]},"group":[],"dataFilter":{"intervalKind":"day","intervalType":"dynamic","min":19,"max":60,"dateProp":"timestamp"},"chartType":"scatter"},"sizex":"4","sizey":"1"}'
//     ];

//     var widgets = widgetModel.map(function(item){
//         return JSON.parse(item);
//     });

//     var dashboardModel = {
//         name: 'maneesh'
//     };

//     db.collection('dashboard', function(err, collection) {
//         if(err){
//             res.send('somethig went wrong');
//         }
//         else{
//             //collection.remove();
//             collection.insert(dashboardModel, {safe:true}, function(err, result) {
//                 console.log(JSON.stringify(result));
//                 var dId = result[0]._id.toHexString();
//                 _.each(widgets, function(w){
//                     w.dashboardId = dId;
//                 });
//                 db.collection('widget', function(err2, collection2) {
//                     if(err2){
//                         res.send('somethig went wrong');
//                     }
//                     else{
//                         //collection.remove();
//                         collection2.insert(widgets, {safe:true}, function(werr, wresult) {
//                             console.log(JSON.stringify(werr));
                            
//                             res.send('done');
//                         });
//                     }
//                 }); 

              
//                 //res.send('done');
//             });
//         }
//     });        
 
// };