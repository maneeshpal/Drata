
var Segmentor = function(model){
    var self = this;
    //self.propertyTypes = {};

    self.properties = ko.observableArray();

    self.level = 0;
    self.temp = ko.observable();
    self.outputData = ko.observable();
    self.conditionGroup = new ConditionGroup({ level: self.level + 1, model: undefined, renderType: 'Condition'});
    self.selectionGroup = new SelectionGroup({ level: self.level});
    self.formErrors = ko.observableArray();
    
    self.groupData = ko.observable();
    self.dataFilter = new DataFilter();
    self.chartType = ko.observable();

    var compDataGroup, trackDataGroup, currentDataGroupTemplate;
    self.dataGroup = undefined;
    
    self.initialize = function(model){
        model = model || {};
        self.conditionGroup.prefill(model.group || []);
        self.selectionGroup.prefill(model.selection || []);
        self.dataFilter.prefill(model.dataFilter || {});
        self.chartType(model.chartType);
        self.dataGroup && self.dataGroup.setProps(model.dataGroup || {});
        self.chartType.isModified(false);
        self.formErrors([]);
    };
    
    self.dataGroupTemplate = ko.computed(function(){
        if(drata.global.trackingChartTypes.indexOf(self.chartType()) > -1){
            self.dataGroup =  compDataGroup || new TrackDataGroup({});
            currentDataGroupTemplate = 'track-datagroup-template';
        }else{
            self.dataGroup =  trackDataGroup || new ComparisonDataGroup({});
            currentDataGroupTemplate = 'comp-datagroup-template';
        }

        return {
            name: currentDataGroupTemplate,
            data: self.dataGroup
        };
    });
    
    self.getModel = function(){
        if(!self.isValidSegment()) return;
        return self.getM();
    };
    self.getM = function(){
        return {
            selection: self.selectionGroup.getModel(),
            dataGroup: self.dataGroup ? self.dataGroup.getModel(): undefined,
            group: self.conditionGroup.getModel(),
            dataFilter: self.dataFilter.getModel(),
            chartType: self.chartType()
        };
    };

    self.getQueryErrors = function(){
        var errors = [];
        var segmentModel = self.getM();
        var isTrackChart = drata.global.trackingChartTypes.indexOf(self.chartType()) > -1;
        if(segmentModel.selection.length === 0){
            errors.push('No selections exist, please select the property you wish to visualize');
        }
        var selections = _.groupBy(segmentModel.selection, function(s){
            return s.isComplex ? 'complex': 'simple';
        });

        selections.simple = selections.simple || [];
        selections.complex = selections.complex || [];
        //Logic validation 7
        //selections should not have sum, avg, min, max for non numeric properties

        if(selections.simple.length > 0){
            var l7 = selections.simple.filter(function(s){
                return isNaN(+s.selectedProp) && drata.dashboard.propertyManager.getPropertyType(s.selectedProp) !== 'numeric' && ['sum', 'avg', 'min', 'max'].indexOf(s.groupBy) > -1 ;
            }).map(function(s2){
                return s2.selectedProp;
            });
            if(l7.length > 0){
                errors.push('Error is selections: cannot perform <em>sum, avg, min, max </em> on non-numeric properties <em style="font-weight:bold">'+ l7.join(', ') +'</em>');
            }
        }

        //logic validation 8
        //any non numeric selection by value is invalid 
        //numeric value in simple selection is invalid
        if(selections.simple.length > 0){
            var l8 = selections.simple.filter(function(s){
                if(!isNaN(+s.selectedProp) && !drata.dashboard.propertyManager.getPropertyType(s.selectedProp)){
                    errors.push('Error is selections: numeric value cannot be used in a simple selection <em style="font-weight:bold">'+ s.selectedProp +'</em>');
                    return false;
                }
                return drata.dashboard.propertyManager.getPropertyType(s.selectedProp) !== 'numeric' && s.groupBy === 'value';
            }).map(function(s2){
                return s2.selectedProp;
            });
            if(l8.length > 0){
                errors.push('Error is selections: cannot select <em>value</em> of non-numeric properties <em style="font-weight:bold">'+ l8.join(', ') +'</em>');
            }
        }

        //logic validation 1
        // should not perform arithmetic operations on non numeric properties
        var complexProps = drata.utils.getSelectionProperties(selections.complex);
        
        var nonNumericComplexSelections = [];
        if(complexProps.length > 0){
            nonNumericComplexSelections = complexProps.filter(function(s){
                return isNaN(+s) && drata.dashboard.propertyManager.getPropertyType(s) !== 'numeric';
            });
            if(nonNumericComplexSelections.length > 0){
                errors.push('Error is selections: cannot perform arithmetic operations on non-numeric properties <em style="font-weight:bold">'+ nonNumericComplexSelections.join(', ') +'</em>');
            }
        }

        //Logic validation 2
        //if groupby exists, selections should be sum count or avg
        //if groupby doesnt exist, only value is permitted.
        var hasGrouping;

        if(segmentModel.dataGroup){
            if(drata.global.trackingChartTypes.indexOf(segmentModel.chartType) > -1){
                hasGrouping = segmentModel.dataGroup.timeseries;
            }else{
                hasGrouping = segmentModel.dataGroup.hasGrouping;
            }   
        }else{
            //dont do anything. this happened because user did not select
            //chart type. we already show error for that.
        }

        if(hasGrouping){
            var l2a  = segmentModel.selection.filter(function(s){
                return s.groupBy === 'value';
            }).map(function(s2){
                return s2.selectedProp;
            });
            if(l2a.length > 0){
                errors.push('Error in Selections and Grouping: When "Group by" exists, aggregate functions <em>sum, avg, count </em> are expected in <em style="font-weight:bold">' + l2a.join(', ') + '</em>');
            }
        }else if(isTrackChart){
            var l2b  = segmentModel.selection.filter(function(s){
                return s.groupBy !== 'value';
            }).map(function(s2){
                return s2.selectedProp;
            });
            if(l2b.length > 0){
                errors.push('Error in Selections and Grouping: When "Group by" dosen\'t exist, aggregate function <em>sum, avg, count </em> are not allowed in <em style="font-weight:bold">' + l2b.join(', ') + '</em>');
            }

        }else{

            var l2c  = segmentModel.selection.filter(function(s){
                return s.groupBy === 'value';
            }).map(function(s2){
                return s2.selectedProp;
            });
            if(l2c.length > 0){
                errors.push('Either apply "Group by" or apply aggregete functions to selections such as <em>sum, avg, count </em>. <em style="font-weight:bold">value</em> is not permitted for your selections <em style="font-weight:bold">' + l2c.join(', ') + '</em>');
            }
        }

        //logic validation 3
        //when complex selections, count is not allowed
        if(selections.complex.length>0){
            var selWithCounts = selections.complex.filter(function(s){
                return s.groupBy === 'count';
            }).map(function(s2){
                return s2.aliasName;
            });
            if(selWithCounts.length > 0){
                errors.push('Error in Selections: <em>count</em> is not allowed when selections are derived by from more than 1 property <em style="font-weight:bold">(' + selWithCounts.join(', ') + ')</em>');
            }
        }
        return errors;
    };

    self.isValidSegment = function(){
        self.formErrors([]);
        var selerrors = ko.validation.group(self.selectionGroup, {deep:true});
        var conditions = self.conditionGroup.conditions();
        var dataFilterErrors = ko.validation.group(self.dataFilter, {deep:true});
        var topLevelErrors = ko.validation.group(self, {deep:false});
        var isValid = true;

        for(var c= 0; c< conditions.length; c++){
            if(!conditions[c].isValidCondition()) {
                isValid = false;
            }
        }
        if(!isValid) self.formErrors.push('Conditions have errors.');
        if(selerrors().length > 0 ){
            isValid = false;
            selerrors.showAllMessages();
            self.formErrors.push('Selections have errors.');
        }
        if(topLevelErrors().length > 0){
            isValid = false;
            topLevelErrors.showAllMessages();
            self.formErrors(self.formErrors().concat(topLevelErrors()));
        }
        if(dataFilterErrors().length > 0){
            isValid = false;
            dataFilterErrors.showAllMessages();
            self.formErrors.push('Errors with date range');
        }
        if(self.dataGroup){
            var dataGroupErrors = ko.validation.group(self.dataGroup, {deep:true});
            if(dataGroupErrors().length > 0) {
                isValid = false;
                dataGroupErrors.showAllMessages();
                self.formErrors(self.formErrors().concat(dataGroupErrors()));
            }
        }
        var logicErrors = self.getQueryErrors();
        if(logicErrors.length > 0){
            isValid  = false;
            self.formErrors(self.formErrors().concat(logicErrors));
        }

        return isValid;
    };
    self.chartType.extend({
        required: {'message': 'Select Chart Type'}
    });

};

var GroupBySelection = function(m){
    m = m || {};
    var self = this;
    self.selectedProp = ko.observable(m.selectedProp);
    self.availableSelections = ko.computed(function(){
        var selections = ko.toJS(drata.dashboard.widgetEditor.segment.selectionGroup.items),
        availableSelections = [];
        if(selections && selections.length > 0){
            _.each(selections, function(sel){
                availableSelections.push(sel.groupBy + '_' + ((sel.isComplex) ? sel.aliasName : sel.selectedProp));
            });
        }
        return availableSelections;
    });

    self.getModel = function(){
        return {
            selectedProp: self.selectedProp(),
            isComplex: false,
            logic: '+'
        }
    }
};

var GroupByCondition = function(m){
    m = m || {};
    var self = this;
    self.logic = ko.observable(m.logic || 'and');
    self.selection = new GroupBySelection(m.selection);
    self.operation = ko.observable(m.operation || '=');
    self.value = ko.observable(m.value);
    self.isComplex = false;
    self.valType = 'numeric';
    self.availableOperations = _.difference(drata.global.conditionalOperations, ['exists', 'like', 'not like']);
    
    self.getModel = function(){
        return {
            logic: self.logic(),
            operation: self.operation(),
            value: self.value(),
            isComplex: false,
            valType: 'numeric',
            selection: self.selection.getModel()
        }
    }
    self.value.extend({
        numeric: {},
        required: {
            message: 'Enter Numeric Value'
        }
    });
};

var TrackDataGroup = function(){
    var self = this;    

    self.hasGrouping = ko.observable(false);
    self.groupByProp = ko.observable();

    self.xAxisType = ko.observable();
    self.timeseries = ko.observable();
    self.xAxisProp = ko.observable();
    self.timeseriesInterval = ko.observable();
    self.groupByConditions = ko.observableArray();

    self.intervalOptions = ko.computed(function(){
        return self.xAxisType() !== 'date' ? [] : drata.global.dateIntervalTypeAheads;
    });

    self.addGroupByCondition = function(){
        self.groupByConditions.push(new GroupByCondition());
    };

    self.removeGroupByCondition = function(groupByCondition){
        self.groupByConditions.remove(groupByCondition);
    };
    
    self.hasGrouping.subscribe(function(newValue){
        if(!newValue) {
            self.groupByProp(undefined);
        }
    });

    self.properties = ko.computed(function(){
        return self.xAxisType() === 'date' ? drata.dashboard.propertyManager.dateProperties() : drata.dashboard.propertyManager.numericProperties();
    });

    self.xAxisType.subscribe(function(){
        self.xAxisProp(undefined);
        self.xAxisProp.isModified(false);
    });

    self.timeseries.subscribe(function(newValue) {
        if(!newValue) self.timeseriesInterval(undefined);
    });

    self.setProps = function(model){
        self.groupByProp(model.groupByProp);
        self.timeseries(model.timeseries);
        self.xAxisType(model.xAxisType);
        self.xAxisProp(model.xAxisProp);
        self.hasGrouping(model.groupByProp !== undefined);
        self.timeseriesInterval(model.timeseriesInterval);

        self.groupByConditions(ko.utils.arrayMap(
            model.groupByConditions,
            function(model) {
                return new GroupByCondition(model); 
            }
        ));
    };

    self.getModel = function(){
        
        var dataGroupModel = {
            groupByProp: self.groupByProp(),
            hasGrouping: self.hasGrouping(),
            timeseries: self.timeseries(),
            timeseriesInterval: self.timeseriesInterval(),
            xAxisProp: self.xAxisProp(),
            xAxisType: self.xAxisType()
        }

        if(self.timeseries() && self.groupByConditions().length > 0) {
            dataGroupModel.groupByConditions = self.groupByConditions().map(function(gc){
                return gc.getModel();
            });
        }

        return dataGroupModel;
    }

    self.groupByProp.extend({
        required: { 
            message : 'Enter GroupBy value',
            onlyIf : function(){
                return self.hasGrouping();
            }
        }
    });

    self.timeseriesInterval.extend({
        groupingInterval: {
            intervalType : function(){
                return self.xAxisType();
            }
        },
        onlyIf : function(){
            return self.timeseries();
        }
    });

    self.xAxisProp.extend({
        required: { 
            message : 'Select x axis'
        }
    });
};

var ComparisonDataGroup = function(options){
    var self = this;

    self.hasGrouping = ko.observable(false);
    self.groupByProp = ko.observable();
    self.groupByInterval = ko.observable();
    self.divideByInterval = ko.observable();
    self.groupByIntervalType = ko.observable();
    self.groupByConditions = ko.observableArray();

    self.groupByProp.subscribe(function(newValue){
        var newType = drata.dashboard.propertyManager.getPropertyType(newValue);
        self.groupByIntervalType(newType? newType : 'unknown');
        self.groupByInterval(undefined);
        self.groupByInterval.isModified(false);
    });

    self.hasDivideBy = ko.observable(false);
    self.divideByProp = ko.observable();
    
    self.divideByIntervalType = ko.observable();

    self.divideByProp.subscribe(function(newValue){
        var newType = drata.dashboard.propertyManager.getPropertyType(newValue);
        self.divideByIntervalType(newType? newType : 'unknown');
        self.divideByInterval(undefined);
        self.divideByInterval.isModified(false);
    });

    self.groupByIntervalOptions = ko.computed(function(){
        if(self.groupByIntervalType() !== 'date') return [];
        return drata.global.dateIntervalTypeAheads;
    });

    self.divideByIntervalOptions = ko.computed(function(){
        if(self.divideByIntervalType() !== 'date') return [];
        return drata.global.dateIntervalTypeAheads;
    });

    self.hasGrouping.subscribe(function(newValue){
        if(!newValue){
            self.groupByProp(undefined);
            self.hasDivideBy(undefined);
        }
    });

    self.hasDivideBy.subscribe(function(newValue){
        if(!newValue){
            self.divideByProp(undefined);
        }
    });

    self.setProps = function(model){
        self.groupByProp(model.groupByProp);
        self.hasGrouping(model.groupByProp !== undefined);
        self.divideByProp(model.divideByProp);
        self.hasDivideBy(model.divideByProp !== undefined);
        self.groupByIntervalType(model.groupByIntervalType);
        self.divideByIntervalType(model.divideByIntervalType);
        //last
        self.groupByInterval(model.groupByInterval);
        //last
        self.divideByInterval(model.divideByInterval);

        self.groupByConditions(ko.utils.arrayMap(
            model.groupByConditions,
            function(model) {
                return new GroupByCondition(model); 
            }
        ));
    };

    self.getModel = function(){
        var dataGroupModel = {
            divideByInterval: self.divideByInterval(),
            divideByIntervalType: self.divideByIntervalType(),
            divideByProp: self.divideByProp(),
            groupByInterval: self.groupByInterval(),
            groupByIntervalType: self.groupByIntervalType(),
            groupByProp: self.groupByProp(),
            hasGrouping: self.hasGrouping(),
            hasDivideBy: self.hasDivideBy()
        }
        
        if(self.hasGrouping() && self.groupByConditions().length > 0) {
            dataGroupModel.groupByConditions = self.groupByConditions().map(function(gc){
                return gc.getModel();
            });
        }

        return dataGroupModel;
    };

    self.addGroupByCondition = function(){
        self.groupByConditions.push(new GroupByCondition());
    };

    self.removeGroupByCondition = function(groupByCondition){
        self.groupByConditions.remove(groupByCondition);
    };

    self.needsGroupByInterval = ko.computed(function(){
        return self.hasGrouping() && ['date', 'numeric'].indexOf(self.groupByIntervalType()) > -1;
    });
    self.needsDivideByInterval = ko.computed(function(){
        return self.hasDivideBy() && ['date', 'numeric'].indexOf(self.divideByIntervalType()) > -1;
    });

    self.groupByProp.extend({
        required: { 
            message : 'Enter GroupBy value',
            onlyIf : function(){
                return self.hasGrouping();
            }
        }
    });

    self.divideByProp.extend({
        required: { 
            message : 'Enter SliceBy value',
            onlyIf : function(){
                return self.hasDivideBy();
            }
        }
    });

    self.groupByInterval.extend({
        required: { 
            message : 'Enter Interval',
            onlyIf: function(){
                return self.needsGroupByInterval();
            }
        },
        groupingInterval: {
            intervalType : function(){
                return self.groupByIntervalType();
            }
        }
    });

    self.divideByInterval.extend({
        required: { 
            message : 'Enter Interval',
            onlyIf: function(){
                return self.needsDivideByInterval();
            }
        },
        groupingInterval: {
            intervalType : function(){
                return self.divideByIntervalType();
            }
        }
    });
};

var TimeFrameItem = function(timeframeType){
    var self = this, dp;
    self.dynamicDate = ko.observable();
    self.staticDate = ko.observable();
    self.dateType = ko.observable('static');
    self.timeframeType = timeframeType;
    self.dynamicDate.extend({
        dynamicInterval: {},
        required: {
            message: 'Enter Interval',
            onlyIf: function(){
                return self.dateType() === 'dynamic';
            }
        }
    });

    self.staticDate.extend({
        validDataFilterDate: {},
        required: {
            message: 'Enter Date',
            onlyIf: function(){
                return self.dateType() === 'static';
            }
        }
    });
    
    self.getModel = function(){
        return self.dateType() === 'static' ? self.staticDate() : self.dynamicDate();
    };
    self.prefill = function(model){
        if(!model) {
            self.staticDate(undefined);
            self.dynamicDate(undefined);
            self.staticDate.isModified(false);
            self.dynamicDate.isModified(false);
        }
        if(+new Date(model)){
            self.staticDate(model);
            self.dateType('static');
        }else {
            self.dynamicDate(model);
            self.dateType('dynamic');
        }
    };
}

var DataFilter = function(){
    var self = this;
    self.from = new TimeFrameItem('from');
    self.to = new TimeFrameItem('to');
    self.dateProp = ko.observable().extend({
        required: {message: 'Enter your Date Property'}
    });
    self.getModel = function(){
        return {
            from : self.from.getModel(),
            to: self.to.getModel(),
            dateProp: self.dateProp()
        }
    };

    self.prefill = function(model){
        self.dateProp(model.dateProp);
        if(!model.dateProp) self.dateProp.isModified(false);
        self.from.prefill(model.from);
        self.to.prefill(model.to);
    };

    self.expression = ko.computed(function(){
        return drata.utils.getDataFilterExpression(self.getModel());
    }).extend({ throttle: 500 });
};

var Condition = function(options){
    var self = this;
    self.level = options.level;
    self.isTopLevel = false;
    self.logic = ko.observable('and');
    self.selection = new Selection({ level: options.level, renderType: 'topCondition'});
    self.operation = ko.observable('=');
    self.value = ko.observable();
    self.conditions = ko.observableArray();

    self.isComplex = ko.computed(function(){
        return self.conditions().length > 0;
    });

    self.valType = ko.observable('unknown');

    self.selection.selectedProp.subscribe(function(newValue){
        if(!newValue || self.selection.isComplex()) {
            self.valType('unknown');  
        }
        else {
            var newType = drata.dashboard.propertyManager.getPropertyType(newValue);
            newType && self.valType(newType);
        }
    });

    self.availableValues = ko.computed(function(){
        if(self.valType() === 'bool'){
            return ['true', 'false'];
        }
        return [];
    });

    self.availableOperations = ko.computed(function(){
        if(self.valType() === 'string'){
           return _.difference(drata.global.conditionalOperations, drata.global.numericOperations);
        }
        else if(self.valType() === 'bool'){
            return ['=', 'exists'];
        }
        else if(self.valType() === 'date' || self.valType() === 'numeric'){
           return _.difference(drata.global.conditionalOperations, ['like', 'not like']);
        }
        return drata.global.conditionalOperations;
    });

    self.addCondition = function(){
        self.conditions.push(new Condition({ level:options.level+1 }));
    };
    
    self.addComplexCondition = function(){
        self.conditions.push(new Condition({ level:options.level+1 }));
    };    
    
    //self.boldExpression= ko.observable(false);
    self.removeCondition = function(condition){
       self.conditions.remove(condition);
    };
    self.clear = function(){
        self.conditions([]);
    };

    self.showComplex = ko.observable(false);
    
    self.hideComplex = ko.computed(function(){
        return !self.showComplex();
    });

    self.toggleComplex = function(){
        self.showComplex(!self.showComplex());
        if(self.showComplex() && !self.isComplex()){
            self.selection.clearGroups(); //reset the selection.
            self.value(undefined);
            self.value.isModified(false);
            //prefill inner condition with outer
        }
    };

    self.done = function(){
        if(self.isValidCondition()) {
            self.toggleComplex();
        }
    };

    self.clear = function(){
        self.conditions([]);
        self.showComplex(false);
        self.selection.clearGroups(); //reset the selection.
        self.value(undefined);
        self.value.isModified(false);
    };

    self.prefill = function(m){
        self.logic(m.logic);
        self.value(m.value);
        self.selection.prefill(m.selection);
        self.operation(m.operation);
        prefillGroups(m.groups);
    };
    var prefillGroups = function(conditionGroupsModel){
        self.conditions(ko.utils.arrayMap(
            conditionGroupsModel,
            function(groupModel) {
                return new Condition({ level:options.level+1, model:groupModel }); 
            }
        )); 
    };
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
            value : self.value(),
            valType: self.valType()
        }
    };

    self.expression = ko.computed(function(){
        var expression = '';
        if(!self.isComplex()){
            var operationIsExists = self.operation() === 'exists';
            var wrapWithQuotes = (self.valType() === 'string' || self.valType() === 'date') && !operationIsExists;

            expression = drata.utils.format('{0} {1} {2}{3}{2}', self.selection.expression(), self.operation(), (wrapWithQuotes ? '\'': ''), (operationIsExists ? '': self.value() || '__'));
            
        }
        else{
            var innerGroups = self.conditions();
            _.each(innerGroups, function(gr,index){
                expression = expression + ((index === 0)? gr.expression() : ' ' + gr.logic() + ' ' + gr.expression());
            });
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
    //options.expand && self.expand();
};

var ConditionGroup = function(options){
    var self = this;
    self.level = options.level;
    self.conditions = ko.observableArray();
    self.isTopLevel = true;
    self.getModel = function(){
        var returnGroups = [];
        _.each(self.conditions(), function(sel){
            returnGroups.push(sel.getModel());
        });
        return returnGroups;
    };

    self.prefill = function(model){
        self.conditions(ko.utils.arrayMap(
            model,
            function(cond) {
              return new Condition({ level:options.level+1,model: cond});
            }
        ));
    };
    self.addCondition = function(){
        self.conditions.push(new Condition({ level: options.level+1 }));
    };
    
    self.removeCondition = function(condition){
       self.conditions.remove(condition);
    };

    self.clear = function(){
        self.conditions([]);
    };

    self.afterRender = function(elem){
        
    };

    self.beforeLeave = function(elem){
        
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

    self.expression = ko.computed(function(){
        var expression = '';
        var innerGroups = self.conditions();
        _.each(innerGroups, function(gr,index){
            expression = expression + ((index === 0)? gr.expression() : ' ' + gr.logic() + ' ' + gr.expression());
        });
        
        return expression;
    });
};

var Selection = function(options){
    var self = this;
    self.level = options.level;
    self.renderType = options.renderType;
    self.logic = ko.observable('+');
    self.selections = ko.observableArray();
    self.aliasName = ko.observable();
    self.groupBy = ko.observable();
    self.perc = ko.observable();
    self.selectedProp = ko.observable();
    self.addSelection = function(){
        self.selections.push(new Selection({level:options.level+1, renderType: 'childSelection'}));
    };
    
    self.removeSelection = function(selection){
       self.selections.remove(selection);
    };

    self.showPercentChange = ko.computed(function(){
        if(self.renderType === 'topSelection' && drata.global.trackingChartTypes.indexOf(drata.dashboard.widgetEditor.segment.chartType()) > -1){
            return true;
        }
        else{
            self.perc(false);
            return false;
        }
    });

    self.isComplex = ko.computed(function(){
        return self.selections().length > 0;
    });

    self.showComplex = ko.observable(false);
    
    self.hideComplex = ko.computed(function(){
        return !self.showComplex();
    });

    //self.renderType = renderType;
    self.toggleComplex = function(){
        self.showComplex(!self.showComplex());
        if(self.showComplex() && !self.isComplex()){
            var selectedProp = self.selectedProp();
            if(selectedProp){
                self.selections.push(new Selection({ level:options.level+1, model: { selectedProp:selectedProp }, renderType: 'childSelection' }));
            }
            self.selectedProp(undefined);
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
        self.selectedProp.isModified(false);
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
        self.perc(m.perc);
        self.selectedProp(m.selectedProp);
        self.selections(ko.utils.arrayMap(
            m.groups,
            function(groupModel) {
                return new Selection({ level: options.level+1, model: groupModel, renderType: 'childSelection' }); 
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
            isComplex : self.isComplex(),
            perc: self.perc()
        };
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
                return options.renderType === 'topSelection' && self.isComplex();
            }
        }
    });

    options.model && self.prefill(options.model);
};

var SelectionGroup = function(options){
    var self = this;
    self.items = ko.observableArray();
    self.addItem = function(){
        self.items.push(new Selection({ level: options.level+1, model: undefined, renderType: 'topSelection' }));
    };
    
    self.removeItem = function(item){
       self.items.remove(item);
    };
    
    self.prefill = function(model){
        if(model.length === 0){
            self.items([]);
            self.addItem();
            return;
        }
        self.items(ko.utils.arrayMap(
            model,
            function(sel) {
              return new Selection({ level: options.level+1, model: sel, renderType: 'topSelection' });
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
                exp = drata.utils.format(gr.isComplex() ? '<em>{0}</em>{1}' : '<em>{0}</em>({1})', gr.groupBy(), exp); 
            }
            expressions.push(exp);
        });
        
        return 'Select ' + expressions.join(', ');
    });
};
