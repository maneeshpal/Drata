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
        if(verb === 'PUT' || verb === 'POST'){
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

    // var createWidget = function(model, callback){
    //     _perform('POST', '/api/widget',model, callback);
    // };
    var upsertWidget = function(model, callback){
        _perform('PUT', apiRoot + 'widget',model, callback);
        //console.log(JSON.stringify(model, null, '\t'));
    };
    var deleteWidget = function(widgetId, callback){
        var url = apiRoot + drata.utils.format('widget/{0}', widgetId);
        _perform('DELETE',url, undefined, callback);
        //console.log(JSON.stringify(model, null, '\t'));
    };

    //EXTERNAL API
    getUniqueProperties = function(dataKey, callback){
        var url = apiExternalRoot + drata.utils.format('{0}/{1}/properties', userDataStore, dataKey);
        _perform('GET', url, undefined, callback);
    };

    getDataKeys = function(callback){
        var url = apiExternalRoot + drata.utils.format('{0}/keys', userDataStore);
        _perform('GET', url, undefined, callback);
        
    };
    getData = function(model, dataKey, callback){
        var url = apiExternalRoot + drata.utils.format('{0}/{1}', userDataStore, dataKey);
        _perform('POST', url, model, callback);
    };

    //END EXTERNAL API
    root.drata.ns('apiClient').extend({
        getDashboard: getDashboard,
        getWidgetsOfDashboard: getWidgetsOfDashboard,
        upsertWidget: upsertWidget,
        deleteWidget:deleteWidget,
        getDataKeys: getDataKeys,
        getUniqueProperties: getUniqueProperties,
        getData: getData
    });
})(this);

