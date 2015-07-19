/**
 * drata namespace
 * Defines a library of api client operations
 */

; (function(root) {
    var unique_id = drata.global.uniqueClientId;
    var apiRoot = '/api/';
    var socket;
    try{
        socket = io.connect();
    }
    catch(e){
        
    }
    var apiExternalRoot = apiRoot + 'external/';
    var database = 'shopperstop';
    var _perform = function(verb, url, body){
        var options = {
            type: verb.toUpperCase(),
            url: url,
            contentType: 'application/json',
            headers: { 'Access-Control-Allow-Origin': '*', 'clientid': unique_id }
        };
        if(body){
            options.data = JSON.stringify(body);
        }
        return $.ajax(options);
    };

    var getDashboard = function(id){
        var url = apiRoot + drata.utils.format('dashboard/{0}', id);
        return _perform('GET', url);
    };

    var getWidget = function(id){
        var url = apiRoot + drata.utils.format('widget/{0}', id);
        return _perform('GET', url);
    };

    var getWidgetsOfDashboard = function(dashboardId){
        var url = apiRoot + drata.utils.format('dashboard/{0}/widgets', dashboardId);
        return _perform('GET', url);
    };

    var getWidgets = function(model){
        var url = apiRoot + 'widgets';
        return _perform('POST', url,model);
    };

    var deleteAllWidgetsDashboard = function(dashboardId){
        var url = apiRoot + drata.utils.format('dashboard/{0}/widgets', dashboardId);
        return _perform('DELETE', url);
    };

    var addWidget = function(model){
        var promise = _perform('POST', apiRoot + 'widget',model);
        promise.done(function(response){
            socket && socket.emit('widgetcreated', {
                widgetId : response._id, 
                dashboardId: response.dashboardId
            });
        });
        return promise;
    };

    var updateWidget = function(model){
        var promise = _perform('PUT', apiRoot + 'widget',model);
        promise.done(function(response){
            socket && socket.emit('widgetupdated', {
                widgetId : model._id, 
                dashboardId: model.dashboardId
            });
        });
        return promise;
    };

    var updateWidgetViewOptions = function(model){
        var promise = _perform('PUT', apiRoot + 'widgetviewoptions',model);
        promise.done(function(response){
            socket && socket.emit('widgetupdated', {
                widgetId : model._id, 
                dashboardId: model.dashboardId
            });
        });
        return promise;
    };

    var deleteWidget = function(widgetId){
        var url = apiRoot + drata.utils.format('widget/{0}', widgetId);
        var promise = _perform('DELETE',url);
        promise.done(function(){
            socket && socket.emit('widgetremoved', {
                widgetId : widgetId
            });
            drata.pubsub.publish('widgetremoved', widgetId);
        });
        return promise;
    };

    var updateDashboard = function(model) {
        return _perform('PUT', apiRoot + 'dashboard',model);
    };

    var addDashboard = function(model) {
        return _perform('POST', apiRoot + 'dashboard',model);
    };

    var deleteDashboard = function(dashboardId) {
        var url = apiRoot + drata.utils.format('dashboard/{0}', dashboardId);
        return _perform('DELETE',url);
    };

    var getAllDashboards = function(){
        var url = apiRoot + 'dashboards';
        return _perform('GET',url);
    };

    var getAllTags = function(){
        var url = apiRoot + 'tags';
        var tagPromiseList = [];
        //var defer = $.Deferred();
        return getAllDashboards().then(function(dashboardList){
            var dnameMapping = {};
            _.each(dashboardList, function(dash){
                dnameMapping[dash._id] = dash.name;
                var p = getAllTagsOfDashboard(dash._id);
                tagPromiseList.push(p);
            });
            return $.when.apply($, tagPromiseList).then(function(){
                var tagList = [], hasTags = [];
                var listOfTags = tagPromiseList.length > 1 ? arguments : [arguments];
                _.each(listOfTags, function(tags){
                    _.each(tags[0], function(tag){
                        tag.dashboardName = dnameMapping[tag.dashboardId];
                        hasTags.push(tag.dashboardId);
                        tagList.push(tag);
                    });
                });
                _.each(dnameMapping, function(name, id){
                    hasTags.indexOf(id) < 0 && tagList.push({
                        tagName: '__',
                        dashboardName: name,
                        dashboardId: id
                    });
                });
                return tagList;
            })
        });
    };

    var getAllTagsOfDashboard = function(dashboardId){
        var url = apiRoot + drata.utils.format('dashboard/{0}/tags', dashboardId);
        return _perform('GET',url);
    };

    var deleteAllTagsDashboard = function(dashboardId){
        var url = apiRoot + drata.utils.format('dashboard/{0}/tags', dashboardId);
        return _perform('DELETE',url);
    };

    var addTag = function(model){
        return _perform('PUT', apiRoot + 'tags',model);
    };

    var removeTag = function(tagId){
        var url = apiRoot + drata.utils.format('tags/{0}', tagId);
        return _perform('DELETE', url);
    };

    //EXTERNAL API
    var getDataSourceNames = function(){
        var url = apiExternalRoot + 'datasource';
        return _perform('GET', url);
    };

    var getDatabaseNames = function(dataSource){
        var url = apiExternalRoot + drata.utils.format('{0}/database', dataSource);
        return _perform('GET', url);
    };

    var getUniqueProperties = function(params){
        var url = apiExternalRoot + drata.utils.format('{0}/{1}/{2}/properties',params.dataSource, params.database, params.collectionName);
        return _perform('GET', url);
    };

    var getDataKeys = function(params){
        var url = apiExternalRoot + drata.utils.format('{0}/{1}/collectionNames',params.dataSource, params.database);
        return _perform('GET', url);
    };
    
    var getData = function(model) {
        var defer = $.Deferred();
        var clientAggregation = false;
        var postData = {
            chartType: model.segment.chartType,
            selection: model.segment.selection,
            dataGroup: model.segment.dataGroup,
            dataFilter: model.segment.dataFilter,
            group: model.segment.group,
            clientAggregation:clientAggregation
        };
        var url = apiExternalRoot + drata.utils.format('{0}/{1}/{2}', model.dataSource, model.database, model.collectionName);
        
        _perform('POST', url, postData).then(function(re){
           defer.resolve(clientAggregation ? drata.exports.getGraphData(postData, re) : re);
        }, function(err){
            defer.reject(err);
        });

        return defer.promise();
    };

    //END EXTERNAL API
    root.drata.ns('apiClient').extend({
        getDashboard: getDashboard,
        getWidget: getWidget,
        getWidgetsOfDashboard: getWidgetsOfDashboard,
        getWidgets: getWidgets,
        addWidget: addWidget,
        updateWidget: updateWidget,
        updateWidgetViewOptions: updateWidgetViewOptions,
        deleteWidget:deleteWidget,
        updateDashboard: updateDashboard,
        addDashboard: addDashboard,
        deleteDashboard: deleteDashboard,
        getAllDashboards:getAllDashboards,
        getAllTags: getAllTags,
        getAllTagsOfDashboard: getAllTagsOfDashboard,
        addTag: addTag,
        removeTag: removeTag,
        deleteAllTagsDashboard:deleteAllTagsDashboard,
        deleteAllWidgetsDashboard:deleteAllWidgetsDashboard,
        getDataKeys: getDataKeys,
        getUniqueProperties: getUniqueProperties,
        getData: getData,
        getDataSourceNames: getDataSourceNames,
        getDatabaseNames: getDatabaseNames
    });
})(this);