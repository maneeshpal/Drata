
var defaultSegmentModel = {
    properties: ['a', 'b', 'c', 'timestamp'],
    selection: {},
    dataGroup : {},
    group:{}
};

var Segmentor = function(model){
    var self = this;
    //self.rawData = ko.observable();
    self.properties = ko.observable();
    self.level = 0;
    // self.data = ko.computed(function(){
    //     var d = [];
    //     try{
    //         d = ko.utils.parseJson(self.rawData());
    //     }
    //     catch(e) {}
    //     return d;
    // });

    self.conditionalOperations = ['>', '<', '>=','<=', '=', 'exists','like'];
    self.arithmeticOperations = ['+', '-', '*','/'];
    self.groupingOptions = ['countBy', 'sumBy'];
    self.logics = ['and', 'or'];
    self.filteredData = ko.observable();
    self.outputData = ko.observable();
    self.group = new Group(self.level,'conditions',undefined);
    self.selection = new Selection(self.level);
    self.dataGroup = new DataGroup();
    self.groupData = ko.observable();
    
    // self.processConditionsSection = function(){
    //     var jsGroup = ko.toJS(self.group);
    //     var filteredData = Conditioner.filterData(self.data(), jsGroup);
    //     self.filteredData(JSON.stringify(filteredData, null, '\t'));
    // };

    // self.processSelectionsSection = function(){
    //     var result = [];
    //     var jsComplexGroup = ko.toJS(self.selection.complexGroups);
    //     var jsSimpleGroup = ko.toJS(self.selection.props);
        
    //     jsSimpleGroup.length > 0 && _.each(self.data(), function(obj){
    //         _.each(jsSimpleGroup, function(prop){
    //             var returnValue = Conditioner.processSimpleSelection(obj, prop.prop);
    //             result.push({
    //                 value: returnValue,
    //                 name: prop.prop
    //             });
    //         });
    //     });

    //     jsComplexGroup.length > 0 && _.each(self.data(), function(obj){
    //         _.each(jsComplexGroup, function(group){
    //             var returnValue = Conditioner.processGroup(obj, group);
    //             result.push({
    //                 value: returnValue.value,
    //                 name: group.selectionName
    //             });
    //         });
    //     });

    //     self.outputData(JSON.stringify(result, null, '\t'));
    // };
    // self.processDataGroups = function(){
    //     var model = self.getModel();
    //     //temp
    //     var filteredData = Conditioner.filterData(self.data(), model.group);
    //     self.filteredData(JSON.stringify(filteredData, null, '\t'));
    //     self.groupData(JSON.stringify(model, null, '\t'));
    //     //end temp
    //     var result = Conditioner.getGraphData(model, self.data());
        
    //     self.outputData(JSON.stringify(result, null, '\t'));
    // };
    self.prefill = function(model){
        model && self.properties(model.properties);

        //This will reset all the properties down the line.
        model = model || {};
        self.group.prefill(model.group || {});
        self.selection.prefill(model.selection || {});
        self.dataGroup.prefill(model.dataGroup || {});
    };
    self.getModel = function(){
        var jsSelection = ko.toJS(self.selection);
        var jsGroup = ko.toJS(self.group);
        var dataGroup = ko.toJS(self.dataGroup);
        
        var model = {
            selection: jsSelection,
            dataGroup: dataGroup,
            group: jsGroup,
            properties: self.properties()
        };
        return model;
    }
    model && self.prefill(model);
};

var SelectOperation = function(level, conditionType, model){
    var self = this;
    self.level = level;
    self.prop = ko.observable(model.prop);
    self.logic = ko.observable(model.logic || '+');
    self.conditionType = conditionType;
};

var Condition = function(level, conditionType, model){
    var self = this;
    _.extend(self, new SelectOperation(level, conditionType, model));
    self.logic(model.logic || 'and');
    self.operation = ko.observable(model.operation || '=');
    self.selectionGroup = new Group(self.level+1,'selections', model.selectionGroup);
    self.isComplex = ko.observable(model.isComplex || false);
    self.value = ko.observable(model.value);
};

var Group = function(level, groupType, model){
    var self = this;
    self.level = level;
    self.groupType = groupType;
    self.conditions = ko.observableArray();
    
    self.logic = ko.observable((self.groupType === 'conditions')?'and':'+');
    self.groups = ko.observableArray();
    self.conditionTemplate = (self.groupType === 'conditions')?'condition-template': 'operation-template';
    self.selectionName = ko.observable();
    
    self.addGroup = function(){
        self.groups.push(new Group(self.level+1,self.groupType));
    };
    
    self.removeGroup = function(group){
       self.groups.remove(group);
    };

    self.addCondition = function(){
        if(self.groupType === 'conditions'){
            self.conditions.push(new Condition(self.level+1, self.groupType, {
                logic : 'and'
            }));
        }
        else{
            self.conditions.push(new SelectOperation(self.level+1, self.groupType, {
                logic : '+'
            }));
        }
    };
    
    self.removeCondition = function(condition){
        self.conditions.remove(condition);
    };
    self.groupTypeName = (self.groupType === 'conditions')? 'Condition Group' : 'Select';
    self.conditionTypeName = (self.groupType === 'conditions')? 'Condition' : 'selection';

    
    self.prefill = function(model){
        self.selectionName(model.selectionName);
        self.logic(model.logic);
        self.conditions(ko.utils.arrayMap(
        model.conditions,
            function(conditionModel) {
                if(self.groupType === 'conditions'){
                    return new Condition(self.level+1, self.groupType, conditionModel);    
                }
                else{
                    return new SelectOperation(self.level+1, self.groupType, conditionModel);
                }
            }
        ));
        self.groups(ko.utils.arrayMap(
            model.groups,
            function(groupModel) {
                return new Group(self.level+1, self.groupType, groupModel);
            }
        )); 
    };
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
        self.complexGroups.push(new Group(self.level+1,'selections'));
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
              return new Group(self.level+1,'selections', complexGroupModel);
            }
        ));
        self.props(model.props || []);
    };
    model && self.prefill(model);
};

var DataGroup = function(model){
    var self = this;
    self.xAxisProp = ko.observable();
    self.groupByProp = ko.observable();
    self.groupBy = ko.observable();
    self.timeseries = ko.observable();
    self.hasGrouping = ko.observable();
    self.interval = ko.observable();

    self.prefill = function(model){
        self.xAxisProp(model.xAxisProp);
        self.groupByProp(model.groupByProp);
        self.groupBy(model.groupBy);
        self.timeseries(model.timeseries);
        self.hasGrouping(model.hasGrouping);
        self.interval(model.interval);
    };
    model && self.prefill(model);
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
            }];
        }
        else{
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
    },
    getGraphData: function(segmentModel, inputData){
        var result = [];
        var filteredData = Conditioner.filterData(inputData, segmentModel.group);
        _.each(segmentModel.selection.complexGroups, function(selectionGroup){
            if(segmentModel.dataGroup.hasGrouping){
                result.push(Conditioner.processDataGroups(filteredData, segmentModel.dataGroup, selectionGroup));
            }
            else{
                result.push({
                    name : selectionGroup.selectionName,
                    values : Conditioner.divideByInterval(filteredData, segmentModel.dataGroup, selectionGroup)
                });
            }
        });
        
        _.each(segmentModel.selection.props, function(prop){
            if(segmentModel.dataGroup.hasGrouping){
                result.push(Conditioner.processDataGroups(filteredData, segmentModel.dataGroup, prop.prop));
            }
            else{
                result.push({
                    name : prop.prop,
                    values : Conditioner.divideByInterval(filteredData, segmentModel.dataGroup , prop.prop)
                });
            }
        });
        return result;
    }
}