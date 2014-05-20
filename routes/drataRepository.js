var mongo = require('mongodb');
var utils = require('./utils');
var config = require('./config.json');
var BSON = mongo.BSONPure;
var _ = require('underscore');

var mongoClient = new mongo.MongoClient(new mongo.Server(config.drataMongo.serverName, config.drataMongo.port));

var db;

mongoClient.open(function(err, mongoClient) {
    if(!err){
        console.log('drataStore connection opened');
        db = mongoClient.db('drataStore');
    }
});

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
    var dashboardId = mongo.ObjectID(req.params.dashboardId);
    db.collection('dashboard',function(err, collection) {
        if(err){
            res.send(404);
        }
        else{
            collection.findOne({'_id' : dashboardId}, function(err, result) {
                res.send(result);
            });
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
    console.log(JSON.stringify(req.body, null, '\t'));
    db.collection('widget',function(err, collection) {
        if(err){
            console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            var widgetModel = req.body;
            if(widgetModel._id){
                widgetModel._id = mongo.ObjectID(widgetModel._id);
            }

            if(!widgetModel.dateCreated){
                widgetModel.dateCreated = new Date().toISOString();
            }
            widgetModel.dateUpdated = new Date().toISOString();
            
            //delete widgetModel._id;
            collection.save(widgetModel, {safe:true}, function(err, result) {
                console.log(JSON.stringify(err));
                if(err) res.send(404);
                console.log(JSON.stringify(result));
                
                res.send(result);
            });
        }
    });
};

exports.updateWidget = function(req, res){
    console.log(JSON.stringify(req.body, null, '\t'));
    db.collection('widget',function(err, collection) {
        if(err){
            console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            var widgetModel = req.body;
            if(!widgetModel._id) res.send(404);
            
            var widgetId = mongo.ObjectID(widgetModel._id);
            delete widgetModel._id;
            widgetModel.dateUpdated = new Date().toISOString();
            
            collection.update({_id: widgetId}, widgetModel, {safe:true, multi: false}, function(err, result) {
                console.log(JSON.stringify(err));
                if(err) res.send(404);
                console.log(JSON.stringify(result));
                
                res.send(result);
            });
        }
    });
};

exports.deleteWidget = function(req, res){
    var widgetId = mongo.ObjectID(req.params.widgetId);
    db.collection('widget',function(err, collection) {
        if(err){
            console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            collection.remove({_id : widgetId}, {safe:true,justOne:true}, function(err, result) {
                //console.log(JSON.stringify(werr));
                console.log('deleted ' + req.params.widgetId);
                res.send(200);
            });
        }
    });
};

exports.upsertDashboard = function(req, res){
    db.collection('dashboard',function(err, collection) {
        if(err){
            console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            var dashboardModel = req.body;
            if(dashboardModel._id){
                dashboardModel._id = mongo.ObjectID(dashboardModel._id);
            }
            if(!dashboardModel.dateCreated){
                dashboardModel.dateCreated = new Date().toISOString();
            }
            dashboardModel.dateUpdated = new Date().toISOString();
            collection.save(dashboardModel, {safe:true}, function(err, result) {
                console.log(JSON.stringify(err));
                if(err) res.send(404);
                console.log(JSON.stringify(result));
                
                res.send(result);
            });
        }
    });
};

exports.deleteDashboard = function(req, res){
    var dashboardId = mongo.ObjectID(req.params.dashboardId);
    db.collection('dashboard',function(err, collection) {
        if(err){
            console.log(JSON.stringify(err, null, '\t'));
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
            console.log('before query' + JSON.stringify(req.body));
            var q = utils.getwidgetListMongoQuery(req.body);
            console.log(JSON.stringify(q));
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
                //console.log(JSON.stringify(err));
                if(err) res.send(404);
                console.log(JSON.stringify(result));
                res.send(200);
            });
        }
    });
};

exports.removeTag = function(req, res){
    var tagId = mongo.ObjectID(req.params.tagId);
    db.collection('tags',function(err, collection) {
        if(err){
            console.log(JSON.stringify(err, null, '\t'));
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
            console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            collection.remove({dashboardId : dashboardId}, {safe:true}, function(err, result) {
                console.log(JSON.stringify(result));
                res.send(200);
            });
        }
    });
};


exports.deleteAllWidgetsDashboard = function(req, res){
    var dashboardId = req.params.dashboardId;
    db.collection('widget',function(err, collection) {
        if(err){
            console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            collection.remove({dashboardId : dashboardId}, {safe:true}, function(err, result) {
                console.log(JSON.stringify(result));
                res.send(200);
            });
        }
    });
};


/*--------------------------------------------------------------------------------------------------------------------*/
// Populate database with sample data -- Only used once: the first time the application is started.
// You'd typically not find this code in a real-life app, since the database would already exist.
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