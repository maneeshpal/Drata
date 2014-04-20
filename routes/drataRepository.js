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

// exports.pop = function(req, res){
//     populateDB(req, res);
// };

exports.findDashboard = function(req, res) {
    var dashboardId = req.params.id;
    db.collection('dashboard',function(err, collection) {
        if(err){
            res.send(404);
        }
        else{
            //console.log('dashboardid:  ' + dashboardId);
            collection.findOne({"_id" : mongo.ObjectID(dashboardId)}, function(err, result) {
                res.send(result);
            });
        }
    });
};

exports.findWidgetsOfDashboard = function(req, res) {
    var dashboardId = req.params.id;
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

exports.createWidget = function(req, res){
    db.collection('widget',function(err, collection) {
        if(err){
            console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            collection.insert(req.body, {safe:true}, function(err, result) {
                //console.log(JSON.stringify(werr));
                
                res.send(result[0]._id);
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
            var widgetId = req.body._id;
            var widgetModel = req.body;
            if(widgetModel._id){
                widgetModel._id = mongo.ObjectID(widgetModel._id);
            }
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

exports.deleteWidget = function(req, res){
    var widgetId = mongo.ObjectID(req.params.widgetId);
    db.collection('widget',function(err, collection) {
        if(err){
            console.log(JSON.stringify(err, null, '\t'));
            res.send(404);
        }
        else{
            collection.remove({_id : widgetId}, {safe:true}, function(err, result) {
                //console.log(JSON.stringify(werr));
                console.log('deleted ' + req.params.widgetId);
                res.send(200);
            });
        }
    });
};

exports.findDashboards = function(req, res) {
    db.collection('dashboard',function(err, result) {
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