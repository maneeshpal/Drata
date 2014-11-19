var mongo = require('mongodb');
var utils = require('./utils');
var socket = require('./socket');
var config = require('./config.json');
var BSON = mongo.BSONPure;
var _ = require('underscore');
var Q = require('q');
var demoDashboardData = require('./demo.json');

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
            });
        }
    });
    return defer.promise;
};

var getDashboard = function(dashboardId){
    console.log('finding dashboard');
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

var findDemoDashboard = function(){
    var defer = Q.defer();
    db.collection(dashboardCollection,function(err, collection) {
        if(err){
            defer.reject('cannot connect to the dashboard collection ');
        }
        else{
            collection.findOne({
                'demo' : true
            }, function(err, result) {
                (err || !result) ? defer.reject('cannot find document'): defer.resolve(result);
            });
        }
    });
    return defer.promise;
}
exports.redirectDemo = function(req, res){
    console.log('am i hitting this ?');
    findDemoDashboard().then(function(demoDashboardModel){
        console.log(demoDashboardModel);
        res.redirect('/dashboard/' + demoDashboardModel._id.toString(), 302);
    }, function(err){
        res.send(404);
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

var updateWidget = function(widgetModel, allowDemo){
    var defer = Q.defer();
    db.collection(widgetCollection,function(err, collection) {
        if(err){
            defer.reject('widget collection cannot connect');
        }
        else{
            //console.log('connected to widget collection');
            getWidget(widgetModel._id)
            .then(function(result){
                //console.log('got widget');
                getDashboard(widgetModel.dashboardId)
                .then(function(result){
                    //console.log('got dashboard');
                    if(result.demo && !allowDemo){
                        defer.resolve();
                        return;
                    }
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

var addWidget = function(widgetModel, allowDemo){
    var defer = Q.defer();
    console.log('addwidget method entered');
    db.collection(widgetCollection,function(err, collection) {
        if(err){
            defer.reject('widget collection cannot connect');
        }
        else{
            console.log('widget collection entered');
            getDashboard(widgetModel.dashboardId)
            .then(function(result){
                console.log('got dashboard');
                if(result.demo && !allowDemo){
                    defer.resolve();
                    return;
                }
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
                console.log('get dashboard failed when adding widget');
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
    //console.log('updating widget');
    updateWidget(widgetModel)
    .then(function(){
        //console.log('updated widget');
        res.send(200);
    }, function(err){
        //console.log('error updating widget');
        res.send(404);
    });
}

exports.addWidget = function(req, res){
    var widgetModel = req.body;
    //console.log('adding widget');
    addWidget(widgetModel)
    .then(function(newWidgetModel){
        //console.log('added widget');
        res.send(newWidgetModel);
    }, function(err){
        res.send(404);
    });
};

exports.deleteWidget = function(req, res){
    var widgetId = mongo.ObjectID(req.params.widgetId);
    db.collection(widgetCollection,function(err, collection) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            getWidget(widgetId)
            .then(function(w){
                getDashboard(w.dashboardId)
                .then(function(d){
                    if(d.demo){
                        res.send(200);
                        return;
                    }
                    //delete the widget
                    collection.remove({_id : widgetId}, {safe:true,justOne:true}, function(err, result) {
                        res.send(200);
                    });

                }, function(err){
                    console.log('get dashboard failed when deleting widget');
                    res.send(404);
                })
            }, function(err){
                console.log('get widget failed when deleting widget');
                res.send(404);
            });
        }
    });
};

var upsertDashboard = function(dashboardModel, allowDemo){
    var defer = Q.defer();
    db.collection(dashboardCollection,function(err, collection) {
        if(err){
            //console.log(JSON.stringify(err, null, '\t'));
            defer.reject('invalid');
        }
        else{
            if(dashboardModel.demo && !allowDemo){
                defer.resolve();
                return;
            }
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
            collection.remove({_id : dashboardId, demo: false}, {safe:true,justOne:true}, function(err, result) {
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
            //console.log('rejected');
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
        //console.log('send response when rejected');
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
    var demoData = utils.clone(demoDashboardData);
    upsertDashboard(demoData.dashboard, true)
    .then(function(dashboardModel){
        console.log('demo dashboard generated');
        var wPromises = [];
        var dashboardId = dashboardModel._id.toString();
        //var c = demoData.widgets.length + demoData.tags.length, temp = 0;
        // function xx(){
        //     temp++;
        //     if(c === temp) res.send(200);
        // }
        _.each(demoData.widgets, function(widgetModel){
            console.log('iterating through widget models');
            widgetModel.dashboardId = dashboardId;
            //addWidget(widgetModel).then(xx);
            wPromises.push(addWidget(widgetModel, true));
            console.log('demo widget generated');
        });
        _.each(demoData.tags, function(tagModel){
            tagModel.dashboardId = dashboardId;
            //addTag(tagModel).then(xx);
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

var addTag = function(tagModel, allowDemo){
    //console.log('adding tag');
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
            getDashboard(tagModel.dashboardId)
            .then(function(result){
                if(result.demo && !allowDemo){
                    defer.resolve();
                    return;
                }
                collection.update({
                    tagName: tagModel.tagName,
                    dashboardId: tagModel.dashboardId
                },
                tagModel,
                { upsert: true },
                function(err, result){
                    err ? defer.reject() : defer.resolve();
                });
            }, function(err){
                console.log('get dashboard failed when adding tags');
                defer.reject('Dashboard not found. Id: ' + tagModel.dashboardId);
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
