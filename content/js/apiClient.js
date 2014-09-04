/**
 * drata namespace
 * Defines a library of api client operations
 */

; (function(root) {
    var unique_id = drata.global.uniqueClientId;
    var apiRoot = '/api/';
    var socket = io.connect();
    var apiExternalRoot = apiRoot + 'external/';
    var database = 'shopperstop';
    var _perform = function(verb, url, body, callback){
        var options = {
            type: verb.toUpperCase(),
            url: url,
            contentType: 'application/json',
            headers: { 'Access-Control-Allow-Origin': '*', 'clientid': unique_id },
            success: function(response, stats){
                callback && callback({success: true, result:response});
            },
            error: function(response){
                console.log(response);
                callback && callback({
                    success: false,
                    status: response.status,
                    message: response.responseText
                });
            }
        };
        if(body){
            options.data = JSON.stringify(body);
        }
                  
        $.ajax(options);
    };

    var getDashboard = function(id, callback){
        var url = apiRoot + drata.utils.format('dashboard/{0}', id);
        _perform('GET', url,undefined, callback);
    };

    var getWidget = function(id, callback){
        var url = apiRoot + drata.utils.format('widget/{0}', id);
        _perform('GET', url,undefined, callback);
    };

    var getWidgetsOfDashboard = function(dashboardId, callback){
        var url = apiRoot + drata.utils.format('dashboard/{0}/widgets', dashboardId);
        _perform('GET', url,undefined, callback);
    };

    var getWidgets = function(model, callback){
        var url = apiRoot + 'widgets';
        _perform('POST', url,model, callback);
    };

    var deleteAllWidgetsDashboard = function(dashboardId, callback){
        var url = apiRoot + drata.utils.format('dashboard/{0}/widgets', dashboardId);
        _perform('DELETE', url,undefined, callback);
    };

    var upsertWidget = function(model, callback){
        _perform('PUT', apiRoot + 'widget',model, function(response){
            callback(response);
            socket.emit('widgetcreated', {
                widgetId : response.result._id, 
                dashboardId: response.result.dashboardId
            });
        });
    };

    var updateWidget = function(model, callback){
        _perform('POST', apiRoot + 'widget',model, function(response){
            callback(response);
            socket.emit('widgetupdated', {
                widgetId : model._id, 
                dashboardId: model.dashboardId
            });
        });
    };

    var deleteWidget = function(widgetId, callback){
        var url = apiRoot + drata.utils.format('widget/{0}', widgetId);
        _perform('DELETE',url, undefined, callback);
        //console.log(JSON.stringify(model, null, '\t'));
    };

    var upsertDashboard = function(model, callback){
        _perform('PUT', apiRoot + 'dashboard',model, callback);
        //console.log(JSON.stringify(model, null, '\t'));
    };

    var deleteDashboard = function(dashboardId, callback){
        var url = apiRoot + drata.utils.format('dashboard/{0}', dashboardId);
        _perform('DELETE',url, undefined, callback);
        //console.log(JSON.stringify(model, null, '\t'));
    };

    var getAllDashboards = function(callback){
        var url = apiRoot + 'dashboards';
        _perform('GET',url, undefined, callback);
    };

    var getAllTags = function(callback){
        var url = apiRoot + 'tags';
        var len = 0, tagList = [];
        var self = this;
        getAllDashboards(function(response){
            len = response.result.length;
            _.each(response.result, function(dash){
                getAllTagsOfDashboard(dash._id, function(tagResponse){
                    len--;
                    if(tagResponse.result.length === 0){
                        tagList.push({
                            tagName: '__',
                            dashboardName: dash.name,
                            dashboardId: dash._id
                        });
                    }
                    else{
                        _.each(tagResponse.result, function(tag){
                            tag.dashboardName = dash.name;
                            tagList.push(tag);
                        });
                    }
                    
                    if(len === 0){
                        callback && callback({result:tagList});
                    }

                })
            })
        });
    };

    var getAllTagsOfDashboard = function(dashboardId, callback){
        var url = apiRoot + drata.utils.format('dashboard/{0}/tags', dashboardId);
        _perform('GET',url, undefined, callback);
    };

    var deleteAllTagsDashboard = function(dashboardId, callback){
        var url = apiRoot + drata.utils.format('dashboard/{0}/tags', dashboardId);
        _perform('DELETE',url, undefined, callback);
    };

    var addTag = function(model, callback){
        _perform('PUT', apiRoot + 'tags',model, callback);
    };

    var removeTag = function(tagId, callback){
        var url = apiRoot + drata.utils.format('tags/{0}', tagId);
        _perform('DELETE', url,undefined, callback);
    };

    //EXTERNAL API
    var getDataSourceNames = function(callback){
        var url = apiExternalRoot + 'datasource';
        _perform('GET', url, undefined, callback);
    };

    var getDatabaseNames = function(dataSource, callback){
        var url = apiExternalRoot + drata.utils.format('{0}/database', dataSource);
        _perform('GET', url, undefined, callback);
    };

    var getUniqueProperties = function(params, callback){
        var url = apiExternalRoot + drata.utils.format('{0}/{1}/{2}/properties',params.dataSource, params.database, params.collectionName);
        _perform('GET', url, undefined, callback);
    };

    var getDataKeys = function(params, callback){
        var url = apiExternalRoot + drata.utils.format('{0}/{1}/collectionNames',params.dataSource, params.database);
        _perform('GET', url, undefined, callback);
    };
    
    var getData = function(model, params, callback){
        var url = apiExternalRoot + drata.utils.format('{0}/{1}/{2}', params.dataSource, params.database, params.collectionName);
        _perform('POST', url, model, callback);
    };

    //END EXTERNAL API
    root.drata.ns('apiClient').extend({
        getDashboard: getDashboard,
        getWidget: getWidget,
        getWidgetsOfDashboard: getWidgetsOfDashboard,
        getWidgets: getWidgets,
        upsertWidget: upsertWidget,
        updateWidget: updateWidget,
        deleteWidget:deleteWidget,
        upsertDashboard: upsertDashboard,
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

