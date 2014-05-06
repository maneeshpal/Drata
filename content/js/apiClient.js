/**
 * drata namespace
 * Defines a library of api client operations
 */

; (function(root) {

    var apiRoot = '/api/';
    var apiExternalRoot = apiRoot + 'external/';
    var userDataStore = 'shopperstop';
    var _perform = function(verb, url, body, callback){
        var options = {
            type: verb.toUpperCase(),
            url: url,
            contentType: 'application/json',
            headers: { 'Access-Control-Allow-Origin': '*' },
            success: function(response){
                callback && callback(response);
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

    var getWidgetsOfDashboard = function(dashboardId, callback){
        var url = apiRoot + drata.utils.format('dashboard/{0}/widgets', dashboardId);
        _perform('GET', url,undefined, callback);
    };

    var upsertWidget = function(model, callback){
        _perform('PUT', apiRoot + 'widget',model, callback);
        //console.log(JSON.stringify(model, null, '\t'));
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
        function xyz(d){
            
        }
        _perform('GET',url, undefined, function(resp){
            len = resp.length, tagList = [];
            _.each(resp, function(tag){
                getDashboard(tag.dashboardId, function(dash){
                    len --;
                    tag.dashboardName = dash.name;
                    
                    if(len === 0){
                        callback && callback(resp);
                    }
                });
            })
        });
    };

    var getAllTagsOfDashboard = function(dashboardId, callback){
        var url = apiRoot + drata.utils.format('dashboard/{0}/tags', dashboardId);
        _perform('GET',url, undefined, callback);
    };

    var addTag = function(model, callback){
        _perform('PUT', apiRoot + 'tags',model, callback);
    };

    var removeTag = function(tagId, callback){
        var url = apiRoot + drata.utils.format('tags/{0}', tagId);
        _perform('DELETE', url,undefined, callback);
    };


    //EXTERNAL API
    var getUniqueProperties = function(dataKey, callback){
        var url = apiExternalRoot + drata.utils.format('{0}/{1}/properties', userDataStore, dataKey);
        _perform('GET', url, undefined, callback);
    };

    var getDataKeys = function(callback){
        var url = apiExternalRoot + drata.utils.format('{0}/collectionNames', userDataStore);
        _perform('GET', url, undefined, callback);
    };
    
    var getData = function(model, dataKey, callback){
        var url = apiExternalRoot + drata.utils.format('{0}/{1}', userDataStore, dataKey);
        _perform('POST', url, model, callback);
    };

    //END EXTERNAL API
    root.drata.ns('apiClient').extend({
        getDashboard: getDashboard,
        getWidgetsOfDashboard: getWidgetsOfDashboard,
        upsertWidget: upsertWidget,
        deleteWidget:deleteWidget,
        upsertDashboard: upsertDashboard,
        deleteDashboard: deleteDashboard,
        getAllDashboards:getAllDashboards,
        getAllTags: getAllTags,
        getAllTagsOfDashboard: getAllTagsOfDashboard,
        addTag: addTag,
        removeTag: removeTag,
        getDataKeys: getDataKeys,
        getUniqueProperties: getUniqueProperties,
        getData: getData
    });
})(this);

