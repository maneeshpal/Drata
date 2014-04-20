var defaultWidgetModel = [
    '{"selectedDataKey":"shoppercheckout","segmentModel":{"selection":[{"groupType":"selection","groups":[],"logic":"+","groupBy":"value","selectedProp":"price","isComplex":false}],"dataGroup":{"hasGrouping":true,"groupByProp":"itemAgeGroup","xAxisType":"date","xAxisProp":"timestamp","timeseriesInterval":"300000","errors":[]},"group":[],"dataFilter":{"intervalKind":"day","intervalType":"dynamic","min":19,"max":60,"dateProp":"timestamp"},"chartType":"scatter"},"sizex":"4","sizey":"1"}'
    ];

    var widgets = defaultWidgetModel.map(function(item){
        return JSON.parse(item);
    })
    window.dashboardModel = {
        name: 'maneesh',
        widgets: widgets
    };