 var defaultWidgetModel = {
        name: 'widget 1',
        selectedDataKey: 'key1',
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
    };
    var dashboardModel = {
        name: 'maneesh',
        widgets: [defaultWidgetModel]
    };
var Dashboard = function(){
	var self = this;
	self.name = dashboardModel.name;
	self.index= 1;
    self.inputData = ko.observable();
    self.filteredData = ko.observable();
    self.outputData = ko.observable();
    self.groupData = ko.observable();
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
        var widget = new Widget(widgetModel, self.index++);
        self.widgets.push(widget);
    };
};
var Widget = function(widgetModel, index){
    var self = this;
    self.name = widgetModel.name || widgetModel.selectedDataKey;
	self.index = index;
    self.bb = 0;
    self.widgetModel = widgetModel;

    self.loadWidgetInit = function(){ //runs after render
        var inputData = DataRetriever.getData(self.widgetModel.selectedDataKey);
        var graphData = Conditioner.getGraphData(self.widgetModel.segmentModel, inputData);
        dashboard.outputData(JSON.stringify(graphData, null, '\t'));
        dashboard.inputData(JSON.stringify(inputData, null, '\t'));
        self.graph = new atombomb.d3.LineGraph( 'widget'+ self.index, undefined, graphData);
    };

    self.updateWidget = function (widgetModel) {
        self.widgetModel = widgetModel;
        var inputData = DataRetriever.getData(self.widgetModel.selectedDataKey); //get input data
        var graphData = Conditioner.getGraphData(self.widgetModel.segmentModel, inputData); //process data for graph
        dashboard.outputData(JSON.stringify(graphData, null, '\t'));
        dashboard.inputData(JSON.stringify(inputData, null, '\t'));
	    self.graph = new atombomb.d3.LineGraph( 'widget'+ self.index, undefined, graphData);
	};

    self.editWidget = function () {
        widgetProcessor.attach(self.widgetModel, self.updateWidget.bind(self));
        //$('#myModal').foundation('reveal', 'open');
    };
};

var WidgetProcessor = function(){
    var self = this;
    self.widgetName = ko.observable();
    self.addUpdateBtnText = ko.observable('Add Widget');
    self.processSegment = true;
    self.dataKeys = ko.observableArray(DataRetriever.getDataKeys());
    self.selectedDataKey = ko.observable();

    self.selectedDataKey.subscribe(function(newValue){
        if(self.processSegment){
            var data = DataRetriever.getData(newValue);
            var properties = DataRetriever.getUniqueProperties(data);
            self.segment.prefill({properties:properties});    
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
    };
    self.attach = function (model,onWidgetUpdate, onWidgetCancel) {
        var clonemodel = atombomb.utils.clone(model);
        self.processSegment = false;
        self.selectedDataKey(clonemodel.selectedDataKey);
        self.processSegment = true;
        self.segment.prefill(clonemodel.segmentModel);
        self.addUpdateBtnText('Update Widget');
        self.onWidgetUpdate = onWidgetUpdate;
        self.onWidgetCancel = onWidgetCancel;
    };
    self.widgetCancel = function() {
        self.onWidgetUpdate = undefined;
        self.onWidgetCancel = undefined;
        self.addUpdateBtnText('Add Widget');
        //$('#myModal').foundation('reveal', 'close');
    };
};