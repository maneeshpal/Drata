var mongo = require('mongodb');
var utils = require('./utils');
var socket = require('./socket');
var config = require('./config.json');
var demoData = require('./demo.json');
var BSON = mongo.BSONPure;
var _ = require('underscore');
var Q = require('Q');

var tagCollection = 'tags', widgetCollection = 'widget', dashboardCollection = 'dashboard';

var mongoClient = new mongo.MongoClient(new mongo.Server(config.drataInternal.serverName, config.drataInternal.port));

var db, io;

mongoClient.open(function(err, mongoClient) {
    if(!err){
        console.log('drataStore connection opened');
        db = mongoClient.db(config.drataInternal.databaseName);
    }else{
        console.log('Database connection failure.');
    }
});

var findObject = function(collectionName, id){
    var defer = Q.defer();
    db.collection(collectionName,function(err, collection) {
        if(err){
            defer.reject('cannot connect to the collection: ' + collectionName);
        }
        else{
            collection.findOne({
                '_id' : mongo.ObjectID(id)
            }, function(err, result) {
                (err || !result) ? defer.reject('cannot find document'): defer.resolve(result);
                // if(err || !result){
                //     callback(null);
                // }else{
                //     callback(result);   
                // }
            });
        }
    });
    return defer.promise;
};

var getDashboard = function(dashboardId){
    return findObject(dashboardCollection, dashboardId);
};

var getWidget = function(widgetId, callback){
    return findObject(widgetCollection, widgetId);
};

exports.setIO = function(socketio){
    io = socketio;
}

exports.pop = function(req, res){
    db.collection(dashboardCollection,function(err, collection) {
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
    getDashboard(req.params.dashboardId)
    .then(function(result){
        res.send(result);
    }, function(err){
        res.send(404);
    });
};

exports.findWidget = function(req, res) {
    getWidget(req.params.widgetId)
    .then(function(result){
        res.send(result);
    }, function(err){
        res.send(404);
    });
};

exports.findWidgetsOfDashboard = function(req, res) {
    var dashboardId = req.params.dashboardId;
    db.collection(widgetCollection,function(err, collection) {
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

var updateWidget = function(widgetModel){
    var defer = Q.defer();
    db.collection(widgetCollection,function(err, collection) {
        if(err){
            defer.reject('widget collection cannot connect');
        }
        else{
            console.log('connected to widget collection');
            getWidget(widgetModel._id)
            .then(function(result){
                console.log('got widget');
                getDashboard(widgetModel.dashboardId)
                .then(function(result){
                    console.log('got dashboard');
                    widgetModel._id = mongo.ObjectID(widgetModel._id);
                    widgetModel.dateUpdated = new Date();
                    collection.save(widgetModel, {safe:true}, function(err, result) {
                        //console.log(JSON.stringify(err));
                        err ? defer.reject('cannot update widget') : defer.resolve();
                        //console.log(JSON.stringify(result));
                    });
                }, function(err){
                    defer.reject('Dashboard not found. Id: ' + widgetModel.dashboardId);
                });

            }, function(err){
                defer.reject('widget not found. Id: ' + widgetModel._id);
            });
        }
    });
    return defer.promise;
};

var addWidget = function(widgetModel){
    var defer = Q.defer();
    db.collection(widgetCollection,function(err, collection) {
        if(err){
            defer.reject('widget collection cannot connect');
        }
        else{
            console.log('widget collection entered');
            getDashboard(widgetModel.dashboardId)
            .then(function(result){
                console.log('got dashboard');
                widgetModel.dateCreated = new Date();
                widgetModel.dateUpdated = new Date();
                
                delete widgetModel._id; //just in case

                collection.save(widgetModel, {safe:true}, function(err, result) {
                    //console.log(JSON.stringify(err));
                    console.log('saved widget');
                    err ? defer.reject('cannot save widget') : defer.resolve(result);
                    //console.log(JSON.stringify(result));
                });
            }, function(err){
                defer.reject('Dashboard not found. Id: ' + widgetModel.dashboardId);
            });
        }
    });
    return defer.promise;
};



exports.updateWidget = function(req, res){
    var widgetModel = req.body;
    if(!widgetModel._id){
        res.send(404);
    }
    console.log('updating widget');
    updateWidget(widgetModel)
    .then(function(){
        console.log('updated widget');
        res.send(200);
    }, function(err){
        console.log('error updating widget');
        res.send(404);
    });
}

exports.addWidget = function(req, res){
    var widgetModel = req.body;
    console.log('adding widget');
    addWidget(widgetModel)
    .then(function(newWidgetModel){
        console.log('added widget');
        res.send(newWidgetModel);
    }, function(err){
        res.send(404);
    });
    

    // db.collection(widgetCollection,function(err, collection) {
    //     if(err){
    //         res.send(404);
    //     }
    //     else{
    //         var widgetModel = req.body;
    //         var isNew = !widgetModel._id;
    //         function _temp(){
    //             getDashboard(widgetModel.dashboardId, function(result){
    //                 if(!result) {
    //                     res.send(404);
    //                     return;
    //                 }
    //                 var widgetId = widgetModel._id;
    //                 if(!isNew){
    //                     widgetModel._id = mongo.ObjectID(widgetId);
    //                     widgetModel.dateCreated = new Date();
    //                 }

    //                 widgetModel.dateUpdated = new Date();
                    
    //                 //delete widgetModel._id;
    //                 collection.save(widgetModel, {safe:true}, function(err, result) {
    //                     //console.log(JSON.stringify(err));
    //                     if(err) res.send(404);
    //                     //console.log(JSON.stringify(result));
    //                     if(isNew){
    //                         res.send(result);
    //                     }
    //                     else{
    //                         res.send(200);
    //                     }
    //                 });
    //             });    
    //         }
    //         if(!isNew){
    //             getWidget(widgetModel._id, function(result){
    //                 if(!result) {
    //                     res.send(404);
    //                     return;
    //                 }
    //                 _temp();
    //             });
    //         }else{
    //             _temp();
    //         }
    //     }
    // });
};

// exports.updateWidget = function(req, res){
//     //console.log(JSON.stringify(req.body, null, '\t'));
//     db.collection(widgetCollection,function(err, collection) {
//         if(err){
//             //console.log(JSON.stringify(err, null, '\t'));
//             res.send(404);
//         }
//         else{
//             var widgetModel = req.body;
//             if(!widgetModel._id) res.send(404);
//             getDashboard(widgetModel.dashboardId, function(result){
//                 if(!result) {
//                     res.send(404);
//                     return;
//                 }
//                 var widgetId = mongo.ObjectID(widgetModel._id);
//                 delete widgetModel._id;
//                 widgetModel.dateUpdated = new Date();
                
//                 collection.update({_id: widgetId}, widgetModel, {safe:true, multi: false}, function(err, result) {
//                     //console.log(JSON.stringify(err));
//                     if(err) {
//                         res.send(404);
//                         return;
//                     }
//                     //console.log(JSON.stringify(result));
                    
//                     res.send(result);
//                 });
//             });
//         }
//     });
// };

exports.deleteWidget = function(req, res){
    var widgetId = mongo.ObjectID(req.params.widgetId);
    db.collection(widgetCollection,function(err, collection) {
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

var upsertDashboard = function(dashboardModel){
    var defer = Q.defer();
    db.collection(dashboardCollection,function(err, collection) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            defer.reject('invalid');
        }
        else{
            if(dashboardModel._id){
                dashboardModel._id = mongo.ObjectID(dashboardModel._id);
            }
            if(!dashboardModel.dateCreated){
                dashboardModel.dateCreated = new Date();
            }
            dashboardModel.dateUpdated = new Date();
            collection.save(dashboardModel, {safe:true}, function(err, result) {
                err ? defer.reject('invalid') : defer.resolve(result);
            });
        }
    });
    return defer.promise;
};

exports.upsertDashboard = function(req, res){
    upsertDashboard(req.body)
        .then(function(result){
            res.send(result);
        }, function(err){
            res.send(404);
        });
};

exports.deleteDashboard = function(req, res){
    var dashboardId = mongo.ObjectID(req.params.dashboardId);
    db.collection(dashboardCollection,function(err, collection) {
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

function removeCollection(collectionName){
    var defer = Q.defer();
    db.collection(collectionName,function(err, collection) {
        if(err){
            defer.reject('invalid');
            console.log('rejected');
        }
        else{
            collection.remove({}, function(err, result) {
                err ? defer.reject('invalid') : defer.resolve();
            });
        }
    });
    return defer.promise;
}

exports.truncateData = function(req, res){
    var onReject = function(){
        console.log('send response when rejected');
        res.send(404);
    };

    removeCollection(dashboardCollection)
        .then(removeCollection(widgetCollection), onReject)
        .then(removeCollection(tagCollection), onReject)
        .then(function(result){
            res.send(200);
        }, onReject);
};

exports.generateDemoDashboard = function(req, res){
    //create dashboard
    upsertDashboard(demoData.dashboard)
    .then(function(dashboardModel){
        var wPromises = [];
        var dashboardId = dashboardModel._id.toString();
        _.each(demoData.widgets, function(widgetModel){
            widgetModel.dashboardId = dashboardId;
            wPromises.push(addWidget(widgetModel));
        });
        _.each(demoData.tags, function(tagModel){
            tagModel.dashboardId = dashboardId;
            wPromises.push(addTag(tagModel));
        });
        Q.all(wPromises)
        .then(function(){
            res.send(200);
        },function(){
            res.send(500);
        });
    },function(){
        res.send(404);
    });
    //use dashboardid and create tag
    //use dashboardid and create widget

};

exports.getAllDashboards = function(req, res) {
    db.collection(dashboardCollection,function(err, collection) {
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
    db.collection(widgetCollection,function(err, collection) {
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
    db.collection(tagCollection,function(err, collection) {
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
    db.collection(tagCollection,function(err, collection) {
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

var addTag = function(tagModel){
    console.log('adding tag');
    var defer = Q.defer();
    if(!tagModel) {
        defer.reject('tag model undefined');
        return;
    }
    db.collection(tagCollection,function(err, collection) {
        if(err){
            defer.reject('tag collection error');
        }
        else{       
            //delete tagModel._id;
            console.log('tag collection entered');
            collection.update({
                tagName: tagModel.tagName,
                dashboardId: tagModel.dashboardId
            },
            tagModel,
            { upsert: true },
            function(err, result){
                console.log('added tag');
                err ? defer.reject() : defer.resolve();
            });
        }
    });
    return defer.promise;
}

exports.addTag = function(req, res){
    addTag(req.body)
    .then(function(result){
        res.send(200);
    }, function(err){
        res.send(404);
    });
};

exports.removeTag = function(req, res){
    var tagId = mongo.ObjectID(req.params.tagId);
    db.collection(tagCollection,function(err, collection) {
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
    db.collection(tagCollection,function(err, collection) {
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
    db.collection(widgetCollection,function(err, collection) {
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