
var Segmentor = function(model){
    //model = model || defaultSegmentModel;
    var self = this;
    self.properties = ko.observable();
    self.level = 0;
    self.conditionalOperations = ['>', '<', '>=','<=', '=', '!=','exists','like'];
    self.arithmeticOperations = ['+', '-', '*','/'];
    self.groupingOptions = ko.observableArray(['value','count', 'sum', 'avg']);
    self.xAxisTypes = ko.observableArray(['time','linear','currency']);
    self.chartTypes = ['line', 'area', 'scatter', 'pie','bar'];
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
    self.groupBy = ko.observable();
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
        self.groupBy(m.groupBy);
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
            selectionName: self.selectionName(),
            groupBy: self.groupBy()
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
        self.props.push({prop: ko.observable(), groupBy : ko.observable('value')});
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
        if(model.props){
            for(var i = 0; i < model.props.length; i ++){
                self.props.push({
                    prop: ko.observable(model.props[i].prop),
                    groupBy : ko.observable(model.props[i].groupBy)
                });
            }    
        }else{
            self.props([]);
        }
        
    };

    model && self.prefill(model);

    self.getModel = function(){
        var returnGroups = [];
        _.each(self.complexGroups(), function(group){
            returnGroups.push(group.getModel());
        });
        return {
            complexGroups: returnGroups,
            props: ko.toJS(self.props)
        }
    };
};

var DataGroup = function(model){
    var self = this;
    self.template = 'datagroup-template';
    self.xAxisProp = ko.observable();
    self.groupByProp = ko.observable();
    self.timeseries = ko.observable();
    self.interval = ko.observable();
    self.divideByProp = ko.observable();
    self.hasGrouping = ko.observable(false);
    self.hasDivideBy = ko.observable();
    self.xAxisType = ko.observable();
    self.hasGrouping.subscribe(function(newValue){
        if(!newValue){
            self.groupByProp(undefined);
            self.divideByProp(undefined);
            self.hasDivideBy(undefined);
        }
    });
    self.timeseries.subscribe(function(newValue) {
        if(!newValue) self.interval(undefined);
    });

    self.setProps = function(model){
        self.xAxisProp(model.xAxisProp);
        self.groupByProp(model.groupByProp);
        self.timeseries(model.timeseries);
        self.hasGrouping(model.groupByProp !== undefined);
        self.interval(model.interval);
        self.divideByProp(model.divideByProp);
        self.hasDivideBy(model.divideByProp !== undefined);
    };
    self.getModel = function(){
        var dataGroupModel = ko.toJS(self);
        delete dataGroupModel.setProps;
        delete dataGroupModel.getModel;
        delete dataGroupModel.template;
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
        return ['key1', 'key2', 'Shopper Stop'];
    },
    getData : function(dataKey){
        return tempData.randomProps(50);
    }
};

var Conditioner = {
    calc : function(left, operation, right){
        if(left === undefined) return right;
        if(right === undefined) return left;
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
                result = (left === right);
            break;
            case '!=':
                result = (left !== right);
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
        //if(boolValues.length > 1){
            for (var i = 0; i <= boolValues.length-2; i++) {
                var boolValue = boolValues[i];
                var nextValue = boolValues[i+1];
                result = this.calc(result, nextValue.logic, nextValue.value);
            };
        //}
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
        
        if(drata.js.logmsg) console.log('groups:');
        if(drata.js.logmsg) console.log(returnValue);
        return returnValue;
    },
    processGroup : function(obj, group){
        //var boolValues = [];
        //for selection groups, defaulting value to undefined is pretty fucking important. 
        var boolValues = [{
            value : (group.groupType === 'conditions') ? true : undefined,
            logic : group.logic
        }];

        group.groups.length > 0 && boolValues.push(this.processGroups(obj, group.groups));
        
        var returnValue = this.applyOperations(boolValues);
        //returnValue.logic = group.logic;
        if(drata.js.logmsg) console.log('group:');
        if(drata.js.logmsg) console.log(returnValue);
        return returnValue;
    },
    processDataGroups : function(groupedData, dataGroup, selection, groupCounter){
        var returnGroups = [];
        _.each(groupedData, function(dataItem, groupName){
            var ret = this.divideByInterval(dataItem, dataGroup, selection);
            returnGroups.push({
                //key : groupCounter ? groupName + '-' + groupCounter : groupName,
                key: groupName,
                values : ret
            });
        }.bind(this));
        return returnGroups;
    },
    divideByInterval : function(data, dataGroup, selection){
        var ret = [];
        var isComplex = selection.groupType !== undefined;

        if(isComplex && selection.groupBy === 'count')
            throw "count not allowed for complex selections.";
        if(dataGroup.timeseries){
            var intervalGroup = _.groupBy(data, function(item){
                var val = item[dataGroup.xAxisProp];
                //TODO: Clean this 
                if(dataGroup.xAxisType === 'time') val = new Date(val).getTime();
                return Math.floor(+val/ +dataGroup.interval) * (+dataGroup.interval);
            });
            _.each(intervalGroup, function(gi, time){
                ret.push({
                    x: +time, 
                    y:  Conditioner.reduceData(gi,selection)
                });
            });
        }
        else{
            _.each(data, function(item){
                (item.hasOwnProperty(selection.prop) || isComplex) && ret.push({
                    x: item[dataGroup.xAxisProp],
                    y: (isComplex)? Conditioner.processGroup(item,selection).value : item[selection.prop]
                });
            });
        }
        return ret;
    },
    filterData : function(data, conditionGroup){
        if (!conditionGroup || conditionGroup.groups.length === 0) return data;
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
            case 'area':
            case 'scatter':
                returnData = this.getLineCharData(segmentModel, inputData);
                break;
            case 'pie':
            case 'bar':
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
                result.push({
                    key:selectionGroup.selectionName,
                    values:Conditioner.processDataGroups(groupedData, segmentModel.dataGroup, selectionGroup, groupCounter)
                });
               // _.each(groupValues, function(val){result.push(val);});
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
                result.push({
                    key: prop.prop,
                    values: Conditioner.processDataGroups(groupedData, segmentModel.dataGroup, prop, groupCounter)
                });
            }
            else{
                result.push({
                    key : prop.prop,
                    values : Conditioner.divideByInterval(filteredData, segmentModel.dataGroup , prop)
                });
            }
        });
        if(!segmentModel.dataGroup.hasGrouping){
            return [{
                key : 'xxx',
                values : result
            }]
        }
        else{
            return result;    
        }
        
    },
    reduceData : function(objArray, selection){
        var isComplex = selection.groupType !== undefined;

        if(isComplex && (selection.groupBy === 'count'))
            throw "Not allowed for complex selections.";

        var ret = _.reduce(objArray, function(memo, num){ 
                    var numval;
                    if(isComplex){ //complex selection. so we need to process it.
                        var temp = Conditioner.processGroup(num,selection);
                        numval = temp.value;
                    }
                    else if(selection.groupBy === 'count'){
                        numval = num[selection.prop]? 1 : 0;
                    }
                    else if(selection.groupBy === 'sum' || selection.groupBy === 'avg'){ // sumby
                        numval = +num[selection.prop] || 0;
                    }
                    else{
                        throw 'you should select groupby property for simple selections';
                    }
                    return memo + numval; 
        }, 0);

        return selection.groupBy === 'avg' ? ret/objArray.length : ret;
    },
    getPieData: function(segmentModel, inputData){
        var response = [];
        var groupCounter = 0;
        var filteredData = Conditioner.filterData(inputData, segmentModel.group);
        var result = [];
        var topLevelResponse = [];

        if(segmentModel.dataGroup.hasGrouping){
            var groupedData = _.groupBy(filteredData, function(item){return item[segmentModel.dataGroup.groupByProp]});
            
            if(!segmentModel.dataGroup.hasDivideBy){
                response = [];
                _.each(segmentModel.selection.props, function(prop){
                    result = [];
                    _.each(groupedData, function(groupedDataItem, groupName){
                        var val = Conditioner.reduceData(groupedDataItem,prop);

                        val >= 0 && result.push({
                            key: groupName,
                            value: val
                        });
                    });
                    
                    response.push({
                        key : prop.prop,
                        groupLevel: 'B',
                        values: result
                    });
                });

                _.each(segmentModel.selection.complexGroups, function(selectionGroup){
                    result = [];
                    _.each(groupedData, function(groupedDataItem, groupName){
                        var val = Conditioner.reduceData(groupedDataItem,selectionGroup);
                        val > 0 && result.push({
                            key: groupName,
                            value: val
                        });
                    });

                    response.push({
                        key : selectionGroup.selectionName,
                        groupLevel : 'B',
                        values: result
                    });
                });

                topLevelResponse.push({
                    key : 'xxx',
                    groupLevel: 'A',
                    values: response
                });
            }
            else{

                topLevelResponse = [];
                _.each(segmentModel.selection.props, function(prop){
                    response = [];
                    _.each(groupedData, function(groupedDataItem, groupName){
                        var propCounts;
                        result = [];
                        
                        if(prop.groupBy === 'count'){
                            propCounts = _.countBy(groupedDataItem, function(val){
                                return val[segmentModel.dataGroup.divideByProp];
                            });
                            _.each(propCounts, function(value, name){
                                result.push({
                                    key: name,
                                    value: value
                                });
                            });
                        }
                        else if(prop.groupBy === 'sum' || prop.groupBy === 'avg'){
                            var divData = _.groupBy(groupedDataItem, function(val){
                                return val[segmentModel.dataGroup.divideByProp];
                            });
                            _.each(divData, function(value, name){
                                result.push({
                                    key: name,
                                    value: Conditioner.reduceData(value, prop)
                                });
                            });
                        }
                        else{
                            throw "When using divideBy, you should specify sum, count or avg on selection";
                        }

                        response.push({
                            key : groupName,
                            groupLevel: 'B',
                            values: result
                        });
                    });

                    topLevelResponse.push({
                        key : prop.prop + '-Group',
                        groupLevel : 'A',
                        values: response
                    });
                });
            }
        }
        else{
            var toplevelkey = 'xxxx';
            result = [];
            _.each(segmentModel.selection.props, function(prop){
                var val = Conditioner.reduceData(filteredData, prop);
                result.push({
                    key: prop.prop,
                    value: val
                });
            });

            _.each(segmentModel.selection.complexGroups, function(selectionGroup){
                var val = Conditioner.reduceData(filteredData, selectionGroup);
                result.push({
                    key: selectionGroup.selectionName,
                    value: val
                });
            });

            response.push({
                key : toplevelkey,
                groupLevel : 'B',
                values: result
            });

            topLevelResponse.push({
                key : toplevelkey,
                groupLevel : 'A',
                values: response
            });
        }
        
        
        

        return topLevelResponse;
    }
}