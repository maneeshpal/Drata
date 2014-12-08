
// /**
//  * Module dependencies.
//  */

var express = require('express'),
    drataRepository = require('./repositories/drataRepository'),
    controller = require('./routes/externaldatacontroller'),
   	http = require('http'),
   	path = require('path'),
    config = require('./routes/config.json'),
    skt = require('./routes/socket');

var app = express();

var serverNames = config.dataSources.map(function(d){
    return d.alias;
});



app.configure(function () {
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
    //app.use(express.bodyParser());
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.static(path.join(__dirname, 'content')));
});

app.set('port',process.env.PORT || 4000);

app.get('/dashboard/:dashboardId', function(req, res){
  res.sendfile('dash.html');
});

app.get('/dashboard', function(req, res){
  res.sendfile('dash.html');
});

app.get('/', function(req, res){
  res.sendfile('homepage.html');
});

app.get('/demo',  drataRepository.redirectDemo);

//app.get('/api/dashboardpop', mongoRepository.pop);

//get dashboard
app.get('/api/dashboard/:dashboardId', drataRepository.findDashboard);

//get dashboard
app.get('/api/widget/:widgetId', drataRepository.findWidget);

//get widgets of dashboard
app.get('/api/dashboard/:dashboardId/widgets', drataRepository.findWidgetsOfDashboard);

app.delete('/api/dashboard/:dashboardId/widgets', drataRepository.deleteAllWidgetsDashboard);

//find all dashboards. dont include widgets
app.get('/api/dashboards', drataRepository.getAllDashboards);
app.get('/api/truncatedata', drataRepository.truncateData);
app.get('/api/generateDemoDashboard', drataRepository.generateDemoDashboard);
app.post('/api/widgets', drataRepository.getWidgets);
//update dashboard
app.post('/api/dashboard', drataRepository.upsertDashboard);

//update dashboard
app.put('/api/dashboard', drataRepository.upsertDashboard);

//update dashboard
app.delete('/api/dashboard/:dashboardId', drataRepository.deleteDashboard);

//update widget
app.put('/api/widget', drataRepository.updateWidget);
//create widget
app.post('/api/widget', drataRepository.addWidget);
//delete widget
app.delete('/api/widget/:widgetId', drataRepository.deleteWidget);

app.get('/api/tags', drataRepository.getAllTags);

app.get('/api/dashboard/:dashboardId/tags', drataRepository.getAllTagsOfDashboard);

app.delete('/api/dashboard/:dashboardId/tags', drataRepository.deleteAllTagsDashboard);

app.put('/api/tags', drataRepository.addTag);

app.delete('/api/tags/:tagId', drataRepository.removeTag);

app.get('/api/external/datasource', function(req, res){
  res.json(serverNames);
});
app.get('/api/external/:datasource/database', controller.getDatabaseNames);
app.get('/api/external/:datasource/:dbname/collectionNames', controller.getCollectionNames);
app.get('/api/external/:datasource/:dbname/:collectionName/properties', controller.findProperties);
app.post('/api/external/:datasource/:dbname/:collectionName', controller.findCollection);

var server = http.createServer(app);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
skt.initialize(server);

