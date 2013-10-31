;(function(root, $) {

    var defaultgraphOptions = {
        margin: { top: 40, right: 10, bottom: 25, left: 30 },
        resize: true,
        dateFormat: 'timestamp',
        xAxis: {
            orient: 'bottom',
            type: 'linear',
            ticks: 5,
            class: 'axis x'
        },
        yAxis: {
                orient: 'left',
                type: 'linear',
                ticks: 5,
                class: 'axis y',
                transform: 'rotate(-90)',
                label: 'this is my y'
        },
        interpolate: 'linear', /*monotone*/
        preserveAspectRatio: 'xMidYMid',
        linearGradient: {
            id: 'my-gradient',
            offsetColors: [
                { offset: "0%", color: "steelblue" },
                { offset: "50%", color: "green" },
                { offset: "100%", color: "red" }
            ],
            clippings: {
                y1: 2,
                y2: 8
            }
        }
    };
    var defaultWidgetModel = {
        name: 'widget 1',
        graphOptions: defaultgraphOptions
    };
    var widgetsModel = {
        name: 'maneesh',
        widgets: [defaultWidgetModel]
    };
var Dashboard = function(){
	var self = this;
	self.name = widgetsModel.name;
	self.index= 1;
	self.widgets = ko.observableArray();

	self.widgets(ko.utils.arrayMap(
        widgetsModel.widgets,
        function(widget) {
          return new atombomb.web.Widget(widget, self.index++);
        }
	));
	self.loadWidget = function(elem,widget){
        widget && widget.loadWidget();
    };
    self.addWidget = function(model){
        var widget = new atombomb.web.Widget(model, self.index++);
        self.widgets.push(widget);
    };
};
var Widget = function(model, index){
    var self = this;
    self.model = model;
    self.name = model.widgetName || 'New Widget';
	self.index = index;
    self.data= [];
    self.getRandomData = function(){
        var data = [];
        for(var i =0;i<3;i++){
            var plotvalues = [];
            var today = new Date();
            var y = 0;
            for(var j = 0; j < 100; j++){
                y += (Math.random() * 10 - 5);
                plotvalues.push({
                  x: j,
                  y: y
                });
                // plotvalues.push({
                //     x: today.setHours(today.getHours()+1),
                //     y: Math.random()  * 10        
                // });
            }
            data.push({
                values:plotvalues,
                name:'line'+i
            });
        };
        return data;
    };
    self.bb = 0;
    self.updateGraph = function(){
        for(var i =0;i<self.data.length;i++){
            self.data[i].values.shift();
            var today = self.data[i].values[self.data[i].values.length-1].x;
            //for(var j=0;j<2;j++){
                self.data[i].values.push({
                    x:today.setHours(today.getHours()+1),
                    y: Math.random() * 10
                });
            //}
        }
        //console.log(self.data);
        //self.bb++;
        //if(self.bb==3){
           // clearTimeout(self._t);
        //}
        self.graph.data = self.data;
        self.graph.drawStream();
    };
    self.loadWidget = function (model) {
        if (model)
            self.model = model;
	    self.data = self.getRandomData();
	    if (self.graph) {
	        self.graph.removeGraph();
	    }
        self.graph = new atombomb.d3.LineGraph( 'widget'+ self.index, self.model.graphOptions, self.data);
        //self._t = setInterval(self.updateGraph.bind(self), 2000);
	};
    self.editWidget = function () {
        atombomb.web.graphBuilder.attach(self.model, self.loadWidget.bind(self));
        $('#myModal').foundation('reveal', 'open');
    };
};
var GraphBuilder = function(){
    var self = this;
    self.widgetName = ko.observable();
    self.addUpdateBtnText = ko.observable('Add Widget');
    

    self.buildWidget = function () {
        var widgetModel = ko.toJS(self);
        widgetModel.graphOptions.top = +widgetModel.graphOptions.margin.top;
        widgetModel.graphOptions.right = +widgetModel.graphOptions.margin.right;
        widgetModel.graphOptions.bottom = +widgetModel.graphOptions.margin.bottom;
        widgetModel.graphOptions.left = +widgetModel.graphOptions.margin.left;
        widgetModel.graphOptions.xAxis.ticks = +widgetModel.graphOptions.xAxis.ticks;
        widgetModel.graphOptions.yAxis.ticks = +widgetModel.graphOptions.yAxis.ticks;
        $('#myModal').foundation('reveal', 'close');
        self.onWidgetUpdate && self.onWidgetUpdate(widgetModel);
        !self.onWidgetUpdate && atombomb.web.dashboard.addWidget(widgetModel);
        self.onWidgetUpdate = undefined;
        self.onWidgetCancel = undefined;
    };
    self.attach = function (model, onWidgetUpdate, onWidgetCancel) {
        self.setModel(model);
        self.addUpdateBtnText('Update');
        self.onWidgetUpdate = onWidgetUpdate;
        self.onWidgetCancel = onWidgetCancel;
    };
    self.setModel = function (model) {
        self.graphOptions = {
            margin: {
                top: ko.observable(model.graphOptions.margin.top),
                right: ko.observable(model.graphOptions.margin.right),
                bottom: ko.observable(model.graphOptions.margin.bottom),
                left: ko.observable(model.graphOptions.margin.left)
            },
            resize: ko.observable(model.graphOptions.resize),
            dateFormat: ko.observable(model.graphOptions.dateFormat),
            xAxis: {
                orient: ko.observable(model.graphOptions.xAxis.orient),
                type: ko.observable(model.graphOptions.xAxis.type),
                ticks: ko.observable(model.graphOptions.xAxis.ticks),
                class: ko.observable(model.graphOptions.xAxis.class)
            },
            yAxis: {
                orient: ko.observable(model.graphOptions.xAxis.orient),
                type: ko.observable(model.graphOptions.yAxis.type),
                ticks: ko.observable(model.graphOptions.yAxis.ticks),
                class: ko.observable(model.graphOptions.yAxis.class),
                transform: ko.observable(model.graphOptions.yAxis.transform),
                label: ko.observable(model.graphOptions.yAxis.label)
            },
            interpolate: ko.observable(model.graphOptions.interpolate), /*monotone*/
            preserveAspectRatio: ko.observable(model.graphOptions.preserveAspectRatio)
        };
    };
    self.widgetCancel = function() {
        $('#myModal').foundation('reveal', 'close');
    };
    self.setModel(defaultWidgetModel);
};
root.atombomb.namespace('web').extend({
    Widget: Widget,
    Dashboard: Dashboard,
    GraphBuilder: GraphBuilder
});
})(this, jQuery);