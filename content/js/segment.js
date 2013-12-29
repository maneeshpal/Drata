
var defaultSegmentModel = {
    selection: {},
    dataGroup : {},
    group:{}
};

var Segmentor = function(model){
    model = model || defaultSegmentModel;
    var self = this;
    self.group = new Group('conditions', model.group);
    self.selection = new Selection(model.selection);
    self.dataGroup = new DataGroup(model.dataGroup);
    self.properties = ['a', 'b', 'c', 'timestamp'];
    self.conditionalOperations = ['>', '<', '=', 'exists','like'];
    self.arithmeticOperations = ['+', '-', '*','/'];
    self.groupingOptions = ['countBy', 'sumBy'];
    self.logics = ['and', 'or'];
    self.filteredData = ko.observable();
    self.outputData = ko.observable();
    self.rawData = ko.observable();
    self.groupData = ko.observable();
    self.data = ko.computed(function(){
        var d = [];
        try{
            d = ko.utils.parseJson(self.rawData());
        }
        catch(e) {}
        return d;
    });
    self.rawData(JSON.stringify(
        [{
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
        }]
        , null, '\t'));
    
    self.processConditionsSection = function(){
        var jsGroup = ko.toJS(self.group);
        var filteredData = Conditioner.filterData(self.data(), jsGroup);

        self.filteredData(JSON.stringify(filteredData, null, '\t'));
    };
    self.processSelectionsSection = function(){
        var result = [];
        var jsComplexGroup = ko.toJS(self.selection.complexGroups);
        var jsSimpleGroup = ko.toJS(self.selection.props);
        
        jsSimpleGroup.length > 0 && _.each(self.data(), function(obj){
            _.each(jsSimpleGroup, function(prop){
                var returnValue = Conditioner.processSimpleSelection(obj, prop.prop);
                result.push({
                    value: returnValue,
                    name: prop.prop
                });
            });
        });  

        jsComplexGroup.length > 0 && _.each(self.data(), function(obj){
            _.each(jsComplexGroup, function(group){
                var returnValue = Conditioner.processGroup(obj, group);
                result.push({
                    value: returnValue.value,
                    name: group.selectionName
                });
            });
        });

        self.outputData(JSON.stringify(result, null, '\t'));
    };
    self.processDataGroups = function(){
        var jsSelection = ko.toJS(self.selection);
        var jsGroup = ko.toJS(self.group);
        var dataGroup = ko.toJS(self.dataGroup);
        
        var model = {
            selection: jsSelection,
            dataGroup: dataGroup,
            group: jsGroup
        };
        var filteredData = Conditioner.filterData(self.data(), jsGroup);
        self.filteredData(JSON.stringify(filteredData, null, '\t'));
        self.groupData(JSON.stringify(model, null, '\t'));
        var result = [];

        _.each(jsSelection.complexGroups, function(selectionGroup){
            if(dataGroup.hasGrouping){
                result.push(Conditioner.processDataGroups(filteredData,dataGroup , selectionGroup));
            }
            else{
                result.push({
                    name : selectionGroup.selectionName,
                    values : Conditioner.divideByInterval(filteredData,dataGroup , selectionGroup)
                });
            }
        });
        
        _.each(jsSelection.props, function(prop){
            if(dataGroup.hasGrouping){
                result.push(Conditioner.processDataGroups(filteredData,dataGroup , prop.prop));
            }
            else{
                result.push({
                    name : prop.prop,
                    values : Conditioner.divideByInterval(filteredData,dataGroup , prop.prop)
                });
            }
        });
        
        self.outputData(JSON.stringify(result, null, '\t'));
    };
};

var SelectOperation = function(conditionType, model){
    var self = this;
    self.prop = ko.observable(model.prop);
    self.logic = ko.observable(model.logic || '+');
    self.conditionType = conditionType;
};

var Condition = function(conditionType, model){
    var self = this;
    _.extend(self, new SelectOperation(conditionType, model));
    self.logic(model.logic || 'and');
    self.operation = ko.observable(model.operation || '=');
    self.selectionGroup = new Group('selections', model.selectionGroup);
    self.isComplex = ko.observable(model.isComplex || false);
    self.value = ko.observable(model.value);
};

var Group = function(groupType, model){
    var self = this;
    self.groupType = groupType;
    self.conditions = ko.observableArray();
    
    self.logic = ko.observable((self.groupType === 'conditions')?'and':'+');
    self.groups = ko.observableArray();
    self.conditionTemplate = (self.groupType === 'conditions')?'condition-template': 'operation-template';
    self.selectionName = ko.observable();
    
    self.addGroup = function(){
        self.groups.push(new Group(self.groupType));
    };
    
    self.removeGroup = function(group){
       self.groups.remove(group);
    };

    self.addCondition = function(){
        if(self.groupType === 'conditions'){
            self.conditions.push(new Condition(self.groupType, {
                logic : 'and'
            }));    
        }
        else{
            self.conditions.push(new SelectOperation(self.groupType, {
                logic : '+'
            }));
        }
    };
    
    self.removeCondition = function(condition){
        self.conditions.remove(condition);
    };
    self.groupTypeName = (self.groupType === 'conditions')? 'Condition Group' : 'Select';
    self.conditionTypeName = (self.groupType === 'conditions')? 'Condition' : 'selection';

    if(model){
        self.selectionName(model.selectionName);
        self.logic(model.logic);
        self.conditions(ko.utils.arrayMap(
        model.conditions,
            function(conditionModel) {
                if(self.groupType === 'conditions'){
                    return new Condition(self.groupType, conditionModel);    
                }
                else{
                    return new SelectOperation(self.groupType, conditionModel);
                }
            }
        ));
        self.groups(ko.utils.arrayMap(
            model.groups,
            function(groupModel) {
                return new Group(self.groupType, groupModel);
            }
        ));    
    }
    
};
var SimpleSelectionGroup = function(){
    var self = this;
    self.prop = ko.observable();
};
var Selection = function(model){
    var self = this;
    self.complexGroups = ko.observableArray();

    self.complexGroups(ko.utils.arrayMap(
        model.complexGroups,
        function(complexGroupModel) {
          return new Group('selections', complexGroupModel);
        }
    ));

    self.props = ko.observableArray(model.props || []);
    
    self.addComplexSelection = function(){
        self.complexGroups.push(new Group('selections'));
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
};

var DataGroup = function(model){
    var self = this;
    self.xAxisProp = ko.observable(model.xAxisProp);
    self.groupByProp = ko.observable(model.groupByProp);
    self.groupBy = ko.observable(model.groupBy);
    self.timeseries = ko.observable(model.timeseries);
    self.hasGrouping = ko.observable(model.hasGrouping);
    self.interval = ko.observable(model.interval);
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
        var returnValue = {
            value : result,
            logic : boolValues[0].logic
        };
        return returnValue;
    },
    processConditions : function(obj, conditions){
        var boolValues = [];
        _.each(conditions, function(condition){
            var complexValue = {}, complexType;
            if(condition.conditionType === 'selections'){
                complexValue = obj[condition.prop];
            }
            else if(condition.isComplex){
                complexType = this.processGroup(obj, condition.selectionGroup);
                complexValue = this.calc(complexType.value, condition.operation, condition.value);
            }
            else{
                complexValue = this.calc(obj[condition.prop], condition.operation, condition.value);
            }
            boolValues.push({
                value : complexValue,
                logic : condition.logic
            });
        }.bind(this));

        var returnValue = this.applyOperations(boolValues);
        
        console.log('conditions:');
        console.log(returnValue);
        return returnValue;
    },
    processSelections : function(){

    },
    processGroups : function(obj, groups){
        var boolValues = [];
        _.each(groups, function(group){
            boolValues.push(this.processGroup(obj,group));
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
        group.conditions.length > 0 && boolValues.push(this.processConditions(obj, group.conditions));
        group.groups.length > 0 && boolValues.push(this.processGroups(obj, group.groups));
        
        var returnValue = this.applyOperations(boolValues);
        console.log('group:');
        console.log(returnValue);
        return returnValue;
    },
    processSimpleSelection : function(obj, prop){
        return obj[prop];
    },
    processDataGroups : function(data, dataGroup, selectionGroup){
        var returnGroups = [];
        var groupedData = _.groupBy(data, function(item){return item[dataGroup.groupByProp]});
        
        _.each(groupedData, function(dataItem, groupName){
            var ret = this.divideByInterval(dataItem, dataGroup, selectionGroup);
            returnGroups.push({
                name : groupName,
                values : ret
            });
        }.bind(this));
        return returnGroups;
    },
    divideByInterval : function(data, dataGroup, selectionGroup){
        var ret = [];
        var isComplex = typeof selectionGroup === 'object';
        if(isComplex && dataGroup.groupBy === 'countBy')
            throw "countBy not allowed for complex selections.";
        if(dataGroup.timeseries){
            var intervalGroup = _.groupBy(data, function(item){
                return Math.floor(+item[dataGroup.xAxisProp]/ +dataGroup.interval) * (+dataGroup.interval);
            });
            _.each(intervalGroup, function(gi, time){
                ret.push({
                    x: +time, 
                    y: _.reduce(gi, function(memo, num){ 
                            var numval;
                            if(isComplex){ //complex selection. so we need to process it.
                                var temp = Conditioner.processGroup(num,selectionGroup);
                                numval = temp.value;
                            }
                            else if(dataGroup.groupBy === 'countBy'){
                                numval = num[selectionGroup]? 1 : 0;
                            }
                            else{ // sumby
                                numval = +num[selectionGroup] || 0;
                            }
                            return memo + numval; 
                        }, 0)
                });
            });
        }
        else{
            _.each(data, function(item){
                ret.push({
                    x: item[dataGroup.xAxisProp],
                    y: (isComplex)? Conditioner.processGroup(item,selectionGroup).value : item[selectionGroup]
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
    }
}