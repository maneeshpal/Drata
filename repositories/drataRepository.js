var mongo = require('mongodb');
var utils = require('../utils/utils');
var queryGenerator = require('../utils/mongoquerygenerator');
var socket = require('../routes/socket');
var config = require('../routes/config.json');
var BSON = mongo.BSONPure;
var _ = require('underscore');
var Q = require('q');
var demoDashboardData = require('../routes/demo.json');

var tagCollection = 'tags', widgetCollection = 'widget', dashboardCollection = 'dashboard';

var mongoClient = new mongo.MongoClient(new mongo.Server(config.drataInternal.serverName, config.drataInternal.port));

var db, io;
function getValidMongoId(id){
    var defer = Q.defer(), objectId;
    try {
       objectId = mongo.ObjectID(id);
       defer.resolve(objectId);
    }
    catch(e){
        defer.reject({code: 500, message : utils.format('Invalid objectId: {0}', id)});
    }
    return defer.promise;
};

var connectToCollection = function(name) {
    var defer = Q.defer();
    db.collection(name, function(err, collection) {
        if(err){
            defer.reject({code:500, message: utils.format('Error connecting to Mongo Collection: {0}', name)});
        }
        else{
            defer.resolve(collection);
        }
    });
    return defer.promise;
};

mongoClient.open(function(err, mongoClient) {
    if(!err){
        console.log('drataStore connection opened');
        db = mongoClient.db(config.drataInternal.databaseName);
    }else{
        console.log('Database connection failure.');
    }
});

var handleErrorResponse = function(err) {
    this.send(err.code || 500, err.message || err.toString());
}

var findObject = function(collectionName, id){
    return getValidMongoId(id).then(function(objectId){
        return connectToCollection(collectionName).then(function(collection){
            var defer = Q.defer();
                collection.findOne({
                '_id' : objectId
                }, function(err, result) {
                    (err || !result) ? defer.reject({code: 404, message: utils.format('cannot find document with Id: {0}', id)}): defer.resolve(result);
                });    
            
            return defer.promise;
        });
    });
};

var getDashboard = function(dashboardId){
    return findObject(dashboardCollection, dashboardId);
};

var getWidget = function(widgetId, callback){
    return findObject(widgetCollection, widgetId);
};

exports.setIO = function(socketio){
    io = socketio;
};

var findDemoDashboard = function(){
    return connectToCollection(dashboardCollection).then(function(collection){
        var defer = Q.defer();
        collection.findOne({
            'demo' : true
        }, function(err, result) {
            (err || !result) ? defer.reject({code: 404, message: 'cannot find document'}): defer.resolve(result);
        });
        return defer.promise;
    });
}
exports.redirectDemo = function(req, res){
    findDemoDashboard().then(function(demoDashboardModel){
        res.redirect('/dashboard/' + demoDashboardModel._id.toString(), 302);
    }, handleErrorResponse.bind(res));
};

exports.findDashboard = function(req, res) {
    getDashboard(req.params.dashboardId)
    .done(function(result){
        res.send(result);
    }, handleErrorResponse.bind(res));
};

exports.findWidget = function(req, res) {
    getWidget(req.params.widgetId)
    .done(function(result){
        res.send(result);
    }, handleErrorResponse.bind(res));
};

exports.findWidgetsOfDashboard = function(req, res) {
    var dashboardId = req.params.dashboardId;
    var promise = connectToCollection(widgetCollection).then(function(collection){
        var defer = Q.defer();
        collection.find({'dashboardId' : dashboardId}).toArray(function(err, result) {
            err ? defer.reject({code:404, message: utils.format('Error getting widgets for dashboard : {0}', dashboardId)}) : defer.resolve(result);
        });
        return defer.promise;
    });
    promise.done(function(result){
        res.send(result);
    }, handleErrorResponse.bind(res));
};

var updateWidget = function(widgetModel){
    return getValidMongoId(widgetModel._id).then(function(widgetObjectId){
        return connectToCollection(widgetCollection).then(function(collection){
            return getDashboard(widgetModel.dashboardId).then(function(result){
                if(!result.demo){
                    return getWidget(widgetModel._id).then(function(result){
                        var defer = Q.defer();
                        widgetModel._id = widgetObjectId;
                        widgetModel.dateUpdated = new Date();
                        collection.save(widgetModel, {safe:true}, function(err, result) {
                            err ? defer.reject({code: 500, message: 'cannot update widget'}) : defer.resolve();
                        });
                        return defer.promise;
                    });    
                }else{
                    var defer = Q.defer();
                    defer.resolve();
                    return defer.promise;
                }
            });
        });
    });
};

var updateWidgetViewOptions = function(widgetModel){
    return getWidget(widgetModel._id).then(function(widget) {
        return connectToCollection(widgetCollection).then(function(collection) {
            var defer = Q.defer();
            widget.dateUpdated = new Date();
            widget.sizex = widgetModel.sizex;
            widget.sizey = widgetModel.sizey;
            widget.displayIndex = widgetModel.displayIndex;
            widget.showTabularData = widgetModel.showTabularData;
            widget.name = widgetModel.name;
            widget.refresh = widgetModel.refresh;

            collection.save(widget, {safe:true}, function(err, result) {
                err ? defer.reject({code: 500, message: 'cannot update widget view options'}) : defer.resolve();
            });
        return defer.promise;
        });
    });
};

var addWidget = function(widgetModel){
    return connectToCollection(widgetCollection).then(function(collection){
        return getDashboard(widgetModel.dashboardId).then(function(result){
            var defer = Q.defer();
            if(result.demo && !allowDemo){
                widgetModel._id = new mongo.ObjectID();
                widgetModel.isDemo = true;
                defer.resolve(widgetModel);
            }
            else {
                widgetModel.dateCreated = new Date();
                widgetModel.dateUpdated = new Date();
                
                delete widgetModel._id; //just in case
                delete widgetModel.demo; // just incase, a user clones a demo widget to a different dashboard.
                collection.save(widgetModel, {safe:true}, function(err, result) {
                    err ? defer.reject({code: 500, message: 'cannot create widget'}) : defer.resolve(result);
                }); 
            }
            return defer.promise;
        });
    });
};

exports.updateWidget = function(req, res){
    var widgetModel = req.body;
    if(!widgetModel._id){
        res.send(404);
    }
    updateWidget(widgetModel)
    .then(function(){
        res.send(200);
    }, handleErrorResponse.bind(res));
}

exports.updateWidgetViewOptions = function(req, res) {
    var widgetModel = req.body;
    if(!widgetModel._id){
        res.send(404);
    }
    updateWidgetViewOptions(widgetModel)
    .then(function() {
        res.send(200);
    }, handleErrorResponse.bind(res));
}

exports.addWidget = function(req, res){
    var widgetModel = req.body;
    addWidget(widgetModel)
    .then(function(newWidgetModel){
        res.send(newWidgetModel);
    }, handleErrorResponse.bind(res));
};

var deleteWidget = function(widgetId){
    return connectToCollection(widgetCollection).then(function(collection){
        return getWidget(widgetId).then(function(w){
            return getDashboard(w.dashboardId).then(function(d){
                
                if(d.demo){
                    var defer = Q.defer();
                    defer.resolve();
                    return defer.promise;
                }
                else
                {
                    //delete the widget
                    return getValidMongoId(widgetId).then(function(widgetObjectId){
                        var defer = Q.defer();
                        collection.remove({_id : widgetObjectId}, {safe:true,justOne:true}, function(err, result) {
                            err ? defer.reject({
                                code: 500, 
                                message: utils.format('Widget cannot be deleted. Id: {0}', widgetId)
                            }) : defer.resolve(result);
                        });
                        return defer.promise;
                    });
                }
            });
        });
    });

};

exports.deleteWidget = function(req, res){
    deleteWidget(req.params.widgetId).then(function(result){
        res.send(200);
    }, handleErrorResponse.bind(res));
};

var upsertDashboard = function(dashboardModel, allowDemo){
    return connectToCollection(dashboardCollection).then(function(collection){
        if(dashboardModel._id){
            return getDashboard(dashboardModel._id).then(function(d) {
                if(d.demo && !allowDemo){
                    var defer = Q.defer();
                    defer.resolve();
                    return defer.promise;
                }
                else{
                var defer = Q.defer();
                d.dateUpdated = new Date();
                d.name = dashboardModel.name;
                d.theme = dashboardModel.theme;

                collection.save(d, {safe:true}, function(err, result) {
                    err ? defer.reject({code: 500, message: utils.format('Dashboard cannot be updated. Id: {0}', dashboardModel._id)}) : defer.resolve(result);
                });

                return defer.promise;
                }
            });
        }
        else{
            var defer = Q.defer();
            dashboardModel.dateCreated = new Date();
            dashboardModel.dateUpdated = new Date();
            collection.save(dashboardModel, {safe:true}, function(err, result) {
                err ? defer.reject({code: 500, message: 'Dashboard cannot be created'}) : defer.resolve(result);
            });
            return defer.promise;
        }
    });
};

exports.upsertDashboard = function(req, res){
    upsertDashboard(req.body)
        .then(function(result){
            res.send(result);
        }, handleErrorResponse.bind(res));
};

function removeCollection(collectionName){
    return connectToCollection(collectionName).then(function(collection){    
        var defer = Q.defer();
        collection.remove({}, function(err, result) {
            err ? defer.reject({
                code: 500, 
                message: utils.format('Collection cannot be removed. {0}', collectionName)
            }) : defer.resolve(result);
        });
        return defer.promise;
    });
};

exports.truncateData = function(req, res){
    var dp = removeCollection(dashboardCollection);
    var dw = removeCollection(widgetCollection);
    var dt = removeCollection(tagCollection);
    Q.all([dp,dw,dt]).then(function(){
        res.send(200);
    }, handleErrorResponse.bind(res));
};

exports.generateDemoDashboard = function(req, res){
    var demoData = utils.clone(demoDashboardData);
    var promise = upsertDashboard(demoData.dashboard, true).then(function(dashboardModel){
        var wPromises = [];
        var dashboardId = dashboardModel._id.toString();
        
        _.each(demoData.widgets, function(widgetModel){
            widgetModel.dashboardId = dashboardId;
            wPromises.push(addWidget(widgetModel, true));
        });

        _.each(demoData.tags, function(tagModel){
            tagModel.dashboardId = dashboardId;
            wPromises.push(addTag(tagModel, true));
        });
        
        return Q.all(wPromises);
    });

    promise.then(function(){
        res.send(200);
    }, handleErrorResponse.bind(res));
};

exports.getAllDashboards = function(req, res) {
    var promise = connectToCollection(dashboardCollection).then(function(collection){
        var defer = Q.defer();
        collection.find().toArray(function(err, result) {
            err ? defer.reject({code: 500, message: 'Error getting all dashboards'}) : defer.resolve(result);
        });
        return defer.promise;
    });

    promise.then(function(result){
        res.send(result);
    }, handleErrorResponse.bind(res));
};

exports.cleanupNonDemoDashboards = function(req, res) {
    var promise = connectToCollection(dashboardCollection).then(function(collection){
        var defer = Q.defer();
        
        var cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - 4);
        
        var query = {
            dateCreated : {
                $lte : cutoff
            },
            $or : [{
                demo: { 
                    $exists: false
                }
            }, {
                demo : false
            }]
        };

        collection.remove(query, function(err, result) {
            err ? defer.reject({ code: 500, message: utils.format('Error cleanup') }) : defer.resolve(result);
        });
        return defer.promise;
    });

    //sorry for the fucked up conditional response. normally i 
    //would never do this...but last minute stupid scheduler 
    // job to cleanup dashboards on demo
    if(res) {
        promise.then(function(result) {
            res.send(200);
        }, handleErrorResponse.bind(res));
    } else {
        return promise;
    }
};

exports.getWidgets = function(req, res) {
    var promise = connectToCollection(widgetCollection).then(function(collection){
        var defer = Q.defer();
        var q = queryGenerator.getWidgetListMongoQuery(req.body);
        collection.find(q).toArray(function(err, result) {
            err ? defer.reject({code: 500, message: 'Error getting widgets'}) : defer.resolve(result);
        });
        return defer.promise;
    });

    promise.then(function(result){
        res.send(result);
    }, handleErrorResponse.bind(res));
};

exports.getAllTags = function(req, res){
    var promise = connectToCollection(tagCollection).then(function(collection){
        var defer = Q.defer();
        collection.find().toArray(function(err, result) {
            err ? defer.reject({code: 500, message: 'Error getting all tags'}) : defer.resolve(result);
        });
        return defer.promise;
    });

    promise.then(function(result){
        res.send(result);
    }, handleErrorResponse.bind(res));
};

exports.getAllTagsOfDashboard = function(req, res){
    var promise = connectToCollection(tagCollection).then(function(collection){
        var defer = Q.defer();
        collection.find({dashboardId: req.params.dashboardId}).toArray(function(err, result) {
            err ? defer.reject({code: 500, message: utils.format('Error getting all tags of dashboard. Id: {0}', req.params.dashboardId)}) : defer.resolve(result);
        });
        return defer.promise;
    });

    promise.then(function(result){
        res.send(result);
    }, handleErrorResponse.bind(res));
};

var addTag = function(tagModel, allowDemo){
    return connectToCollection(tagCollection).then(function(collection){
        return getDashboard(tagModel.dashboardId).then(function(result){
            var defer = Q.defer();
            if(result.demo && !allowDemo){
                defer.resolve();
            }
            else{
                collection.update({
                    tagName: tagModel.tagName,
                    dashboardId: tagModel.dashboardId
                },
                tagModel,
                { upsert: true },
                function(err, result){
                    err ? defer.reject({code: 500, message: utils.format('Dashboard not found. Id: {0}', tagModel.dashboardId)}) : defer.resolve(result);
                });    
            }
            return defer.promise;
        });
    });
};

exports.addTag = function(req, res){
    addTag(req.body).then(function(result){
        res.send(200);
    }, handleErrorResponse.bind(res));
};

var removeTag = function(tagId){
    return findObject(tagCollection, tagId).then(function (tag) {
        return getDashboard(tag.dashboardId).then(function ( dashboard ) {
            var defer = Q.defer();
            if(dashboard.demo){
                defer.resolve();
            }
            else {
                return getValidMongoId(tagId).then(function(tagObjectId){
                    return connectToCollection(tagCollection).then(function(collection){
                        var defer = Q.defer();
                        collection.remove({_id : tagObjectId}, {safe:true,justOne:true}, function(err, result) {
                            err ? defer.reject({code: 500, message: utils.format('Error removing tag. Id: {0}', tagId)}) : defer.resolve(result);
                        });
                        return defer.promise;
                    });
                });
            }
            return defer.promise;
        })
    })
};

exports.removeTag = function(req, res){
    removeTag(req.params.tagId).then(function(){
        res.send(200);
    }, handleErrorResponse.bind(res));
};

var deleteAllTagsDashboard = function(dashboardId) {
    return getDashboard(dashboardId).then(function(result) {
        if(result.demo){
            var defer = Q.defer();
            defer.resolve();
            return defer.promise;
        }
        else {
            return connectToCollection(tagCollection).then(function(collection){
                var defer = Q.defer();
                collection.remove({dashboardId : dashboardId}, {safe:true}, function(err, result) {
                    err ? defer.reject({code: 500, message: utils.format('Error deleting all tags of dashboard. Id: {0}', req.params.dashboardId)}) : defer.resolve(result);
                });
                return defer.promise;
            });
        }
    });
};

var deleteAllWidgetsDashboard = function(dashboardId) {
    return getDashboard(dashboardId).then(function(result) {
        if(result.demo){
            var defer = Q.defer();
            defer.resolve();
            return defer.promise;
        }
        else {
            return connectToCollection(widgetCollection).then(function(collection){
                var defer = Q.defer();
                collection.remove({dashboardId : dashboardId}, {safe:true}, function(err, result) {
                    err ? defer.reject({code: 500, message: utils.format('Error deleting all widgets of dashboard. Id: {0}', dashboardId)}) : defer.resolve(result);
                });
                return defer.promise;
            });
        }
    });
};

var deleteDashboard = function(dashboardId){
    return getValidMongoId(dashboardId).then(function(dashboardObjectId){
        return connectToCollection(dashboardCollection).then(function(collection){
            var defer = Q.defer();
            collection.remove({_id : dashboardObjectId, $or : [{demo:{$exists: false}}, {demo : false}]}, {safe:true,justOne:true}, function(err, result) {
                err ? defer.reject({code: 500, message: utils.format('Dashboard cannot be deleted. Id: {0}', dashboardId)}) : defer.resolve(result);
            });
            return defer.promise;
        });
    });
};

exports.deleteAllTagsDashboard = function(req, res){
    deleteAllTagsDashboard(req.params.dashboardId).then(function(){
        res.send(200);
    }, handleErrorResponse.bind(res));
};

exports.deleteAllWidgetsDashboard = function(req, res){
    deleteAllWidgetsDashboard(req.params.dashboardId).then(function(){
        res.send(200);
    }, handleErrorResponse.bind(res));
};

exports.deleteDashboard = function(req, res){
    var promise = deleteAllTagsDashboard(req.params.dashboardId).then(function(){
        return deleteAllWidgetsDashboard(req.params.dashboardId).then(function(){
          return deleteDashboard(req.params.dashboardId);  
        })
    }).then(function(result){
        res.send(200);
    }, handleErrorResponse.bind(res));
};
