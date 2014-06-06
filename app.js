
// /**
//  * Module dependencies.
//  */

var express = require('express'),
    mongoRepository = require('./routes/mongoRepository.js'),
    drataRepository = require('./routes/drataRepository.js'),
   	http = require('http'),
   	cors = require('cors'),
   	path = require('path');

var app = express();

 
app.configure(function () {
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
    //app.use(express.bodyParser());
    app.use(express.json());
    //app.use(cors());
    app.use(express.urlencoded());
    app.use(express.static(path.join(__dirname, 'content')));
});

app.set('port', process.env.PORT || 3000);
app.get('/dashboard/manage', function(req, res){
  res.sendfile('manage.html');
});

app.get('/dashboard/:dashboardId', function(req, res){
  res.sendfile('dash.html');
});

app.get('/dashboard', function(req, res){
  res.sendfile('dash.html');
});

app.get('/segment', function(req, res){
  res.sendfile('segment.html');
});

app.get('/temp', function(req, res){
  res.sendfile('temp.html');
});

app.get('/tcup', function(req, res){
  res.sendfile('tcup.html');
});


app.get('/api/dashboardpop', drataRepository.pop);

//get dashboard
app.get('/api/dashboard/:dashboardId', drataRepository.findDashboard);

//get widgets of dashboard
app.get('/api/dashboard/:dashboardId/widgets', drataRepository.findWidgetsOfDashboard);

app.delete('/api/dashboard/:dashboardId/widgets', drataRepository.deleteAllWidgetsDashboard);

//find all dashboards. dont include widgets
app.get('/api/dashboards', drataRepository.getAllDashboards);
app.post('/api/widgets', drataRepository.getWidgets);
//update dashboard
app.post('/api/dashboard', drataRepository.upsertDashboard);

//update dashboard
app.put('/api/dashboard', drataRepository.upsertDashboard);

//update dashboard
app.delete('/api/dashboard/:dashboardId', drataRepository.deleteDashboard);

//update widget
app.put('/api/widget', drataRepository.upsertWidget);
//create widget
app.post('/api/widget', drataRepository.updateWidget);
//delete widget
app.delete('/api/widget/:widgetId', drataRepository.deleteWidget);


// //create dashboard
// app.post('/api/dashboard', drataRepository.createDashboard);

app.get('/api/tags', drataRepository.getAllTags);

app.get('/api/dashboard/:dashboardId/tags', drataRepository.getAllTagsOfDashboard);

app.delete('/api/dashboard/:dashboardId/tags', drataRepository.deleteAllTagsDashboard);

app.put('/api/tags', drataRepository.addTag);

app.delete('/api/tags/:tagId', drataRepository.removeTag);


app.get('/api/external/pop2539', mongoRepository.pop);
app.get('/api/external/datasources', mongoRepository.getDataSourceNames);
app.get('/api/external/:datasource/database', mongoRepository.getDatabaseNames);
app.get('/api/external/:datasource/:dbname/collectionNames', mongoRepository.getCollectionNames);
app.get('/api/external/:datasource/:dbname/:collectionName/properties', mongoRepository.findProperties);
app.post('/api/external/:datasource/:dbname/:collectionName', mongoRepository.findCollection);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});



