
// /**
//  * Module dependencies.
//  */

// var express = require('express');
// var routes = require('./routes');
// var user = require('./routes/user');
// var http = require('http');
// var path = require('path');

// var app = express();

// // all environments
// app.set('port', process.env.PORT || 3000);
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');
// app.use(express.favicon());
// app.use(express.logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded());
// app.use(express.methodOverride());
// app.use(app.router);
// app.use(express.static(path.join(__dirname, 'public')));

// // development only
// if ('development' == app.get('env')) {
//   app.use(express.errorHandler());
// }

// app.get('/', routes.index);
// app.get('/users', user.list);

// http.createServer(app).listen(app.get('port'), function(){
//   console.log('Express server listening on port ' + app.get('port'));
// });

var express = require('express'),
    mongoRepository = require('./routes/mongoRepository.js'),
    drataRepository = require('./routes/drataRepository.js'),
 	//ushipdev = require('./routes/ushipdevmongo'),
 	http = require('http'),
 	cors = require('cors'),
 	path = require('path');

var app = express();

 
app.configure(function () {
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.bodyParser());
    //app.use(cors());
    app.use(express.urlencoded());
    app.use(express.static(path.join(__dirname, 'content')));
});

app.set('port', process.env.PORT || 3000);
app.get('/', function(req, res){
  res.sendfile('dash.html');
});

app.get('/segment', function(req, res){
  res.sendfile('segment.html');
});

app.get('/temp', function(req, res){
  res.sendfile('temp.html');
});

app.get('/api/dashboards/:id', drataRepository.findDashboard);
app.get('/api/dashboards', drataRepository.findDashboards);

app.post('/api/dashboards', drataRepository.createDashboard);
app.post('/api/dashboards/:id', drataRepository.updateDashboard);

app.get('/api/dashboards/:id/widgets', drataRepository.findWidgets);
app.get('/api/dashboards/:id/widgets/:id', drataRepository.findWidget);

app.post('/api/dashboards/:id/widgets', drataRepository.updateWidgets);
app.post('/api/dashboards/:id/widgets/:id', drataRepository.updateWidget);


app.get('/api/:dbname/keys', mongoRepository.findAllKeys);
app.get('/api/:dbname/:collectionName/properties', mongoRepository.findProperties);
app.post('/api/:dbname/:collectionName', mongoRepository.findCollection);

// app.get('/shopperstop/keys', shopperstop.findAllKeys);
// app.get('/shopperstop/pop', shopperstop.pop);

// app.post('/shopperstop/:collectionName', shopperstop.findCollection);
// app.get('/shopperstop/:collectionName/properties', shopperstop.findProperties);
// //app.get('/shopperstop/:collectionName/:id', shopperstop.findEventByCollectionAndId);
// // app.post('/shopperstop', shopperstop.addShopperCheckoutEvent);
// app.get('/ushipdev/keys', ushipdev.findAllKeys);

// app.post('/ushipdev/:collectionName', ushipdev.findCollection);
// app.get('/ushipdev/:collectionName/properties', ushipdev.findProperties);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});



