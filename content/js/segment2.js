
var Segmentor = function(model){
    //model = model || defaultSegmentModel;
    var self = this;
    self.properties = ko.observable();
    self.level = 0;
    self.conditionalOperations = ['>', '<', '>=','<=', '=', 'exists','like'];
    self.arithmeticOperations = ['+', '-', '*','/'];
    self.groupingOptions = ['countBy', 'sumBy'];
    self.logics = ['and', 'or'];
    self.filteredData = ko.observable();
    self.outputData = ko.observable();
    self.group = new Group(self.level,'conditions',undefined, self);
    self.selection = new Selection(self.level);
    self.dataGroup = new DataGroup();
    self.groupData = ko.observable();
    self.chartType = ko.observable();

    self.chartType.subscribe(function(){
        self.dataGroup.setProps({});
    });

    self.initialize = function(model){
        model = model || {};
        self.properties(model.properties);
        self.chartType(model.chartType);
        self.group.prefill(model.group || {});
        self.selection.prefill(model.selection || {});
        self.dataGroup.setProps(model.dataGroup || {});
    };
    self.getModel = function(){
        return {
            chartType: self.chartType(),
            selection: self.selection.getModel(),
            dataGroup: self.dataGroup.getModel(),
            group: self.group.getModel(),
            properties: self.properties()
        };
    };

    self.setChartType = function(type){
        self.chartType(type);
    };
    //model && self.initialize(model);
};

var SelectOperation = function(level, conditionType, model, parent){
    var self = this;
    self.parent = parent;
    self.level = level;
    self.prop = ko.observable(model.prop);
    self.logic = ko.observable(model.logic || '+');
    self.conditionType = conditionType;
    self.renderType = 'condition';
    self.template = 'operation-template';
    self.editMode = ko.observable(true);
    self.expression = ko.computed(function(){
        var expression = '';
        if(self.prop() && self.logic() !== undefined){
           expression = ((self.parent.groups.indexOf(self) > 0)? ' ' + self.logic() + ' ': '') + self.prop();
        }
        return expression;
    });
    self.expand = function(){
        self.editMode(true);
    };
    self.collapse = function(){
        self.editMode(false);
    };
    self.getModel = function(){
        //var selectionGroupModel = self.selectionGroup.getModel();
        var returnModel = ko.toJS(self);
        delete returnModel.parent;
        delete returnModel.template;
        delete returnModel.expression;
        delete returnModel.amIFirst;
        delete returnModel.level;
        delete returnModel.expand;
        delete returnModel.collapse;
        delete returnModel.getModel;
        delete returnModel.editMode;
        //returnModel.selectionGroup = selectionGroupModel;
        return returnModel;
    };
};

var Condition = function(level, conditionType, model, parent){
    var self = this;
    _.extend(self, new SelectOperation(level, conditionType, model,parent));
    self.logic(model.logic || 'and');
    self.operation = ko.observable(model.operation || '=');
    self.selectionGroup = new Group(self.level+1,'selections', model.selectionGroup, self);
    self.isComplex = ko.observable(model.isComplex || false);
    self.value = ko.observable(model.value);
    self.template = 'condition-template';
    self.expression = ko.computed(function(){
        var expression = '';
        
        if(((self.value() !== '' && self.value() !== undefined) || self.logic() === 'exists') && self.operation() !== undefined){
            if(self.isComplex()){
               expression = self.selectionGroup.expression();
            }
            else if(self.prop()){
               expression = self.prop();
            }
        }

        if(expression !== '') {
            expression = ((self.parent.groups.indexOf(self) > 0)? ' ' + self.logic() + ' ' : '') + expression + ' ' + self.operation() + ' ' + self.value();
            //self.collapse();
        }
        else{
            //self.expand();
        }

        return expression;
    });
    self.amIFirst = ko.computed(function(){
        return self.parent && self.parent.groups && self.parent.groups.indexOf(self) === 0;
    });
    self.getModel = function(){
        var selectionGroupModel = self.selectionGroup.getModel();
        var returnModel = ko.toJS(self);
        delete returnModel.parent;
        delete returnModel.template;
        delete returnModel.expression;
        delete returnModel.amIFirst;
        delete returnModel.level;
        delete returnModel.expand;
        delete returnModel.collapse;
        delete returnModel.getModel;
        delete returnModel.editMode;
        returnModel.selectionGroup = selectionGroupModel;
        return returnModel;
    };
};

var Group = function(level, groupType, model, parent){
    var self = this;
    self.parent = parent;
    self.level = level;
    self.groupType = groupType;
    self.renderType = 'group';
    self.editMode = ko.observable(true);
    self.logic = ko.observable((self.groupType === 'conditions')?'and':'+');
    self.groups = ko.observableArray();
    self.template = 'group-template';
    self.selectionName = ko.observable();
    
    self.addGroup = function(){
        self.groups.push(new Group(self.level+1,self.groupType, undefined, self));
    };
    
    self.removeGroup = function(group){
       self.groups.remove(group);
    };

    self.addCondition = function(){
        if(self.groupType === 'conditions'){
            self.groups.push(new Condition(self.level+1, self.groupType, {
                logic : 'and'
            }, self));
        }
        else{
            self.groups.push(new SelectOperation(self.level+1, self.groupType, {
                logic : '+'
            }, self));
        }
    };
    
    self.removeCondition = function(condition){
        self.groups.remove(condition);
    };
    self.groupTypeName = (self.groupType === 'conditions')? 'Condition Group' : 'Select';
    self.conditionTypeName = (self.groupType === 'conditions')? 'Condition' : 'selection';

    self.getTemplate = function(item){
        return item.template;
    };
    self.prefill = function(m){
        self.selectionName(m.selectionName);
        self.logic(m.logic);
        self.groups(ko.utils.arrayMap(
            m.groups,
            function(groupModel) {
                if(groupModel.renderType === 'condition'){
                    if(self.groupType === 'conditions'){
                        return new Condition(self.level+1, self.groupType, groupModel, self);    
                    }
                    else{
                        return new SelectOperation(self.level+1, self.groupType, groupModel, self);
                    }
                }
                else{
                    return new Group(self.level+1, self.groupType, groupModel, self);    
                }
            }
        )); 
    };
    self.getModel = function(){
        var returnGroups = [];
        _.each(self.groups(), function(group){
            returnGroups.push(group.getModel());
        });
        return {
            groupType: self.groupType,
            groups: returnGroups,
            logic: self.logic(),
            renderType: self.renderType,
            selectionName: self.selectionName()
        }
    };
    self.expression = ko.computed(function(){
        if(self.groups().length === 0) return '';
        var expression = '';
        var notComplete = false;
        _.each(self.groups(), function(gr){
            var temp = gr.expression();
            if(temp === '' || temp === undefined){
               notComplete = true;
            }
            expression = expression + gr.expression();
        });
        if(expression !== ''){
           expression = (self.parent.groups && self.parent.groups.indexOf(self) > 0 ? self.logic() : '') + '(' + expression + ')';
        }
        return notComplete? '' : expression;
    });
    self.expand = function(){
        self.editMode(true);
    };
    self.collapse = function(){
       self.editMode(false);
    };
    self.amIFirst = ko.computed(function(){
        return self.parent && self.parent.groups && self.parent.groups.indexOf(self) === 0;
    });
    if(model){
        self.prefill(model);
    }
};

var Selection = function(level, model){
    var self = this;
    self.level =level;
    self.complexGroups = ko.observableArray();
    self.props = ko.observableArray();
    
    self.addComplexSelection = function(){
        self.complexGroups.push(new Group(self.level+1,'selections', undefined, self));
    };
    self.addSimpleSelection = function(){
        self.props.push({prop: ''});
    };
    self.removeGroup = function(group){
       self.complexGroups.remove(group);
    };
    self.removeSimpleSelection = function(prop){
       self.props.remove(prop);
    };
    self.prefill = function(model){
        self.complexGroups(ko.utils.arrayMap(
            model.complexGroups,
            function(complexGroupModel) {
              return new Group(self.level+1,'selections', complexGroupModel, self);
            }
        ));
        self.props(model.props || []);
    };

    model && self.prefill(model);

    self.getModel = function(){
        var returnGroups = [];
        _.each(self.complexGroups(), function(group){
            returnGroups.push(group.getModel());
        });
        return {
            complexGroups: returnGroups,
            props: self.props()
        }
    };
};

var BasicDataGroup = function(model){
    var self = this;
    self.template = 'basic-datagroup-template';
    self.groupBy = ko.observable();
    self.groupByProp = ko.observable();

    self.prefill = function(model){
        self.groupByProp(model.groupByProp);
        self.groupBy(model.groupBy);
    };
    model && self.prefill(model);
};

var DataGroup = function(model){
    var self = this;
    self.template = 'datagroup-template';
    self.xAxisProp = ko.observable();
    self.groupByProp = ko.observable();
    self.groupBy = ko.observable();
    self.timeseries = ko.observable();
    self.hasGrouping = ko.observable();
    self.interval = ko.observable();
    
    self.groupBy.subscribe(function(newValue){
        self.hasGrouping((newValue === 'sumBy' || newValue === 'countBy'));
    });

    self.setProps = function(model){
        self.xAxisProp(model.xAxisProp);
        self.groupByProp(model.groupByProp);
        self.groupBy(model.groupBy);
        self.timeseries(model.timeseries);
        self.hasGrouping(model.hasGrouping);
        self.interval(model.interval);
    };
    self.getModel = function(){
        var dataGroupModel = ko.toJS(self);
        delete dataGroupModel.setProps;
        return dataGroupModel;
    }
    model && self.setProps(model);
};

var DataRetriever = {
    getUniqueProperties : function(data){
        var returnArr = [];
        for (var i = data.length - 1; i >= 0; i--) {
            var dataValue = data[i];
            for (var property in dataValue) {
                (dataValue.hasOwnProperty(property) && returnArr.indexOf(property) === -1) && returnArr.push(property);
            }
        };
        return returnArr;
    },
    getDataKeys : function(){
        return ['key1', 'key2'];
    },
    getData : function(dataKey){ //data for key 1
        if(dataKey === 'key1'){
            return [{
                a : 10,
                b : 20,
                c : 'aaa',
                timestamp : 10
            },{
                a : 12,
                b : 24,
                c : 'aaa',
                timestamp : 20
            },{
                a : 18,
                b : 29,
                c : 'bbb',
                timestamp : 25
            },{
                a : 32,
                b : 4,
                c : 'bbb',
                timestamp : 45
            },{
                a : 2,
                b : 44,
                c : 'ccc',
                timestamp : 50
            },{
                a : 34,
                b : 92,
                c : 'ccc',
                timestamp : 52
            },{
                a : 55,
                b : 3,
                c : 'ccc',
                timestamp : 54
            },{
                b : 32,
                c : 'ddd',
                timestamp : 67
            },
            {
                b : 39,
                c : 'ddd',
                timestamp : 77
            }];
        }
        else if(dataKey === 'key2'){
            return [{
                d : 10,
                e : 20,
                f : 'aaa',
                timestamp : 10
            },{
                d : 12,
                e : 24,
                f : 'aaa',
                timestamp : 20
            },{
                d : 18,
                e : 29,
                f : 'bbb',
                timestamp : 25
            },{
                d : 32,
                e : 4,
                f : 'bbb',
                timestamp : 45
            },{
                d : 2,
                e : 44,
                f : 'ccc',
                timestamp : 50
            }];
        }
        else{
            var data= [];
            for(var i =1;i<=1;i++){
                var plotvalues = [];
                var y = 0;
                for(var j = 0; j < 1000; j++){
                    y += (Math.random() * 10 - 5);
                    plotvalues.push({
                      x: j,
                      y: y
                    });
                }
                data.push({
                    values:plotvalues,
                    key:'aaa'+i});
            };
        }
    }
};

var Conditioner = {
    calc : function(left, operation, right){
        var result = false;
        switch (operation){
            case '>':
                result = +left > +right;
            break;
            case '<':
                result = +left < +right;
            break;
            case '<=':
                result = +left <= +right;
            break;
            case '=':
                result = (left === right) || (+left === +right);
            break;
            case '>=':
                result = +left >= +right;
            break;
            case 'exists':
                result = left !== undefined;
            break;
            case 'and':
                result = left && right;
            break;
            case 'or':
                result = left || right;
            break;
            case '+':
                result = (+left) + (+right);
            break;
            case '-':
                result = (+left) - (+right);
            break;
            case '*':
                result = (+left) * (+right);
            break;
            case 'like':
            result = left.indexOf(right) > -1;
            break;
            case '/':
                result = (+left) / (+right);
        }

        return result;
    },
    applyOperations : function(boolValues){
        var result = boolValues[0].value;
        for (var i = 0; i <= boolValues.length-2; i++) {
            var boolValue = boolValues[i];
            var nextValue = boolValues[i+1];
            result = this.calc(result, nextValue.logic, nextValue.value);
        };
        return {
            value : result,
            logic : boolValues[0].logic
        };
    },
    processCondition : function(obj, condition){
        var complexValue, complexType;
        if(condition.conditionType === 'selections'){
            //perform arithmetic operation on selections
            if(this.properties.indexOf(condition.prop) === -1 && _.isNumber(+condition.prop)){
                complexValue = +condition.prop;
            }else{
                complexValue = obj[condition.prop];    
            }
            
        }
        else if(condition.isComplex){
            complexType = this.processGroup(obj, condition.selectionGroup);
            complexValue = this.calc(complexType.value, condition.operation, condition.value);
        }
        else{
            complexValue = this.calc(obj[condition.prop], condition.operation, condition.value);
        }
        return {
            value : complexValue,
            logic : condition.logic
        };
    },
    processGroups : function(obj, groups){
        var boolValues = [];
        _.each(groups, function(group){
            if(group.renderType === 'condition'){
                boolValues.push(this.processCondition(obj, group));
            }
            else{
                boolValues.push(this.processGroup(obj,group));
            }
            
        }.bind(this));

        var returnValue = this.applyOperations(boolValues);
        
        console.log('groups:');
        console.log(returnValue);
        return returnValue;
    },
    processGroup : function(obj, group){
        var boolValues = [{
            value : (group.groupType === 'conditions') ? true : 0,
            logic : group.logic
        }];
        //group.conditions.length > 0 && boolValues.push(this.processConditions(obj, group.conditions));
        group.groups.length > 0 && boolValues.push(this.processGroups(obj, group.groups));
        
        var returnValue = this.applyOperations(boolValues);
        console.log('group:');
        console.log(returnValue);
        return returnValue;
    },
    processDataGroups : function(groupedData, dataGroup, selectionGroup, groupCounter){
        var returnGroups = [];
        _.each(groupedData, function(dataItem, groupName){
            var ret = this.divideByInterval(dataItem, dataGroup, selectionGroup);
            returnGroups.push({
                key : groupCounter ? groupName + '-' + groupCounter : groupName,
                values : ret
            });
        }.bind(this));
        return returnGroups;
    },
    divideByInterval : function(data, dataGroup, selection){
        var ret = [];
        var isComplex = typeof selection === 'object';
        if(isComplex && dataGroup.groupBy === 'countBy')
            throw "countBy not allowed for complex selections.";
        if(dataGroup.timeseries){
            var intervalGroup = _.groupBy(data, function(item){
                return Math.floor(+item[dataGroup.xAxisProp]/ +dataGroup.interval) * (+dataGroup.interval);
            });
            _.each(intervalGroup, function(gi, time){
                ret.push({
                    x: +time, 
                    y:  Conditioner.reduceData(gi,dataGroup.groupBy, selection)
                });
            });
        }
        else{
            _.each(data, function(item){
                (item.hasOwnProperty(selection) || isComplex) && ret.push({
                    x: item[dataGroup.xAxisProp],
                    y: (isComplex)? Conditioner.processGroup(item,selection).value : item[selection]
                });
            });
        }
        return ret;
    },
    filterData : function(data, conditionGroup){
        var filteredData = data.filter(function(obj, index){
            var result = this.processGroup(obj, conditionGroup);
            return result.value;
        }.bind(this));
        return filteredData;
    },
    getGraphData: function(segmentModel, inputData){
        this.properties = segmentModel.properties;
        var returnData;
        switch (segmentModel.chartType){
            case 'line':
                returnData = this.getLineCharData(segmentModel, inputData);
                break;
            case 'pie':
                returnData = this.getPieData(segmentModel, inputData);
                break;
        }
        return returnData;
    },
    getLineCharData: function(segmentModel, inputData){
        var result = [];
        var groupCounter = 0;
        var filteredData = Conditioner.filterData(inputData, segmentModel.group);
        var multipleGroups = segmentModel.dataGroup.hasGrouping && (segmentModel.selection.complexGroups.length + segmentModel.selection.props.length) > 1;
        var groupedData;
        
        if(segmentModel.dataGroup.hasGrouping){
            groupedData = _.groupBy(filteredData, function(item){return item[segmentModel.dataGroup.groupByProp]});
        }
        _.each(segmentModel.selection.complexGroups, function(selectionGroup){
            if(segmentModel.dataGroup.hasGrouping){
                multipleGroups && groupCounter ++;
                var groupValues = Conditioner.processDataGroups(groupedData, segmentModel.dataGroup, selectionGroup, groupCounter);
                _.each(groupValues, function(val){result.push(val);});
            }
            else{
                result.push({
                    key : selectionGroup.selectionName,
                    values : Conditioner.divideByInterval(filteredData, segmentModel.dataGroup, selectionGroup)
                });
            }
        });
        
        _.each(segmentModel.selection.props, function(prop){
            if(segmentModel.dataGroup.hasGrouping){
                multipleGroups && groupCounter ++;
                var groupValues = Conditioner.processDataGroups(groupedData, segmentModel.dataGroup, prop.prop, groupCounter);
                _.each(groupValues, function(val){result.push(val);});
            }
            else{
                result.push({
                    key : prop.prop,
                    values : Conditioner.divideByInterval(filteredData, segmentModel.dataGroup , prop.prop)
                });
            }
        });
        return result;
    },
    reduceData : function(objArray, groupingType, selection){
        var isComplex = typeof selection === 'object';

        if(isComplex && groupingType === 'countBy')
            throw "countBy not allowed for complex selections.";

        return _.reduce(objArray, function(memo, num){ 
                    var numval;
                    if(isComplex){ //complex selection. so we need to process it.
                        var temp = Conditioner.processGroup(num,selection);
                        numval = temp.value;
                    }
                    else if(groupingType === 'countBy'){
                        numval = num[selection]? 1 : 0;
                    }
                    else if(groupingType === 'sumBy'){ // sumby
                        numval = +num[selection] || 0;
                    }
                    else{
                        throw 'you should select groupby property for simple selections';
                    }
                    return memo + numval; 
        }, 0);
    },
    getPieData: function(segmentModel, inputData){
        var response = [];
        var groupCounter = 0;
        var filteredData = Conditioner.filterData(inputData, segmentModel.group);
        var result = [];

        if(segmentModel.dataGroup.hasGrouping){
            var groupedData = _.groupBy(filteredData, function(item){return item[segmentModel.dataGroup.groupByProp]});
            _.each(segmentModel.selection.props, function(prop){
                result = [];
                _.each(groupedData, function(groupedDataItem, groupName){
                    var val = Conditioner.reduceData(groupedDataItem,segmentModel.dataGroup.groupBy, prop.prop);
                    val > 0 && result.push({
                        key: groupName,
                        value: val
                    });
                });
                
                response.push({
                    key : prop.prop,
                    values: result
                });
            });
        }
        else{
            var toplevelkey = 'xxxx';
            result = [];
            _.each(segmentModel.selection.props, function(prop){
                var val = Conditioner.reduceData(filteredData, segmentModel.dataGroup.groupBy + 'By', prop.prop);
                val > 0 && result.push({
                    key: prop.prop,
                    value: val
                });
            });
            response.push({
                key : toplevelkey,
                values: result
            });
        }
        
        
        _.each(segmentModel.selection.complexGroups, function(selectionGroup){
            if(!segmentModel.dataGroup.hasGrouping)
                throw 'you cant have complex selections without grouping';

            result = [];
            _.each(groupedData, function(groupedDataItem, groupName){
                var val = Conditioner.reduceData(groupedDataItem,segmentModel.dataGroup.groupBy, selectionGroup);
                val > 0 && result.push({
                    key: groupName,
                    value: val
                });
            });

            response.push({
                key : selectionGroup.selectionName,
                values: result
            });
        });
        return response;
    }
}