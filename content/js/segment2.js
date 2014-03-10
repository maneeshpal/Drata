
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
        self.conditionGroup.prefill(model.group || []);
        self.selectionGroup.prefill(model.selection || []);
        self.dataGroup.setProps(model.dataGroup || {});
    };
    self.getModel = function(){
        return {
            chartType: self.chartType(),
            selection: self.selectionGroup.getModel(),
            dataGroup: self.dataGroup.getModel(),
            group: self.conditionGroup.getModel(),
            properties: self.properties()
        }
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
    self.selection = new Selection(self.level+1, undefined, 'topCondition');
    self.operation = ko.observable();
    self.value = ko.observable();
    self.conditions = ko.observableArray();
    self.addCondition = function(){
        self.conditions.push(new Condition({level:self.level+1,onExpand: options.onExpand}));
    };
    self.boldExpression= ko.observable(false);
    self.removeCondition = function(condition){
       self.conditions.remove(condition);
    };
    self.clear = function(){
        self.conditions([]);
    };

    self.isComplex = ko.computed(function(){
        return self.conditions().length > 0;
    });

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
        if(self.boldExpression()){
            expression = '<strong style="color:#008cba; font-size:1rem">(' + expression + ')</strong>';
        }
        else{
            expression = '(' + expression + ')';
        }
        return expression;
    });
    self.complexConditionSummary = ko.computed(function(){
        return 'Complex Condition: <span class="keystroke">' + ((self.expression().length > 27) ? self.expression().substring(0,23) + '...)' : self.expression()) + '</span>';
    });

    self.afterAdd = function(elem){
      elem.nodeType === 1 && $(elem).hide().slideDown(100, function(){
        $(elem).show();
      });
    };
    self.beforeRemove = function(elem){
      elem.nodeType === 1 && $(elem).slideUp(100, function(){
        $(elem).remove();
      });
    };

    self.isValidCondition = function(){
        var isValid = true;
        if(self.isComplex()){
            var conditions = self.conditions();
            for(var c= 0; c< conditions.length; c++){
                if(!conditions[c].isValidCondition()) {
                    isValid = false;
                }
            }
        }
        else{
            var errors = ko.validation.group(self, {deep:false});
            var selerrors = ko.validation.group(self.selection, {deep:false});
            
            if(errors().length + selerrors().length > 0) {
                errors.showAllMessages();
                selerrors.showAllMessages();
                isValid = false;
            }
        }
        return isValid;
    };
    self.value.extend({
        required: { 
            message : 'Enter Value',
            onlyIf : function(){
                return self.operation() !== 'exists';
            }
        }
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
    self.boldExpression = ko.observable(false);
    self.currentBinding.subscribeChanged(function(newValue, oldValue){
        newValue.boldExpression(true);
        oldValue.boldExpression(false);
    });

    self.boldExpression = ko.observable(false);
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
        var currBinding = self.currentBinding();
        self.trace.push(currBinding);
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

    self.afterAdd = function(elem){
      elem.nodeType === 1 && $(elem).hide().slideDown(100, function(){
        $(elem).show();
      });
    };
    
    self.beforeRemove = function(elem){
      elem.nodeType === 1 && $(elem).slideUp(100, function(){
        $(elem).remove();
      });
    };

    self.goback = function(condition){
        var isValid = condition.isValidCondition();
        if(isValid){
            var prev = self.trace.pop();
            self.currentBinding(prev);
        }
    };
    self.gobackTo = function(tr){
        var index = self.trace.indexOf(tr);
        var removed = self.trace.splice(index, self.trace().length-1 || 1);

        //var cond = self;
        self.currentBinding(removed[0]);
    };

    self.expression = ko.computed(function(){
        var expression = '';
        var innerGroups = self.conditions();
        _.each(innerGroups, function(gr,index){
            expression = expression + ((index === 0)? gr.expression() : ' ' + gr.logic() + ' ' + gr.expression());
        });
        
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

    self.showComplex = ko.observable(false);
    
    self.hideComplex = ko.computed(function(){
        return !self.showComplex();
    });

    self.renderType = renderType;
    self.toggleComplex = function(){
        self.showComplex(!self.showComplex());
        if(self.showComplex() && !self.isComplex()){
            var selectedProp = self.selectedProp();
            if(selectedProp){
                self.selections.push(new Selection(self.level+1, {selectedProp:selectedProp}, 'childSelection'));
            }
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
        var errors = ko.validation.group(self, {deep:true});
        if(errors().length > 0) {
            errors.showAllMessages();
        }
        else{
            if(self.isComplex()) {
                self.showComplex(false);
                self.selectedProp(self.aliasName());
            }    
        }        
    };
    self.afterAdd = function(elem){
      elem.nodeType === 1 && $(elem).hide().slideDown(100, function(){
        $(elem).show();
      });
    };
    self.beforeRemove = function(elem){
      elem.nodeType === 1 && $(elem).slideUp(100, function(){
        $(elem).remove();
      });
    };
    self.prefill = function(m){
        self.aliasName(m.aliasName);
        self.logic(m.logic || '+');
        self.groupBy(m.groupBy);
        self.selectedProp(m.selectedProp);
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

    self.selectedProp.extend({
        required:{
            message: 'Select property',
            onlyIf : function(){
                return !self.isComplex();
            }
        }
    });
    self.aliasName.extend({
        required:{
            message: 'Select alias',
            onlyIf : function(){
                return self.renderType === 'topSelection' && self.isComplex();
            }
        }
    });
};

var ItemsGroup = function(level, model, renderType){
    var self = this;
    self.level =level;
    self.items = ko.observableArray();
    var itemFunc = (renderType === 'Condition') ? Condition : Selection;
    self.addItem = function(){
        self.items.push(new itemFunc(self.level+1, undefined, 'top' + renderType));
    };
    
    self.removeItem = function(item){
       self.items.remove(item);
    };
    
    self.prefill = function(model){
        self.items(ko.utils.arrayMap(
            model,
            function(sel) {
              return new itemFunc(self.level+1, sel, 'top' + renderType);
            }
        ));
    };

    self.afterAdd = function(elem){
      elem.nodeType === 1 && $(elem).hide().slideDown(100, function(){
        $(elem).show();
      });
    };
    
    self.beforeRemove = function(elem){
      elem.nodeType === 1 && $(elem).slideUp(100, function(){
        $(elem).remove();
      });
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
        var expressions = [], exp;
        var innerGroups = self.items();
        _.each(innerGroups, function(gr,index){
            exp = gr.expression();
            if(gr.groupBy() !== 'value'){
                exp = '<em>' + gr.groupBy() + '</em>(' + exp + ')';
            }
            expressions.push(exp);
        });
        
        return 'Select ' + expressions.join(', ');
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
        return tempData.randomProps(100);
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
    processSimple : function(obj, group){
        var complexValue, complexType;
        if(group.groupType === 'selection'){
            //perform arithmetic operation on selections
            if(this.properties.indexOf(group.selectedProp) === -1 && _.isNumber(+group.selectedProp)){
                complexValue = +group.selectedProp;
            }else{
                complexValue = obj[group.selectedProp];    
            }
        }
        else{
            if(group.selection.isComplex){
                complexType = this.processGroup(obj, group.selection);
                complexValue = this.calc(complexType.value, group.operation, group.value);
            }
            else{
                complexValue = this.calc(obj[group.selection.selectedProp], group.operation, group.value);
            }
        }
        
        return {
            value : complexValue,
            logic : group.logic
        };
    },
    processGroups : function(obj, groups){
        var boolValues = [], boolValue;
        _.each(groups, function(group){
            boolValue = this.processGroup(obj,group);
            boolValues.push(boolValue);
        }.bind(this));

        var returnValue = this.applyOperations(boolValues);
        
        return returnValue;
    },
    processGroup : function(obj, group){
        var boolValue;
        if(group.isComplex){
            boolValue = this.processGroups(obj,group.groups);
        }
        else{
            boolValue = this.processSimple(obj, group);
        }
        return boolValue;
    },
    processDataGroups : function(groupedData, dataGroup, selection){
        var returnGroups = [];
        _.each(groupedData, function(dataItem, groupName){
            var ret = this.divideByInterval(dataItem, dataGroup, selection);
            returnGroups.push({
                key: groupName,
                values : ret
            });
        }.bind(this));
        return returnGroups;
    },
    divideByInterval : function(data, dataGroup, selection){
        var ret = [];
        //var isComplex = selection.groupType !== undefined;

        if(selection.isComplex && selection.groupBy === 'count')
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
                (item.hasOwnProperty(selection.selectedProp) || selection.isComplex) && ret.push({
                    x: item[dataGroup.xAxisProp],
                    y: (selection.isComplex)? Conditioner.processGroup(item,selection).value : item[selection.selectedProp]
                });
            });
        }
        return ret;
    },
    filterData : function(data, conditions){
        if (!conditions || conditions.length === 0) return data;
        var filteredData = data.filter(function(obj, index){
            var result = this.processGroups(obj, conditions);
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
        var groupedData;
        
        if(segmentModel.dataGroup.hasGrouping){
            groupedData = _.groupBy(filteredData, function(item){return item[segmentModel.dataGroup.groupByProp]});
        }
        _.each(segmentModel.selection, function(selectionGroup){
           var values;
            if(segmentModel.dataGroup.hasGrouping){
                values = Conditioner.processDataGroups(groupedData, segmentModel.dataGroup, selectionGroup);
            }
            else{
                values = Conditioner.divideByInterval(filteredData, segmentModel.dataGroup, selectionGroup);
            }
            result.push({
                key: selectionGroup.isComplex ? selectionGroup.aliasName || 'selection' : selectionGroup.selectedProp,
                values: values
            });
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
        //var isComplex = selection.groupType !== undefined;
        if(selection.isComplex && selection.groupBy === 'count')
            throw "Not allowed for complex selections.";

        var ret = _.reduce(objArray, function(memo, num){ 
            var numval;
            if(selection.isComplex){ //complex selection. so we need to process it.
                var temp = Conditioner.processGroup(num,selection);
                numval = temp.value;
            }
            else if(selection.groupBy === 'count'){
                numval = num[selection.selectedProp]? 1 : 0;
            }
            else if(selection.groupBy === 'sum' || selection.groupBy === 'avg'){ // sumby
                numval = +num[selection.selectedProp] || 0;
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
                _.each(segmentModel.selection, function(sel){
                    result = [];
                    _.each(groupedData, function(groupedDataItem, groupName){
                        var val = Conditioner.reduceData(groupedDataItem,sel);

                        val >= 0 && result.push({
                            key: groupName,
                            value: val
                        });
                    });
                    
                    response.push({
                        key : sel.isComplex? sel.aliasName : sel.selectedProp|| 'Selection',
                        groupLevel: 'B',
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
                _.each(segmentModel.selection, function(sel){
                    response = [];
                    _.each(groupedData, function(groupedDataItem, groupName){
                        var propCounts;
                        result = [];
                        
                        if(sel.groupBy === 'count'){
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
                        else if(sel.groupBy === 'sum' || sel.groupBy === 'avg'){
                            var divData = _.groupBy(groupedDataItem, function(val){
                                return val[segmentModel.dataGroup.divideByProp];
                            });
                            _.each(divData, function(value, name){
                                result.push({
                                    key: name,
                                    value: Conditioner.reduceData(value, sel)
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
                        key : (sel.isComplex ? sel.aliasName : sel.selectedProp || 'selection') + '-Group',
                        groupLevel : 'A',
                        values: response
                    });
                });
            }
        }
        else{
            var toplevelkey = 'xxxx';
            result = [];
            
            _.each(segmentModel.selection, function(sel){
                var val = Conditioner.reduceData(filteredData, sel);
                result.push({
                    key: sel.isComplex? sel.aliasName : sel.selectedProp || 'selection',
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