
var Segmentor = function(model){
    //model = model || defaultSegmentModel;
    var self = this;
    self.properties = ko.observableArray();
    self.level = 0;
    self.conditionalOperations = ['>', '<', '>=','<=', '=', '!=','exists','like'];
    self.arithmeticOperations = ['+', '-', '*','/'];
    self.groupingOptions = ko.observableArray(['value','count', 'sum', 'avg']);
    self.xAxisTypes = ko.observableArray(['time','linear','currency']);
    self.chartTypes = ['line', 'area', 'scatter', 'pie','bar'];
    self.logics = ['and', 'or'];
    self.filteredData = ko.observable();
    self.outputData = ko.observable();
   // self.conditionBuilder = new ConditionBuilder({level: self.level+1, properties: self.properties});
    //self.conditionGroup = new ItemsGroup(self.level + 1, undefined, 'Condition');
    self.conditionGroup = new ConditionGroup(self.level + 1, undefined, 'Condition', self.properties);
    self.selectionGroup = new ItemsGroup(self.level + 1, undefined, 'Selection');
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
        self.conditionGroup.prefill(model.group || {});
        self.selectionGroup.prefill(model.selection || {});
        self.dataGroup.setProps(model.dataGroup || {});
    };
    self.getModel = function(){
        return {
            chartType: self.chartType(),
            selection: self.selectionGroup.getModel(),
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

var Condition = function(options){
    var self = this;
    self.level = options.level;
    self.logic = ko.observable('and');
    self.selection = new Selection(self.level + 1, undefined, 'topCondition');
    self.operation = ko.observable();
    self.value = ko.observable();
    self.conditions = ko.observableArray();
    self.addCondition = function(){
        self.conditions.push(new Condition({level:self.level+1,onExpand: options.onExpand}));
    };
    
    self.removeCondition = function(condition){
       self.conditions.remove(condition);
    };
    self.clear = function(){
        self.conditions([]);
    };

    self.isComplex = ko.computed(function(){
        return self.conditions().length > 0;
    });

    // self.isComplete = ko.computed(function(){
    //     var isCom = (self.logic()!== undefined && self.operation()!== undefined && self.selection.isComplete() && (self.logic() === 'exists' || (self.value() !== undefined && self.value() !== '')));
    //     console.log('condition complete: ' + isCom);
    //     return isCom;
    // });

    self.expand = function(){
        options.onExpand && options.onExpand(self);

    };    

    self.prefill = function(m){
        self.logic(m.logic);
        self.value(m.value);
        self.selection.prefill(m.selection);
        self.operation(m.operation);
        self.prefillGroups(m.groups);
    };
    self.prefillGroups = function(m){
        self.conditions(ko.utils.arrayMap(
            m,
            function(groupModel) {
                return new Condition({level:self.level+1, model:groupModel, onExpand: options.onExpand}); 
            }
        )); 
    }
    self.getModel = function(){
        var returnConditions = [];
        _.each(self.conditions(), function(sel){
            returnConditions.push(sel.getModel());
        });
        return {
            groupType: 'condition',
            groups: returnConditions,
            logic: self.logic(),
            selection: self.selection.getModel(),
            isComplex : self.isComplex(),
            operation: self.operation(),
            value : self.value()
        }
    };

    self.expression = ko.computed(function(){
        var expression = '';
        if(!self.isComplex()){
            return  self.selection.expression() + ' ' + self.operation() + ' ' + ((self.operation() === 'exists')? '': (self.value() ? self.value(): '__'));
        }
        
        var innerGroups = self.conditions();
        _.each(innerGroups, function(gr,index){
            expression = expression + ((index === 0)? gr.expression() : ' ' + gr.logic() + ' ' + gr.expression());
        });
        expression = '(' + expression + ')';
        return expression;
    });
    if(options.model){
        self.prefill(options.model);
    }
};

var ConditionGroup = function(level, model, xxx){
    var self = this;
    self.level =level;
    self.conditions = ko.observableArray();
    self.trace = ko.observableArray();
    self.currentBinding = ko.observable(self);

    self.currentTemplate = ko.computed(function(){
        return { name : 'condition-group-template', data: self.currentBinding};
    });

    self.getModel = function(){
        var returnGroups = [];
        _.each(self.conditions(), function(sel){
            returnGroups.push(sel.getModel());
        });
        return returnGroups;
    };

    self.onExpand = function(condition){
        self.trace.push(self.currentBinding());
        self.currentBinding(condition);
    };
    self.prefill = function(model){
        self.conditions(ko.utils.arrayMap(
            model,
            function(cond) {
              return new Condition({level:self.level+1,model: cond, onExpand:self.onExpand.bind(self)});
            }
        ));
    };
    self.addCondition = function(){
        self.conditions.push(new Condition({level:self.level+1, onExpand: self.onExpand.bind(self)}));
    };
    
    self.removeCondition = function(condition){
       self.conditions.remove(condition);
    };

    self.clear = function(){
        self.conditions([]);
    };
    self.goback = function(){
        var prev = self.trace.pop();
        //var cond = self;
        self.currentBinding(prev);
    };

    self.expression = ko.computed(function(){
        var expression = '';
        var innerGroups = self.conditions();
        _.each(innerGroups, function(gr,index){
            expression = expression + ((index === 0)? gr.expression() : ' ' + gr.logic() + ' ' + gr.expression());
        });
        expression = '(' + expression + ')';
        return expression;
    });

};

var Selection = function(level, model, renderType){
    var self = this;
    self.level = level;
    self.logic = ko.observable('+');
    self.selections = ko.observableArray();
    self.aliasName = ko.observable();
    self.groupBy = ko.observable();
    self.selectedProp = ko.observable();

    self.addSelection = function(){
        self.selections.push(new Selection(self.level+1, undefined, 'childSelection'));
    };
    
    self.removeSelection = function(selection){
       self.selections.remove(selection);
    };

    self.isComplex = ko.computed(function(){
        return self.selections().length > 0;
    });

    self.isComplete = ko.computed(function(){
        var isCom = false;
        if(!self.isComplex()){
            isCom =  self.logic() !== undefined 
            && self.selectedProp() !== '' && self.selectedProp() !== undefined;
        }
        else{
            isCom = self.selections().some(function(sel){
                return !sel.isComplete();
            });
        }
        console.log('selection complete: ' + isCom);
        return isCom;
    });
    self.showComplex = ko.observable(false);
    
    self.hideComplex = ko.computed(function(){
        return !self.showComplex();
    });

    self.renderType = renderType;
    self.toggleComplex = function(){
        self.showComplex(!self.showComplex());
        if(self.showComplex() && !self.isComplex()){
            self.selectedProp('');
        }
    };
    
    self.selectedProp.subscribe(function(newValue){
        if(newValue !== undefined && !self.isComplex()){
            self.selections([]);
        }
    });
    self.clearGroups = function(){
        self.selections([]);
        self.selectedProp(undefined);
        self.showComplex(false);
    };
    self.done = function(){
        if(self.isComplex()) {
            self.showComplex(false);
            self.selectedProp(self.aliasName());
        }
    };
    
    self.prefill = function(m){
        self.aliasName(m.aliasName);
        self.logic(m.logic);
        self.groupBy(m.groupBy);
        self.selections(ko.utils.arrayMap(
            m.groups,
            function(groupModel) {
                return new Selection(self.level+1, groupModel, 'childSelection'); 
            }
        )); 
    };
    self.getModel = function(){
        var returnSelections = [];
        _.each(self.selections(), function(sel){
            returnSelections.push(sel.getModel());
        });
        return {
            groupType: 'selection',
            groups: returnSelections,
            logic: self.logic(),
            aliasName: self.aliasName(),
            groupBy: self.groupBy(),
            selectedProp: self.selectedProp(),
            isComplex : self.isComplex()
        }
    };
    self.expression = ko.computed(function(){
        var expression = '';
        if(!self.isComplex()){
            return self.selectedProp() ? self.selectedProp() : '__';
        }
        
        var innerGroups = self.selections();
        _.each(innerGroups, function(gr,index){
            expression = expression + ((index === 0)? gr.expression() : ' ' + gr.logic() + ' ' + gr.expression());
        });
        expression = '(' + expression + ')';
        return expression;
    });
    if(model){
        self.prefill(model);
    }
};

var ItemsGroup = function(level, model, renderType){
    var self = this;
    self.level =level;
    self.items = ko.observableArray();
    var itemFunc = (renderType === 'Condition') ? Condition : Selection;
    //self.properties = ko.observableArray(['aaa', 'aab', 'abb', 'xxxx']);
    self.addItem = function(){
        self.items.push(new itemFunc(self.level+1, undefined, 'top' + renderType));
    };
    
    self.removeItem = function(item){
       self.items.remove(item);
    };
    
    self.prefill = function(model){
        self.items(ko.utils.arrayMap(
            model.items,
            function(sel) {
              return new itemFunc(self.level+1, sel, 'top' + renderType);
            }
        ));
    };

    model && self.prefill(model);

    self.getModel = function(){
        var returnGroups = [];
        _.each(self.items(), function(sel){
            returnGroups.push(sel.getModel());
        });
        return returnGroups;
    };
    self.expression = ko.computed(function(){
        var expression = '';
        var innerGroups = self.items();
        _.each(innerGroups, function(gr,index){
            expression = expression + ((index === 0)? gr.expression() : ' ' + gr.logic() + ' ' + gr.expression());
        });
        expression = '(' + expression + ')';
        return expression;
    });
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