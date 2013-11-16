;(function(root, $) {
    var defaultWidgetModel = {
        name: 'widget 1',
        selectedActions : [{
            type : 'selection',
            val : 'nypAmount',
            identifier : 'value'
        },{
            type : 'action',
            val : 'add'
        },{
            type : 'selection',
            val : 'pubAmount',
            identifier : 'value'
        },{
            type : 'action',
            val : 'over' 
        },{
            type : 'selection',
            val : 'timestamp',
            identifier : 'value'
        }],
        selectedDataKey: 'step2'
        //graphOptions: defaultgraphOptions
    };
    var dashboardModel = {
        name: 'maneesh',
        widgets: [defaultWidgetModel]
    };
var Dashboard = function(){
	var self = this;
	self.name = dashboardModel.name;
	self.index= 1;
	self.widgets = ko.observableArray();

	self.widgets(ko.utils.arrayMap(
        dashboardModel.widgets,
        function(model) {
          return new atombomb.web.Widget(model, self.index++);
        }
	));
	self.loadWidget = function(elem,widget){
        widget && widget.loadWidgetInit();
    };
    self.addWidget = function(widgetModel){
        var widget = new atombomb.web.Widget(widgetModel, self.index++);
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
        if(!self.widgetModel.data) self.widgetModel.data = atombomb.web.dataProcessor.getFormattedData(self.widgetModel.selectedDataKey, self.widgetModel.selectedActions);
        self.graph = new atombomb.d3.LineGraph( 'widget'+ self.index, undefined, self.widgetModel.data);
    };
    self.updateWidget = function (model) {
        self.widgetModel = model;
	    self.graph = new atombomb.d3.LineGraph( 'widget'+ self.index, undefined, self.widgetModel.data);
	};
    self.editWidget = function () {
        atombomb.web.sAGenerator.attach(self.widgetModel, self.updateWidget.bind(self));
        //$('#myModal').foundation('reveal', 'open');
    };
};
var SAGenerator = function(){
    var self = this;
    self.widgetName = ko.observable();
    self.addUpdateBtnText = ko.observable('Add Widget');
    self.selections = ko.observableArray([]);
    self.actions = ko.observableArray(['add','subtract', 'and', 'groupby', 'over']);
    self.dataKeys = ko.observableArray();
    self.selectedDataKey =ko.observable(undefined);
    self.selectedActions = ko.observableArray();
    self.jsonFormattedData = ko.observable();
    self.jsonData = ko.observable();
   
    self.notifyWidget = function () {
        //var widgetModel = ko.toJS(self);
        //$('#myModal').foundation('reveal', 'close');
        var formattedData = atombomb.web.dataProcessor.formatGroups(self.selectedDataKey(), self.selectedActions(), self.data);
        self.jsonFormattedData(JSON.stringify(formattedData, null, '\t'));
        self.jsonData(JSON.stringify(self.data, null, '\t'));
        //self.notifyWidget(formattedData);
        var widgetModel = {
            selectedActions : self.selectedActions(),
            selectedDataKey : self.selectedDataKey(),
            data : formattedData
        };
        self.onWidgetUpdate && self.onWidgetUpdate(widgetModel);
        !self.onWidgetUpdate && atombomb.web.dashboard.addWidget(widgetModel);
        self.onWidgetUpdate = undefined;
        self.onWidgetCancel = undefined;
        self.addUpdateBtnText('Add');
    };
    self.attach = function (model, onWidgetUpdate, onWidgetCancel) {
        self.selectedDataKey(model.selectedDataKey);
        
        self.selectedActions(ko.utils.arrayMap(
            model.selectedActions,
            function(selectedAction) {
              return new SelectedAction(selectedAction);
            }
        ));
        //self.selectedActions(model.selectedActions);
        self.jsonData(JSON.stringify(ko.toJS(self.selectedActions()), null, '\t'));
        self.addUpdateBtnText('Update');
        self.onWidgetUpdate = onWidgetUpdate;
        self.onWidgetCancel = onWidgetCancel;
    };
    self.bindProperties = function (data) {
        //model.selectedActions && self.selectedActions(model.selectedActions);
        
        var selectionsArr = [];
        for (var i = data.length - 1; i >= 0; i--) {
            var dataValue = data[i].val;
            for (var property in dataValue) {
                (dataValue.hasOwnProperty(property) && selectionsArr.indexOf(property) === -1) && selectionsArr.push(property);
            }
        };
        self.selections(selectionsArr);
    };
    
    self.widgetCancel = function() {
        self.onWidgetUpdate = undefined;
        self.onWidgetCancel = undefined;
        self.addUpdateBtnText('Add');
        //$('#myModal').foundation('reveal', 'close');
    };
    self.selectedDataKey.subscribe(function(selectedKey){
        self.selectedActions([]);
        var data = atombomb.web.dataProcessor.getData(selectedKey);
        self.bindProperties(data);
        self.data = data;
        self.addNextSelectedAction();
    });
    self.addNextSelectedAction = function(){
        var lastClause = ko.toJS(self.selectedActions()[self.selectedActions().length - 1]);
        
        var nextSelAction = {
            type : lastClause && lastClause.type === 'selection'? 'action' : 'selection',
            val : undefined,
            identifier : 'value'
        };

        self.selectedActions.push(new SelectedAction(nextSelAction));
    };
    self.removePreviousClause = function(){
        if(self.selectedActions().length > 0)
            self.selectedActions.pop();
    };

    self.dataKeys(atombomb.web.dataProcessor.getDataKeys());
};

var SelectedAction = function(selectedAction){
    var self = this;
    self.type = ko.observable(selectedAction.type);
    self.val = ko.observable(selectedAction.val);
    self.identifier = ko.observable(selectedAction.identifier);
    self.extentValue = ko.observable(selectedAction.extentValue);

    self.identifierVisible = ko.computed(function(){
        return self.type() === 'selection';
    });
    
    self.extentValueVisible = ko.computed(function(){
        return self.type() === 'selection' && self.val() === 'timestamp'
            && self.identifier() === 'extent';
    });
    
};

var dataProcessor = {
    getDataKeys : function(){
        return ['step2', 'homepage'];
    },
    getData : function(dataKey){
        var data = [];
        if(dataKey === 'step2'){
            for(var i= 1; i<= 5; i++){
                data.push({
                    key : 'step2',
                    val : {
                        userSelection : (Math.random() > .5)? 'pub': 'nyp',
                        nypAmount : Math.random() * 100,
                        pubAmount : Math.random() * 100,
                        timestamp : new Date().setHours(i)
                    }
                })
            };
        }
        else if(dataKey === 'homepage'){
            // for(var i= 0; i<= 50; i++){
            //     var n = Math.random() * 10;
            //     var sc = 'clt';
            //     if(n < 4) sc = 'ltl';
            //     if(n >= 8) sc = 'hhg';
            //     data.push({
            //         key : 'homepage',
            //         val : {
            //             selectedCategory : sc,
            //             usersite : (Math.random() > .7)? 'canada': 'usa',
            //             loadtime: Math.random() * 100,
            //             errorCount : Math.random() * 10,
            //             submitTime : Math.random() * 100,
            //             timestamp : Math.random() * 1000
            //         }
            //     })
            // };
            data.push({
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 30,
                    errorCount : 2
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 40,
                    errorCount : 4
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 70,
                    errorCount : 3
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 80,
                    errorCount : 2
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 20,
                    errorCount : 6
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 25,
                    errorCount : 4
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 27,
                    errorCount : 3
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 60,
                    errorCount : 5
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 65,
                    errorCount : 2
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 90,
                    errorCount : 0
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 97
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 91,
                    errorCount : 7
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 41,
                    errorCount : 2
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 45,
                    errorCount : 1
                }
            });
        };
        return data;
    },
    calc : function(action, previousValue, currentValue){
        if(!action){
            return currentValue;
        }
        var result;
        switch (action){
            case 'add':
                result = previousValue + currentValue;
                break;
            case 'subtract':
                result = previousValue - currentValue;
                break;
            default :
                result = previousValue;
        }
        return result;
    },
    getFormattedData: function(selectedDataKey, selectedActions, data){
        var dataStore = [];
        data = data || this.getData(selectedDataKey);
        atombomb.utils.forEach(data, function(item){
            var xvalue = undefined;
            var yvalue = undefined;
            for(var j = 0; j < selectedActions.length; j+=2 ){
                var selectedProp = selectedActions[j];
                var over = false;

                if(j > 0 && selectedActions[j-1].type === 'action' && selectedActions[j-1].val ==='over'){
                    over = true;
                }

                var action = (j === 0 || over)? undefined:selectedActions[j-1];
                if(selectedProp.type=== 'selection'){
                    if(item.val.hasOwnProperty(selectedProp.val)){
                        if(over){
                            xvalue = this.calc((action && action.val || undefined),xvalue, item.val[selectedProp.val]);    
                        }
                        else{
                            yvalue = this.calc((action && action.val || undefined),yvalue, item.val[selectedProp.val]);    
                        }
                    }
                }
            }
            dataStore.push({x:xvalue, y:yvalue});
        }.bind(this));
        return [{name: selectedDataKey, values : dataStore}];
    },
    formatGroups : function(selectedDataKey, selectedActions, data){
        var returnData = [];
        var returnDatum = [];
        var interval = 10;
        var proptoGroup = selectedActions[2].val();
        var intervalProp = selectedActions[4].val();
        var propToSelect = selectedActions[0].val();
        var groupeddata = _.groupBy(data, function(item){
            return item.val[proptoGroup];
        });

        _.each(groupeddata, function(groupedItem, groupKey){
            returnDatum = [];
            if(proptoGroup!== propToSelect){
                var intervalGroup = _.groupBy(groupedItem, function(item){
                    return Math.floor(+item.val.timestamp/interval) * interval;
                });
                _.each(intervalGroup,function(item, key){
                    val = _.reduce(item, function(memo, num){ 
                        numval =(num.val[propToSelect])? num.val[propToSelect] : 0;
                        return memo + numval; 
                    }, 0);
                    returnDatum.push({x: key, y: val});
                });
            }
            else{
                var intervalCounts = _.countBy(groupedItem,function(item){
                    return Math.floor(+item.val.timestamp/interval) * interval;
                });

                _.each(intervalCounts, function(count, key){
                    returnDatum.push({x : key, y: count});
                });
            }
            

            returnData.push({name: groupKey, values : returnDatum});
        });
        return returnData;
    }
};
root.atombomb.namespace('web').extend({
    Widget: Widget,
    Dashboard: Dashboard,
    SAGenerator: SAGenerator,
    dataProcessor : dataProcessor
});
})(this, jQuery);