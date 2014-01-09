 var defaultWidgetModel = [{
        name: 'widget 1',
        selectedDataKey: 'key1',
        widgetType: 'line',
        segmentModel: {
            selection: {
                complexGroups: [],
                props: [
                    {
                        prop: "a"
                    }
                ]
            },
            dataGroup: {
                xAxisProp: "timestamp",
                groupByProp: "a"
            },
            group: {
                groupType: "conditions",
                groups: [
                    {
                        prop: "a",
                        logic: "and",
                        conditionType: "conditions",
                        renderType: "condition",
                        operation: ">",
                        selectionGroup: {
                            groupType: "selections",
                            renderType: "group",
                            logic: "+",
                            groups: []
                        },
                        isComplex: false,
                        value: "4"
                    }
                ],
                logic: "and"
            },
            properties: [
                "a",
                "b",
                "c",
                "timestamp"
            ]
        }
    },
    {
        name: 'widget 2',
        selectedDataKey: "key1",
        widgetType: 'line',
        segmentModel: {
            selection: {
                complexGroups: [
                    {
                        groupType: "selections",
                        groups: [
                            {
                                prop: "b",
                                logic: "+",
                                conditionType: "selections",
                                renderType: "condition"
                            },
                            {
                                prop: "a",
                                logic: "-",
                                conditionType: "selections",
                                renderType: "condition"
                            }
                        ],
                        logic: "+",
                        renderType: "group",
                        selectionName: "b-a"
                    }
                ],
                props: [
                    {
                        prop: "a"
                    }
                ]
            },
            dataGroup: {
                xAxisProp: "timestamp",
                groupByProp: "a"
            },
            group: {
                groupType: "conditions",
                groups: [
                    {
                        prop: "b",
                        logic: "and",
                        conditionType: "conditions",
                        renderType: "condition",
                        operation: ">",
                        selectionGroup: {
                            groupType: "selections",
                            groups: [],
                            logic: "+",
                            renderType: "group"
                        },
                        isComplex: false,
                        value: "12"
                    }
                ],
                renderType: "group"
            },
            properties: [
                "a",
                "b",
                "c",
                "timestamp"
            ]
        }
    },{
        name: 'widget pie',
        selectedDataKey: "key1",
        widgetType: 'pie',
        segmentModel: {
            selection: {
                complexGroups: [],
                props: [
                    {
                        prop: "a"
                    }
                ]
            },
            dataGroup: {
                xAxisProp: "timestamp",
                groupByProp: "c",
                groupBy: "sumby",
                hasGrouping: true
            },
            group: {
                groupType: "conditions",
                groups: [
                    {
                        prop: "b",
                        logic: "and",
                        conditionType: "conditions",
                        renderType: "condition",
                        operation: ">",
                        selectionGroup: {
                            groupType: "selections",
                            groups: [],
                            logic: "+",
                            renderType: "group"
                        },
                        isComplex: false,
                        value: "12"
                    }
                ],
                renderType: "group"
            },
            properties: [
                "a",
                "b",
                "c",
                "timestamp"
            ]
        }
    },{
        name: "widget-3",
        selectedDataKey: "key2",
        widgetType: 'line',
        segmentModel: {
            selection: {
                complexGroups: [],
                props: [
                    {
                        prop: "d"
                    },
                    {
                        prop: "e"
                    }
                ]
            },
            dataGroup: {
                xAxisProp: "timestamp",
                groupByProp: "d"
            },
            group: {
                groupType: "conditions",
                groups: [],
                renderType: "group"
            },
            properties: [
                "d",
                "e",
                "f",
                "timestamp"
            ]
        }
    }];
    var dashboardModel = {
        name: 'maneesh',
        widgets: defaultWidgetModel
    };
var Dashboard = function(){
	var self = this;
	self.name = dashboardModel.name;
	self.index= 1;
	self.widgets = ko.observableArray();

	self.widgets(ko.utils.arrayMap(
        dashboardModel.widgets,
        function(model) {
            if(model.widgetType === 'line'){
                return new LineWidget(model, self.index++);    
            } 
            else if(model.widgetType === 'pie'){
                return new PieWidget(model, self.index++);    
            }
        }
	));

	self.loadWidget = function(elem,widget){
        widget && widget.loadWidgetInit();
    };

    self.addWidget = function(widgetModel){
        var widget;
        if(widgetModel.widgetType === 'line'){
            widget = new LineWidget(widgetModel, self.index++);    
        }else if(widgetModel.widgetType === 'pie'){
            widget = new PieWidget(widgetModel, self.index++);    
        }
        self.widgets.push(widget);
    };
    self.deleteWidget = function(widget){
        self.widgets.remove(widget);
    };
};

var Widget = function(widgetModel, index){
    var self = this;
    self.name = widgetModel.name || widgetModel.selectedDataKey;
    self.widgetModel = widgetModel;
    self.widgetContentId = 'widgetContent'+index;

    // self.editWidget = function () {
    //     $('#graphBuilder').addClass('showme');
    //     widgetProcessor.attach(self.widgetModel, self.updateWidget.bind(self));
    // };
    // self.getChartData = function(inputData){
    //     throw 'You have to override this method';
    // };
    // self.drawChart = function(graphData){
    //    throw 'You have to override this method';  
    // }
};

var LineWidget = function(widgetModel, index){
    var self = this;
    _.extend(self, new Widget(widgetModel, index));

    self.getChartData = function(inputData){
        var graphData = Conditioner.getGraphData(self.widgetModel.segmentModel, inputData);
        return graphData;
    };

    self.editWidget = function () {
        $('#graphBuilder').addClass('showme');
        widgetProcessor.attach(self.widgetModel, self.updateWidget.bind(self));
    };

    self.drawChart = function(graphData){
        var chart;
        nv.addGraph(function() {
            chart = nv.models.lineChart().useInteractiveGuideline(true);
            chart.x(function(d,i) { 
                  return d.x;
            });
            var formatter = d3.format(",.1f");
            chart.margin({right: 40});
            chart.xAxis // chart sub-models (ie. xAxis, yAxis, etc) when accessed directly, return themselves, not the parent chart, so need to chain separately
                .tickFormat(
                    formatter
                  );
            chart.transitionDuration(1000);
            chart.yAxis
                .axisLabel('maneesh')
                .tickFormat(d3.format(',.2f'));
            d3.select('#'+ self.widgetContentId +' svg')
                .datum(graphData)
              //.transition().duration(1000)
                .call(chart);

            nv.utils.windowResize(chart.update);

            return chart;
        });
        return chart;
    };
    self.loadWidgetInit = function(){ //runs after render
        var inputData = DataRetriever.getData(self.widgetModel.selectedDataKey);
        var chartData = self.getChartData(inputData);
        self.graph = self.drawChart(chartData);
    };

    self.updateWidget = function (widgetModel) {
        self.widgetModel = widgetModel;
        var inputData = DataRetriever.getData(self.widgetModel.selectedDataKey);
        var chartData = self.getChartData(inputData);
        self.graph = self.drawChart(chartData);
    };
};

var PieWidget = function(widgetModel, index){
    var self = this;
    _.extend(self, new Widget(widgetModel, index));

    self.editWidget = function () {
        $('#graphBuilder').addClass('showme');
        widgetProcessor.attach(self.widgetModel, self.updateWidget.bind(self));
    };

    self.getChartData = function(inputData){
        var graphData = Conditioner.getPieData(self.widgetModel.segmentModel, inputData);
        return graphData;
    };

    self.drawChart = function(chartData){
        var wrapperHeight = $('#'+ self.widgetContentId).height();
        var wrapperWidth = $('#'+ self.widgetContentId).width();
        var numPies = chartData.length;
        var r = (wrapperWidth/numPies)/2 - 10;
        if(r > (wrapperHeight/2)-20)
            r = (wrapperHeight/2)-20;
        var m = 10,
        z = d3.scale.category20();
        d3.select('#'+ self.widgetContentId)
            .selectAll("svg").remove();
        var svg = d3.select('#'+ self.widgetContentId)
            .selectAll("svg")
            .data(chartData)
            .enter().append("svg:svg").attr('class', 'pie')
            .attr("width", (r + m) * 2)
            .attr("height", (r + m) * 2)
            .append("svg:g")
            .attr("class", "arc")
            .attr("transform", "translate(" + (r + m) + "," + (r + m) + ")");
        var arc = d3.svg.arc()
            .outerRadius(r)
            .innerRadius(r / 2);

        var pie = d3.layout.pie()
            .sort(null)
            .value(function(d) { 
                return d.value; 
            });
        
        var g = svg.selectAll(".arc")
            .data(pie)
            .enter().append("g")
            .attr("class", "arc");

        g.append("path")
            .attr("d", arc)
            .style("fill", function(d, i) { return z(i); });

        g.append("text")
            .attr("class", "donuttext")
            .attr("transform", function(d) {
                return "translate(" + arc.centroid(d) + ")";
            })
            .attr("dy", ".35em")
            .style("text-anchor", "middle")
            .text(function(d) { 
                return d.data.key;
        });
    };
    self.loadWidgetInit = function(){ //runs after render
        var inputData = DataRetriever.getData(self.widgetModel.selectedDataKey);
        var chartData = self.getChartData(inputData);
        self.graph = self.drawChart(chartData);
    };

    self.updateWidget = function (widgetModel) {
        self.widgetModel = widgetModel;
        var inputData = DataRetriever.getData(self.widgetModel.selectedDataKey);
        var chartData = self.getChartData(inputData);
        self.graph = self.drawChart(chartData);
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
    self.inputData = ko.observable();
    self.outputData = ko.observable();

    self.selectedDataKey.subscribe(function(newValue){
        self.outputData(undefined);
        self.inputData(undefined);
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
        //var widgetModel = ko.toJS(self);
        //$('#myModal').foundation('reveal', 'close');
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
        $('#graphBuilder').removeClass('showme');
    };
    self.attach = function (model,onWidgetUpdate, onWidgetCancel) {
        var clonemodel = atombomb.utils.clone(model);
        self.processSegment = false;
        self.selectedDataKey(clonemodel.selectedDataKey);
        self.processSegment = true;
        self.segment.initialize(clonemodel.segmentModel);
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
        //$('#myModal').foundation('reveal', 'close');
    };
    self.handleGraphPreview = function(segmentModel){
        self.previewGraph(true);
        var inputData = DataRetriever.getData(self.selectedDataKey());
        var graphData = Conditioner.getGraphData(segmentModel, inputData);
        self.graph = new atombomb.d3.LineGraph( 'previewgraph', undefined, graphData);
        self.outputData(JSON.stringify(graphData, null, '\t'));
        self.inputData(JSON.stringify(inputData, null, '\t'));
    };
    self.preview = function(){
        self.handleGraphPreview(self.segment.getModel());
    };
    self.previewGraph.subscribe(function(newValue){
        if(!newValue){
            self.graph.removeGraph();
        }
    });
};

var TopBar = function(){
    var self = this;
    self.addWidget = function(){
        $('#graphBuilder').toggleClass('showme');
    }
}