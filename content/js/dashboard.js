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
        widget && widget.loadWidgetInit();
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
    self.name = widgetModel.name || widgetModel.selectedDataKey;
    self.sizex = ko.observable(widgetModel.sizex || 1);
    self.widgetClass= ko.computed(function(){
        return 'widget-size-' + self.sizex();
    });
    var content;
    self.sizex.subscribe(function(){
        content.resize();
    });
    self.chartType = ko.observable(widgetModel.segmentModel.chartType);
    self.contentTemplate = ko.computed(function(){
        switch(self.chartType()){
            case 'line':
                content = new LineContent(index);
                break;
            case 'area':
                content = new StackedAreaContent(index);
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

    self.loadWidgetInit = function(){ //runs after render
        var inputData = DataRetriever.getData(widgetModel.selectedDataKey);
        chartData = Conditioner.getGraphData(widgetModel.segmentModel, inputData);
        content.drawChart(chartData);
    };

    self.updateWidget = function (newModel) {
        widgetModel = newModel;
        var inputData = DataRetriever.getData(widgetModel.selectedDataKey);
        chartData = Conditioner.getGraphData(widgetModel.segmentModel, inputData);
        self.chartType(widgetModel.segmentModel.chartType);
        content.drawChart(chartData);
    };
    self.getModel = function (argument) {
        widgetModel.sizex = self.sizex();
        return widgetModel;
    }
};

var LineContent = function(index){
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

        chart = drata.charts.lineChart();
        
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
};

var ScatterContent = function(index){
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

        chart = drata.charts.scatterPlot();
        
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
};

var BarContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.template = 'pie-content-template';
    self.pieKeys = ko.observableArray([]);
    self.selectedPieKey = ko.observable();
    self.contentType = 'bar';
    var chart,chartData, _t;

    self.selectedPieKey.subscribe(function(newValue){
        var newdata = _.find(chartData, function(item){
            return item.key === newValue;
        });
        chart && chart.change(newdata.values);
    });

    self.drawChart = function(_data){
        chartData = _data;
        _t && clearTimeout(_t);
        
        self.pieKeys(chartData.map(
            function(dataItem){
                return dataItem.key;
            }));

        self.selectedPieKey(self.pieKeys()[0]);
        chart = drata.charts.barChart();
        d3.select('#'+self.widgetContentId +' svg')
            .datum(chartData[0].values)
            .call(chart);
        
        drata.utils.windowResize(self.resize.bind(self));
        
        //return chart;
    };

    self.resize = function(){
        if(!chart) return;
        _t && clearTimeout(_t);
        _t = setTimeout(chart.resize, 2000);
    }
};

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
};

var PieContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.contentType = 'pie';
    self.template = 'pie-content-template';
    var _t = undefined;
    self.pieKeys = ko.observableArray([]);
    self.selectedPieKey = ko.observable();
    var chartData = [];
    var chart;
    self.selectedPieKey.subscribe(function(newValue){
        var newdata = _.find(chartData, function(item){
            return item.key === newValue;
        });
        chart && chart.change(newdata);
    });

    self.drawChart = function(_data){
        chartData = _data[0].values;
        _t && clearTimeout(_t);
        self.pieKeys(chartData.map(function(dataItem){
            return dataItem.key;
        }));
        chart = drata.charts.pieChart();

        d3.select('#'+self.widgetContentId + ' svg')
            .datum(chartData[0])
            .call(chart);
        drata.utils.windowResize(self.resize.bind(self));
        self.selectedPieKey(self.pieKeys()[0]);
    };

    self.resize = function(){
        if(!chart) return;
        _t && clearTimeout(_t);
        _t = setTimeout(chart.resize, 2000);
    }
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
    self.newWidget = ko.observable(true);
    
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
        self.newWidget(true);
    };
    self.attach = function (model,onWidgetUpdate, onWidgetCancel) {
        var clonemodel = drata.utils.clone(model);
        self.processSegment = false;
        self.selectedDataKey(clonemodel.selectedDataKey);
        self.processSegment = true;
        self.segment.initialize(clonemodel.segmentModel);
        //self.newWidget(false);
        self.previewGraph(true);
        self.addUpdateBtnText('Update Widget');
        self.onWidgetUpdate = onWidgetUpdate;
        self.onWidgetCancel = onWidgetCancel;
        self.handleGraphPreview(clonemodel.segmentModel);
    };
    self.widgetCancel = function() {
        self.onWidgetUpdate = undefined;
        self.onWidgetCancel = undefined;
        self.addUpdateBtnText('Add Widget');
        self.previewGraph(false);
        self.selectedDataKey(undefined);
        $('#graphBuilder').removeClass('showme');
        self.newWidget(true);
    };
    self.handleGraphPreview = function(segmentModel){
        // self.chart && self.chart.removeChart();
        // self.chart = undefined;
        //self.previewGraph(true);
        //var inputData = DataRetriever.getData(self.selectedDataKey());
        //var graphData = Conditioner.getGraphData(segmentModel, inputData);

        d3.select('#previewgraph').selectAll('svg').remove();
        d3.select('#previewgraph').append('svg');
        var chart;
        var _t;
        // switch(segmentModel.chartType){
        //     case 'line':
        //         self.chart = new drata.charts.LineChart( 'previewgraph', undefined, graphData);
        //         chart = drata.charts.lineChart();
        //         d3.select('#previewgraph svg')
        //             .datum(graphData)
        //             .call(chart);
        //         break;
        //     case 'area':
        //         self.chart = new drata.charts.LineChart( 'previewgraph', undefined, graphData);
        //         chart = drata.charts.areaChart();
        //         d3.select('#previewgraph svg')
        //             .datum(graphData)
        //             .call(chart);
        //         break;
        //     case 'pie':
        //         chart = new drata.charts.PreviewPieChart( 'previewgraph', graphData);
        //         break;
        //     case 'bar':
        //         chart = drata.charts.barChart();
        //         d3.select('#previewgraph svg')
        //             .datum(graphData)
        //             .call(chart);
        //         break;
        // }
        // drata.utils.windowResize(function() {
        //     _t && clearTimeout(_t);
        //     _t = setTimeout(chart.resize, 2000);
        // });
        
        // console.log(JSON.stringify(graphData, null, '\t'));
        // console.log(JSON.stringify(inputData, null, '\t'));
    };
    self.preview = function(){
        self.handleGraphPreview(self.segment.getModel());
    };
    self.previewGraph.subscribe(function(newValue){
        if(!newValue){
            d3.select('#previewgraph').selectAll('svg').remove();
            d3.select('#previewgraph').append('svg');
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