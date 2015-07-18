
// /**
//  * Module dependencies.
//  */

var express = require('express'),
    bodyParser = require('body-parser'),
    drataRepository = require('./repositories/drataRepository'),
    controller = require('./routes/externaldatacontroller'),
   	http = require('http'),
   	path = require('path'),
    config = require('./routes/config.json'),
    skt = require('./routes/socket'),
    logger = require('./routes/logger');

var app = express();

var serverNames = config.dataSources.map(function(d){
    return d.alias;
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.static(path.join(__dirname, 'content')));

app.set('port',process.env.PORT || 3000);

app.get('/dashboard/:dashboardId', function(req, res) {
  logger.logRequest(req, { pageId: 'dashboard'});
  res.sendFile('/dash.html', { root: __dirname });
});

app.get('/dashboard', function(req, res) {
  logger.logRequest(req, { pageId: 'dashboard manager'});
  res.sendFile('/dash.html', { root: __dirname });
});

app.get('/', function(req, res) {
  logger.logRequest(req, { pageId: 'homepage'});
  res.sendFile('homepage.html', { root: __dirname });
});

app.get('/api/databasepop', controller.databasepop);

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
app.put('/api/dashboard', drataRepository.updateDashboard);

//add dashboard
app.post('/api/dashboard', drataRepository.addDashboard);

//delete dashboard
app.delete('/api/dashboard/:dashboardId', drataRepository.deleteDashboard);

//update widget
app.put('/api/widget', drataRepository.updateWidget);
app.put('/api/widgetviewoptions', drataRepository.updateWidgetViewOptions);
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

