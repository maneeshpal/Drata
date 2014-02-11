var StackedAreaContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.template = 'pie-content-template';
    self.pieKeys = ko.observableArray([]);
    self.selectedPieKey = ko.observable();
    var chart, chartData;
    self.selectedPieKey.subscribe(function(newValue){
        var newdata = _.find(chartData, function(item){
            return item.key === newValue;
        });
        chart && chart.change(newdata.values);
    });
    var _t;
    self.drawChart = function(_data){
        chartData = _data;
        _t && clearTimeout(_t);

        self.pieKeys(chartData.map(function(dataItem){
            return dataItem.key;
        }));
        self.selectedPieKey(self.pieKeys()[0]);

        chart = drata.charts.areaChart();
        
        d3.select('#'+self.widgetContentId +' svg')
            .datum(chartData[0].values)
            .call(chart);
        drata.utils.windowResize(self.resize.bind(self));
        
        return chart;
    };

    self.resize = function(){
        if(!chart) return;
        _t && clearTimeout(_t);
        _t = setTimeout(chart.resize, 2000);
    }