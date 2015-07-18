var utils = require('../utils/utils');
var queryGenerator = require('../utils/mongoquerygenerator');
var socket = require('../routes/socket');
var config = require('../routes/config.json');
var baseMongoRepository = require('../repositories/baseMongoRepository');
var BSON = require('mongodb').BSONPure;
var ObjectID = require('mongodb').ObjectID;
var _ = require('underscore');
var Q = require('q');
var demoDashboardData = require('../routes/demo.json');

var tagCollection = 'tags', 
    widgetCollection = 'widget', 
    dashboardCollection = 'dashboard';

var io;

var openConnection = function() {
    return baseMongoRepository.dbInstance(config.drataInternal.alias, config.drataInternal.databaseName);
};

function getValidMongoId(id){
    var defer = Q.defer();
    try {
       defer.resolve(ObjectID(id));
    }
    catch(e){
        defer.reject({code: 500, message : utils.format('Invalid objectId: {0}', id)});
    }
    return defer.promise;
};

var connectToCollection = function(name) {
    return openConnection().then(function(db) {
        var defer = Q.defer();
        db.collection(name, function(err, collection) {
            if(err){
                defer.reject({code:500, message: utils.format('Error connecting to Mongo Collection: {0}', name)});
            }
            else {
                defer.resolve(collection);
            }
        });
        return defer.promise;
    });
};

var connection = {};
connection[tagCollection] = connectToCollection(tagCollection);

connection[widgetCollection] = connectToCollection(widgetCollection);
connection[dashboardCollection] = connectToCollection(dashboardCollection);

var handleErrorResponse = function(err) {
    this.status(err.code || 500).send(err.message || err.toString());
}

var findObject = function(collectionName, id){
    return getValidMongoId(id).then(function(objectId){
        return connection[collectionName].then(function(collection){
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
    var promise = connection[widgetCollection].then(function(collection){
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
        return connection[widgetCollection].then(function(collection){
            return getDashboard(widgetModel.dashboardId).then(function(result){
                
                return getWidget(widgetModel._id).then(function(result){
                    var defer = Q.defer();
                    widgetModel._id = widgetObjectId;
                    widgetModel.dateUpdated = new Date();
                    collection.updateOne({ _id: widgetObjectId }, widgetModel, function(err, result) {
                        err ? defer.reject({code: 500, message: 'cannot update widget'}) : defer.resolve();
                    });
                    return defer.promise;
                });    

            });
        });
    });
};

var updateWidgetViewOptions = function(widgetModel){
    return getWidget(widgetModel._id).then(function(widget) {
        return connection[widgetCollection].then(function(collection) {
            var defer = Q.defer();
            widget.dateUpdated = new Date();
            widget.sizex = widgetModel.sizex;
            widget.sizey = widgetModel.sizey;
            widget.displayIndex = widgetModel.displayIndex;
            widget.showTabularData = widgetModel.showTabularData;
            widget.name = widgetModel.name;
            widget.refresh = widgetModel.refresh;

            collection.updateOne({ _id: widget._id }, widget, function(err, result) {
                err ? defer.reject({code: 500, message: 'cannot update widget view options'}) : defer.resolve();
            });
        return defer.promise;
        });
    });
};

var addWidget = function(widgetModel){
    return connection[widgetCollection].then(function(collection){
        return getDashboard(widgetModel.dashboardId).then(function(result){
            var defer = Q.defer();
            
            widgetModel.dateCreated = new Date();
            widgetModel.dateUpdated = new Date();
            
            delete widgetModel._id; //just in case
            collection.insertOne(widgetModel, function(err, result) {
                err ? defer.reject({code: 500, message: 'cannot create widget'}) : defer.resolve(result.ops[0]);
            });
            
            return defer.promise;
        });
    });
};

exports.updateWidget = function(req, res){
    var widgetModel = req.body;
    if(!widgetModel._id){
        res.status(404).send();
    }
    updateWidget(widgetModel)
    .then(function(){
        res.status(200).send();
    }, handleErrorResponse.bind(res));
}

exports.updateWidgetViewOptions = function(req, res) {
    var widgetModel = req.body;
    if(!widgetModel._id){
        res.status(404).send();
    }
    updateWidgetViewOptions(widgetModel)
    .then(function() {
        res.status(200).send();
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
    return connection[widgetCollection].then(function(collection){
        return getWidget(widgetId).then(function(w){
            return getDashboard(w.dashboardId).then(function(d){
            
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
                
            });
        });
    });

};

exports.deleteWidget = function(req, res){
    deleteWidget(req.params.widgetId).then(function(result){
        res.status(200).send();
    }, handleErrorResponse.bind(res));
};

var addDashboard = function (dashboardModel) {
    return connection[dashboardCollection].then(function(collection){
        var defer = Q.defer();
        dashboardModel.dateCreated = new Date();
        dashboardModel.dateUpdated = new Date();
        collection.insertOne(dashboardModel, function(err, result) {
            err ? defer.reject({code: 500, message: 'Dashboard cannot be created'}) : defer.resolve(result.insertedId);
        });
        return defer.promise;
    });
};

var updateDashboard = function (dashboardModel) {
    return connection[dashboardCollection].then(function(collection){
        return getDashboard(dashboardModel._id).then(function(d) {
            var defer = Q.defer();
            d.dateUpdated = new Date();
            d.name = dashboardModel.name;
            d.theme = dashboardModel.theme;

            collection.updateOne({ _id: d._id }, d, function(err, result) {
                err ? defer.reject({ code: 500, message: utils.format('Dashboard cannot be updated. Id: {0}', dashboardModel._id) }) : defer.resolve(result);
            });

            return defer.promise;
        });
    });
};

exports.updateDashboard = function(req, res){
    updateDashboard(req.body)
    .then(function(result){
        res.send(result);
    }, handleErrorResponse.bind(res));
};

exports.addDashboard = function(req, res){
    addDashboard(req.body)
    .then(function(result){
        res.send(result);
    }, handleErrorResponse.bind(res));
};

function removeCollection(collectionName){
    return connection[collectionName].then(function(collection){    
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
        res.status(200).send();
    }, handleErrorResponse.bind(res));
};

exports.generateDemoDashboard = function(req, res){
    var demoData = utils.clone(demoDashboardData);
    demoData.dashboard.name = demoData.dashboard.name + '-' + Math.floor(Math.random() * 1000);

    var promise = addDashboard(demoData.dashboard, true).then(function(dashboardId){
        var wPromises = [];
        dashboardId = dashboardId.toString();
        
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
        res.status(200).send();
    }, handleErrorResponse.bind(res));
};

exports.getAllDashboards = function(req, res) {
    var promise = connection[dashboardCollection].then(function(collection){
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

exports.getWidgets = function(req, res) {
    var promise = connection[widgetCollection].then(function(collection){
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
    var promise = connection[tagCollection].then(function(collection){
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
    var promise = connection[tagCollection].then(function(collection){
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

var addTag = function(tagModel){
    return connection[tagCollection].then(function(collection){
        return getDashboard(tagModel.dashboardId).then(function(result){
            var defer = Q.defer();
            collection.update({
                tagName: tagModel.tagName,
                dashboardId: tagModel.dashboardId
            },
            tagModel,
            { upsert: true },
            function(err, result){
                err ? defer.reject({code: 500, message: utils.format('Dashboard not found. Id: {0}', tagModel.dashboardId)}) : defer.resolve(result);
            });
            return defer.promise;
        });
    });
};

exports.addTag = function(req, res){
    addTag(req.body).then(function(result){
        res.status(200).send();
    }, handleErrorResponse.bind(res));
};

var removeTag = function(tagId){
    return findObject(tagCollection, tagId).then(function (tag) {
        return getDashboard(tag.dashboardId).then(function ( dashboard ) {
            var defer = Q.defer();
            
            return getValidMongoId(tagId).then(function(tagObjectId){
                return connection[tagCollection].then(function(collection){
                    var defer = Q.defer();
                    collection.remove({_id : tagObjectId}, {safe:true,justOne:true}, function(err, result) {
                        err ? defer.reject({code: 500, message: utils.format('Error removing tag. Id: {0}', tagId)}) : defer.resolve(result);
                    });
                    return defer.promise;
                });
            });
            
            return defer.promise;
        })
    })
};

exports.removeTag = function(req, res){
    removeTag(req.params.tagId).then(function(){
        res.status(200).send();
    }, handleErrorResponse.bind(res));
};

var deleteAllTagsDashboard = function(dashboardId){
    return connection[tagCollection].then(function(collection){
        var defer = Q.defer();
        collection.remove({dashboardId : dashboardId}, {safe:true}, function(err, result) {
            err ? defer.reject({code: 500, message: utils.format('Error deleting all tags of dashboard. Id: {0}', req.params.dashboardId)}) : defer.resolve(result);
        });
        return defer.promise;
    });
};

var deleteAllWidgetsDashboard = function(dashboardId){
    return connection[widgetCollection].then(function(collection){
        var defer = Q.defer();
        collection.remove({dashboardId : dashboardId}, {safe:true}, function(err, result) {
            err ? defer.reject({code: 500, message: utils.format('Error deleting all widgets of dashboard. Id: {0}', dashboardId)}) : defer.resolve(result);
        });
        return defer.promise;
    });
};

var deleteDashboard = function(dashboardId){
    return getValidMongoId(dashboardId).then(function(dashboardObjectId){
        return connection[dashboardCollection].then(function(collection){
            var defer = Q.defer();
            collection.remove({ _id : dashboardObjectId }, { safe:true, justOne:true }, function(err, result) {
                err ? defer.reject({code: 500, message: utils.format('Dashboard cannot be deleted. Id: {0}', dashboardId)}) : defer.resolve(result);
            });
            return defer.promise;
        });
    });
};

exports.deleteAllTagsDashboard = function(req, res){
    deleteAllTagsDashboard(req.params.dashboardId).then(function(){
        res.status(200).send();
    }, handleErrorResponse.bind(res));
};

exports.deleteAllWidgetsDashboard = function(req, res){
    deleteAllWidgetsDashboard(req.params.dashboardId).then(function(){
        res.status(200).send();
    }, handleErrorResponse.bind(res));
};

exports.deleteDashboard = function(req, res){
    var promise = deleteAllTagsDashboard(req.params.dashboardId).then(function(){
        return deleteAllWidgetsDashboard(req.params.dashboardId).then(function(){
          return deleteDashboard(req.params.dashboardId);  
        })
    }).then(function(result){
        res.status(200).send();
    }, handleErrorResponse.bind(res));
};