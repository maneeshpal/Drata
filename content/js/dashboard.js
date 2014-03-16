"use strict";
var Dashboard = function(){
    var self = this;
    self.name = dashboardModel.name;
    self.index= 1;
    self.widgets = ko.observableArray();

    self.widgets(ko.utils.arrayMap(
        dashboardModel.widgets,
        function(model) {
            return new Widget(model, self.index++); 
        }
    ));

    self.loadWidget = function(elem,widget){
        widget && widget.loadWidget();
    };

    self.addWidget = function(widgetModel){
        self.widgets.push(new Widget(widgetModel, self.index++));
    };
    self.deleteWidget = function(widget){
        self.widgets.remove(widget);
    };
};

var Widget = function(widgetModel, index){
    var self = this;
    var chartData;
    self.pieKeys = ko.observableArray([]);
    self.selectedPieKey = ko.observable();
    self.name = widgetModel.name || widgetModel.selectedDataKey;
    self.sizex = ko.observable(widgetModel.sizex || 1);
    self.widgetClass= ko.computed(function(){
        return 'widget-size-' + self.sizex();
    });
    self.parseError = ko.observable();
    var content;
    self.chartType = ko.observable(widgetModel.segmentModel.dataGroup.chartType);
    self.contentTemplate = ko.computed(function(){
        switch(self.chartType()){
            case 'line':
                content = new LineContent(index);
                break;
            case 'area':
                content = new AreaContent(index);
                break;
            case 'pie':
                content = new PieContent(index);
                break;
            case 'bar':
                content = new BarContent(index);
                break;
            case 'scatter':
                content = new ScatterContent(index);
                break;
        }

        return {
            name: content.template, 
            data: content
        };

    });

    self.editWidget = function () {
        $('#graphBuilder').addClass('showme');
        widgetProcessor.attach(widgetModel, self.updateWidget.bind(self));
    };

    var _t = undefined;

    self.resizeContent = function(){
        _t && clearTimeout(_t);
        if(!content || !content.resize || !!self.parseError()) return;
        _t = setTimeout(content.resize, 500);
    };

    self.loadWidget = function(){
        self.parseError(undefined);
        var inputData = DataRetriever.getData(widgetModel.selectedDataKey);
        try{
            chartData = Conditioner.getGraphData(widgetModel.segmentModel, inputData);
        }
        catch(e){
            self.parseError(e);
            return;
        }

        if(widgetModel.segmentModel.dataGroup.chartType === 'pie')
            chartData = chartData[0].values;

        self.pieKeys(chartData.map(function(dataItem){
            return dataItem.key;
        }));
        self.selectedPieKey(self.pieKeys()[0]);
        content.drawChart(chartData, widgetModel.segmentModel);
        //prevent double draw on page load
        setTimeout(function(){
            drata.utils.windowResize(self.resizeContent.bind(self));
        }, 200);
    };

    self.updateWidget = function (newModel) {
        widgetModel = newModel;
        self.chartType(widgetModel.segmentModel.dataGroup.chartType);
        self.loadWidget();
    };

    self.getModel = function (argument) {
        widgetModel.sizex = self.sizex();
        return widgetModel;
    };
    
    self.selectedPieKey.subscribe(function(newValue){
        var newdata = _.find(chartData, function(item){
            return item.key === newValue;
        });
        content && content.change && content.change(newdata);
    });
    self.sizex.subscribe(self.resizeContent.bind(self));
};

var LineContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.template = 'content-template';
    var chart, chartData;
    
    var _t;
    self.drawChart = function(_data, segmentModel){
        chartData = _data;
        _t && clearTimeout(_t);
        chart = drata.charts.lineChart().xAxisType(segmentModel.dataGroup.xAxisType).includeDataMarkers(false);
        d3.select('#'+self.widgetContentId +' svg')
            .datum(chartData[0].values)
            .call(chart);
        return chart;
    };
    self.resize = function(){
        chart && chart.resize && chart.resize();
    };
    self.change = function(_data){
        chart && chart.change && chart.change(_data.values);
    };
};

var ScatterContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.template = 'content-template';
    var chart, chartData;
    var _t;
    self.drawChart = function(_data, segmentModel){
        chartData = _data;
        _t && clearTimeout(_t);

        chart = drata.charts.scatterPlot().xAxisType(segmentModel.dataGroup.xAxisType);
        
        d3.select('#'+self.widgetContentId +' svg')
            .datum(chartData[0].values)
            .call(chart);
        return chart;
    };
    self.resize = function(){
        chart && chart.resize && chart.resize();
    };
    self.change = function(_data){
        chart && chart.change && chart.change(_data.values);
    };
};

var BarContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.template = 'content-template';
    self.contentType = 'bar';
    var chart,chartData, _t;

    self.drawChart = function(_data){
        chartData = _data;
        _t && clearTimeout(_t);
        
        chart = drata.charts.barChart().showBarLabels(true);
        d3.select('#'+self.widgetContentId +' svg')
            .datum(chartData[0].values)
            .call(chart);
        return chart;
    };
    self.resize = function(){
        chart && chart.resize && chart.resize();
    };
    self.change = function(_data){
        chart && chart.change && chart.change(_data.values);
    };
};

var AreaContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.template = 'content-template';
    var chart, chartData;
    var _t;
    self.drawChart = function(_data, segmentModel){
        chartData = _data;
        _t && clearTimeout(_t);

        chart = drata.charts.areaChart().xAxisType(segmentModel.dataGroup.xAxisType).includeDataMarkers(false);
        
        d3.select('#'+self.widgetContentId +' svg')
            .datum(chartData[0].values)
            .call(chart);
        return chart;
    };
    self.resize = function(){
        chart && chart.resize && chart.resize();
    };
    self.change = function(_data){
        chart && chart.change && chart.change(_data.values);
    };
};

var PieContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.contentType = 'pie';
    self.template = 'content-template';
    var _t = undefined;
    var chartData = [];
    var chart;
    
    self.drawChart = function(_data){
        chartData = _data;
        _t && clearTimeout(_t);
        chart = drata.charts.pieChart();

        d3.select('#'+self.widgetContentId + ' svg')
            .datum(chartData[0])
            .call(chart);
        return chart;
    };
    self.resize = function(){
        chart && chart.resize && chart.resize();
    };
    self.change = function(_data){
        chart && chart.change && chart.change(_data);
    };
};

var WidgetProcessor = function(){
    var self = this;
    self.widgetName = ko.observable();
    self.addUpdateBtnText = ko.observable('Add Widget');
    self.processSegment = true;
    self.previewGraph = ko.observable(false);
    self.dataKeys = ko.observableArray(DataRetriever.getDataKeys());
    self.selectedDataKey = ko.observable();
    //self.inputData = ko.observable(); 
    //self.outputData = ko.observable();
    //self.newWidget = ko.observable(true);
    self.parseError = ko.observable();

    self.selectedDataKey.subscribe(function(newValue){
        //self.outputData(undefined);
        //self.inputData(undefined);
        if(!newValue){
            self.segment.initialize();
        }
        else if(self.processSegment){
            var data = DataRetriever.getData(newValue);
            var properties = DataRetriever.getUniqueProperties(data);
            self.segment.initialize({properties:properties});    
        }

    });

    self.segment = new Segmentor();
    self.notifyWidget = function () {
        if(!segmentIsValid())
            return;
        var widgetModel = {
            selectedDataKey: self.selectedDataKey(),
            segmentModel: self.segment.getModel()
        };
        
        self.onWidgetUpdate && self.onWidgetUpdate(widgetModel);
        !self.onWidgetUpdate && dashboard.addWidget(widgetModel);
        self.onWidgetUpdate = undefined;
        self.onWidgetCancel = undefined;
        self.addUpdateBtnText('Add');
        self.selectedDataKey(undefined);
        self.previewGraph(false);
        $('#graphBuilder').removeClass('showme');
        //self.newWidget(true);
    };
    self.attach = function (model,onWidgetUpdate, onWidgetCancel) {
        var clonemodel = drata.utils.clone(model);
        self.processSegment = false;
        self.selectedDataKey(clonemodel.selectedDataKey);
        self.processSegment = true;
        self.segment.initialize(clonemodel.segmentModel);
        self.previewGraph(true);
        self.addUpdateBtnText('Update Widget');
        self.onWidgetUpdate = onWidgetUpdate;
        self.onWidgetCancel = onWidgetCancel;
        self.handleGraphPreview(clonemodel.segmentModel);
    };
    self.widgetCancel = function() {
        self.parseError(undefined);
        self.onWidgetUpdate = undefined;
        self.onWidgetCancel = undefined;
        self.addUpdateBtnText('Add Widget');
        self.previewGraph(false);
        self.selectedDataKey(undefined);
        $('#graphBuilder').removeClass('showme');
    };
    var chart, _t;
    self.handleGraphPreview = function(segmentModel){
        self.parseError(undefined);
        var inputData = DataRetriever.getData(self.selectedDataKey());
        var data;
        try{
            data = Conditioner.getGraphData(segmentModel, inputData);
        }
        catch(e){
            self.parseError(e);
        }
        if(!data) return;         

        self.previewGraph(true);
        
        var mydata = data[0].values;

        switch(segmentModel.dataGroup.chartType)
        {
            case 'line':
                chart = drata.charts.lineChart().xAxisType(segmentModel.dataGroup.xAxisType);
            break;
            case 'area':
                chart = drata.charts.areaChart().xAxisType(segmentModel.dataGroup.xAxisType);
            break;
            case 'bar':
                chart = drata.charts.barChart();
                break; 
            case 'pie':
                chart = drata.charts.pieChart();
                mydata = mydata[0];
            break;
            case 'scatter':
                chart = drata.charts.scatterPlot();
            break;
        }
        d3.select('#previewgraph').selectAll('svg').remove();
        d3.select('#previewgraph').append('svg');

        d3.select('#previewgraph svg')
            .datum(mydata)
            .call(chart);

        drata.utils.windowResize(function(){
            if(!chart) return;
            _t && clearTimeout(_t);
            _t = setTimeout(chart.resize, 500);
        });

    };
    var segmentIsValid = function(){
        var selerrors = ko.validation.group(self.segment.selectionGroup, {deep:true});
        var dataGroupErrors = ko.validation.group(self.segment.dataGroup, {deep:true});
        var conditions = self.segment.conditionGroup.conditions();
        var conditionsValid = true;
        for(var c= 0; c< conditions.length; c++){
            if(!conditions[c].isValidCondition()) {
                conditionsValid = false;
            }
        }
        if(selerrors().length > 0 || dataGroupErrors().length > 0 || !conditionsValid){
            selerrors.showAllMessages();
            dataGroupErrors.showAllMessages();
            return false;
        }
        return true;
    };
    
    self.preview = function(){
        if(!segmentIsValid())
            return;
        self.handleGraphPreview(self.segment.getModel());
    };
    self.previewGraph.subscribe(function(newValue){
        if(!newValue){
            d3.select('#previewgraph').selectAll('svg').remove();
            d3.select('#previewgraph').append('svg');
            _t && clearTimeout(_t);
            chart = undefined;   
        }
    });
    // $(window).on('resize', function(){
    //     self.chart && self.chart.onResize();   
    // });
};

var TopBar = function(){
    var self = this;
    self.addWidget = function(){
        $('#graphBuilder').toggleClass('showme');
    }
}