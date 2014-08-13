

var Segmentor = function(model){
    var self = this;
    self.propertyTypes = {};
    self.properties = ko.observableArray();

    self.level = 0;
    self.temp = ko.observable();
    self.outputData = ko.observable();
    self.conditionGroup = new ConditionGroup({ level: self.level + 1, model: undefined, renderType: 'Condition', propertyTypes: self.propertyTypes });
    self.selectionGroup = new SelectionGroup({ level: self.level, propertyTypes: self.propertyTypes });
    self.formErrors = ko.observableArray();
    
    self.groupData = ko.observable();
    self.dataFilter = new DataFilter();
    self.chartType = ko.observable();

    var compDataGroup, trackDataGroup, currentDataGroupTemplate;
    self.dataGroup = undefined;
    self.setPropertyTypes = function(propertyTypes){
        var propList = [];
        for(var prop in propertyTypes){
            if(propertyTypes.hasOwnProperty(prop)){
                propList.push(prop);
                self.propertyTypes[prop] = ko.observable(propertyTypes[prop]);  
            }
        }
        self.properties(propList);
    };
    
    self.dateProperties = ko.computed(function(){
        var ptypes = ko.toJS(self.propertyTypes);
        var props = self.properties();
        return props.filter(function(p){
            return ptypes[p] === 'date';
        })
    });

    self.nonDateProperties = ko.computed(function(){
        var ptypes = ko.toJS(self.propertyTypes);
        var props = self.properties();
        return props.filter(function(p){
            return ptypes[p] !== 'date';
        })
    });
    self.numericProperties = ko.computed(function(){
        var ptypes = ko.toJS(self.propertyTypes);
        var props = self.properties();
        return props.filter(function(p){
            return ptypes[p] === 'numeric';
        })
    });
    self.initialize = function(model, propertyTypes){
        model = model || {};
        self.setPropertyTypes(propertyTypes);
        self.conditionGroup.prefill(model.group || []);
        self.selectionGroup.prefill(model.selection || []);
        self.dataFilter.prefill(model.dataFilter || {});
        self.chartType(model.chartType);
        self.dataGroup && self.dataGroup.setProps(model.dataGroup || {});
        self.chartType.isModified(false);
    };
    
    self.dataGroupTemplate = ko.computed(function(){
        if(drata.global.trackingChartTypes.indexOf(self.chartType()) > -1){
            self.dataGroup =  compDataGroup || new TrackDataGroup({propertyTypes: self.propertyTypes});
            currentDataGroupTemplate = 'track-datagroup-template';
        }else{
            self.dataGroup =  trackDataGroup || new ComparisonDataGroup({propertyTypes: self.propertyTypes});
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
                return isNaN(+s.selectedProp) && self.propertyTypes[s.selectedProp]() !== 'numeric' && ['sum', 'avg', 'min', 'max'].indexOf(s.groupBy) > -1 ;
            }).map(function(s2){
                return s2.selectedProp;
            });
            if(l7.length > 0){
                errors.push('Error is selections: cannot perform <em>sum, avg, min, max </em> on non-numeric properties <em style="font-weight:bold">'+ l7.join(', ') +'</em>');
            }
        }

        //logic validation 8
        //any non numeric selection by value is invalid 
        if(selections.simple.length > 0){
            var l8 = selections.simple.filter(function(s){
                if(!isNaN(+s.selectedProp) && !self.propertyTypes[s.selectedProp]){
                    errors.push('Error is selections: numeric value cannot be used in a simple selection <em style="font-weight:bold">'+ s.selectedProp +'</em>');
                    return false;
                }
                return self.propertyTypes[s.selectedProp]() !== 'numeric' && s.groupBy === 'value';
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
                return isNaN(+s) && self.propertyTypes[s]() !== 'numeric';
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
                errors.push('Error in Selections and Grouping: When aggregations exist, <em>sum, avg, count </em> are expected in <em style="font-weight:bold">' + l2a.join(', ') + '</em>');
            }
        }else if(isTrackChart){
            var l2b  = segmentModel.selection.filter(function(s){
                return s.groupBy !== 'value';
            }).map(function(s2){
                return s2.selectedProp;
            });
            if(l2b.length > 0){
                errors.push('Error in Selections and Grouping: When aggregations don\'t exist, <em>sum, avg, count </em> are not allowed in <em style="font-weight:bold">' + l2b.join(', ') + '</em>');
            }

        }else{

            var l2c  = segmentModel.selection.filter(function(s){
                return s.groupBy === 'value';
            }).map(function(s2){
                return s2.selectedProp;
            });
            if(l2c.length > 0){
                errors.push('For this visualization, if no aggregation is specified, Selections cannot be of type <em style="font-weight:bold">value</em>');
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

var TrackDataGroup = function(){
    var self = this;    

    self.hasGrouping = ko.observable(false);
    self.groupByProp = ko.observable();

    self.xAxisType = ko.observable();
    self.timeseries = ko.observable();
    self.xAxisProp = ko.observable();
    self.timeseriesInterval = ko.observable();
    self.intervalOptions = ko.computed(function(){
        return self.xAxisType() !== 'date' ? []: ['1h', '5m','60s', '1d','1w', 'month', 'quarter', 'year'];
    });

    self.hasGrouping.subscribe(function(newValue){
        if(!newValue){
            self.groupByProp(undefined);
        }
    });

    self.properties = ko.computed(function(){
        return self.xAxisType() === 'date' ? segmentProcessor.segment.dateProperties() : segmentProcessor.segment.numericProperties();
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
    };
    self.getModel = function(){
        var dataGroupModel = ko.toJS(self);
        delete dataGroupModel.setProps;
        delete dataGroupModel.getModel;
        delete dataGroupModel.template;
        delete dataGroupModel.intervalOptions;
        delete dataGroupModel.properties;
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
            _required : function(){
                return self.timeseries();
            },
            intervalType : function(){
                return self.xAxisType();
            }
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

    self.groupByProp.subscribe(function(newValue){
        var newType = options.propertyTypes[newValue];
        self.groupByIntervalType(newType? newType() : 'unknown');
        self.groupByInterval(undefined);
        self.groupByInterval.isModified(false);
    });

    self.hasDivideBy = ko.observable(false);
    self.divideByProp = ko.observable();
    
    self.divideByIntervalType = ko.observable();

    self.divideByProp.subscribe(function(newValue){
        var newType = options.propertyTypes[newValue];
        self.divideByIntervalType(newType? newType() : 'unknown');
        self.divideByInterval(undefined);
        self.divideByInterval.isModified(false);
    });

    self.groupByIntervalOptions = ko.computed(function(){
        if(self.groupByIntervalType() !== 'date') return [];
        return ['1h', '5m','60s', '1d','1w', 'month', 'quarter', 'year'];
    });

    self.divideByIntervalOptions = ko.computed(function(){
        if(self.divideByIntervalType() !== 'date') return [];
        return ['1h', '5m','60s', '1d','1w', 'month', 'quarter', 'year'];
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
    };

    self.getModel = function(){
        var dataGroupModel = ko.toJS(self);
        delete dataGroupModel.setProps;
        delete dataGroupModel.getModel;
        delete dataGroupModel.groupByIntervalOptions;
        delete dataGroupModel.divideByIntervalOptions;
        delete dataGroupModel.errors;
        return dataGroupModel;
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
        groupingInterval: {
            _required : function(){
                return self.needsGroupByInterval();
            },
            intervalType : function(){
                return self.groupByIntervalType();
            }
        }
    });

    self.divideByInterval.extend({
        groupingInterval: {
            _required : function(){
                return self.needsDivideByInterval();
            },
            intervalType : function(){
                return self.divideByIntervalType();
            }
        }
    });
};

var DataFilter = function(){
    var self = this;
    self.min = ko.observable();
    self.max = ko.observable();
    self.minDate = ko.observable();
    self.maxDate = ko.observable();
    
    var slider;

    self.intervalType = ko.observable('static');

    self.intervalKind = ko.observable();
    
    self.dateProp = ko.observable().extend({
        required: {message: 'Enter your Date Property'}
    });

    var setSliderValues = function(options){
        if(slider){
            var bounds = drata.utils.getBounds(options.intervalKind);
            options.minMax = options.minMax || [];
            options.minMax[0] = options.minMax[0] === undefined ? Math.floor((bounds[1] - bounds[0])/3) : options.minMax[0];
            options.minMax[1] = options.minMax[1] === undefined ? bounds[1] : options.minMax[1];
            
            slider.slider( "option", "min", bounds[0]);
            slider.slider( "option", "max", bounds[1]);
            slider.slider( "option", "values", options.minMax);
            self.min(options.minMax[0]);
            self.max(options.minMax[1]);
        }
    };
    
    self.intervalKind.subscribe(function(newValue){
        setSliderValues({intervalKind: newValue});
    });
    self.intervalType.subscribe(function(newValue){
        slider && slider.slider(newValue === 'dynamic'? 'enable': 'disable');
    });
    
    self.getModel = function(){
        return {
            intervalKind: self.intervalKind(),
            intervalType: self.intervalType(),
            min: (self.intervalType() == 'static') ? self.minDate() : self.min(),
            max: (self.intervalType() == 'static') ? self.maxDate() :self.max(),
            dateProp:self.dateProp()
        }
    };

    self.prefill = function(model){
        self.intervalType(model.intervalType || 'static');
        self.intervalKind(model.intervalKind);
        if(model.intervalType === 'static'){
            model.min && self.minDate(model.min);
            model.max && self.maxDate(model.max);
        }
        else if(model.intervalType === 'dynamic'){
            setSliderValues({
                intervalKind: model.intervalKind,
                minMax: [model.min, model.max]
            })
            //model.min !== undefined && self.min(model.min);
            //model.max !== undefined && self.max(model.max);
            // if(model.min !== undefined && model.max !== undefined){
            //     slider.slider( "option", "values", [model.min, model.max]); 
            // }
        }
        self.dateProp(model.dateProp);
        self.dateProp.isModified(false);
    };

    self.expression = ko.computed(function(){
        var range = drata.utils.getDateRange(self.getModel());
        return drata.utils.format('{2} from : {0} to {1}', (range.min ? drata.utils.formatDate(range.min) : '__'),(range.max ? drata.utils.formatDate(range.max) : '__'), self.dateProp() || '* Date Property');
        
    }).extend({ throttle: 500 });

    var setupSlider = function(){
        slider = $("#myslider").slider({
            range: true,
            slide: function( event, ui ) {
                self.min(ui.values[0]);
                self.max(ui.values[1]);
            }
        });
    };
    self.showDatePicker = function(val){
        if(self.intervalType() !== 'static') return;
        if(val === 'start'){
            self.startDp && self.startDp.datepicker('show');
        }
        else if(val === 'end'){
            self.endDp && self.endDp.datepicker('show');
        }
    };

    var setupDatePicker = function(){
        self.startDp = $( "#from" ).datepicker({
            defaultDate: "-1m",
            changeMonth: true,
            changeYear: true,
            numberOfMonths: 1,
            maxDate: new Date(),
            onClose: function( selectedDate ) {
                $( "#to" ).datepicker( "option", "minDate", selectedDate );
            }
        });
        self.endDp = $( "#to" ).datepicker({
            changeMonth: true,
            changeYear: true,
            numberOfMonths: 1,
            onClose: function( selectedDate ) {
                $( "#from" ).datepicker( "option", "maxDate", selectedDate );
            }
        });
    };

    self.afterRender = function(elem){
        setupSlider();
        setupDatePicker();
    };

    self.minDate.extend({
        validDataFilterDate : {
            message: 'Invalid Date',
            onlyIf: function(){
                return self.intervalType() == 'static';
            }
        }
    });

    self.intervalKind.extend({
        required : {
            message: 'Please select Interval',
            onlyIf: function(){
                return self.intervalType() == 'dynamic';
            }
        }
    });

    self.maxDate.extend({
        validDataFilterDate : {
            message: 'Invalid Date',
            onlyIf: function(){
                return self.intervalType() == 'static';
            }
        }
    });
};

var Condition = function(options){
    var self = this;
    self.level = options.level;
    self.logic = ko.observable('and');
    self.selection = new Selection({ level: options.level, renderType: 'topCondition', propertyTypes: options.propertyTypes });
    self.operation = ko.observable('=');
    self.value = ko.observable();
    self.conditions = ko.observableArray();

    var _valType = ko.observable('unknown');
    //propertytype
    self.valType = ko.computed({
        read: function(){
            if(self.selection.isComplex())
                return;

            var newType = options.propertyTypes[self.selection.selectedProp()];
            return newType? newType() : _valType();
        },
        write: function(newValue){
            _valType(newValue);
            
            if(self.selection.isComplex())
                return;

            var propExists = options.propertyTypes[self.selection.selectedProp()] !== undefined;
            if(propExists) options.propertyTypes[self.selection.selectedProp()](newValue);
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
        self.conditions.push(new Condition({ level:options.level+1,onExpand: options.onExpand, propertyTypes: options.propertyTypes }));
    };
    
    self.addComplexCondition = function(){
        self.conditions.push(new Condition({ level:options.level+1,onExpand: options.onExpand, expand:true, propertyTypes: options.propertyTypes }));
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
                return new Condition({ level:options.level+1, model:groupModel, onExpand: options.onExpand, propertyTypes: options.propertyTypes }); 
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
            value : self.value(),
            valType: self.valType()
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
    options.expand && self.expand();
};

var ConditionGroup = function(options){
    var self = this;
    self.level = options.level;
    self.conditions = ko.observableArray();
    self.trace = ko.observableArray();
    self.currentBinding = ko.observable(self);
    self.boldExpression = ko.observable(false);
    self.currentBinding.subscribeChanged(function(newValue, oldValue){
        newValue.boldExpression(true);
        oldValue.boldExpression(false);
    });
    var goingback = false;
    self.boldExpression = ko.observable(false);
   
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
              return new Condition({ level:options.level+1,model: cond, onExpand:self.onExpand.bind(self), propertyTypes: options.propertyTypes });
            }
        ));
    };
    self.addCondition = function(){
        self.conditions.push(new Condition({ level: options.level+1, onExpand: self.onExpand.bind(self), propertyTypes: options.propertyTypes }));
    };
    self.addComplexCondition = function(){
        self.conditions.push(new Condition({ level:options.level+1, onExpand: self.onExpand.bind(self), expand:true, propertyTypes: options.propertyTypes }));
    };
    self.removeCondition = function(condition){
       self.conditions.remove(condition);
    };

    self.clear = function(){
        self.conditions([]);
    };

    self.afterRender = function(elem){
        _.delay(function(){
            $(elem).addClass(goingback?'enter-no-tr':'enter');
            goingback = false;
        }, goingback ? 100:10);
        
    };

    self.beforeLeave = function(elem){
        $(elem).hide().removeClass('exit').show().removeClass('enter');
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
        var isValid = !condition.isComplex() || condition.isValidCondition();
        if(isValid){
            goingback = true;
            $('#conditionWrapper').removeClass('enter-no-tr');
            _.delay(function(){
                $('#conditionWrapper').removeClass('enter');
                _.delay(function(){
                    var prev = self.trace.pop();
                    self.currentBinding(prev);
                },100);                
            }, 10);            
        }
    };
    self.goBackTopLevel = function(){
        self.trace([]);
        goingback = true;
        $('#conditionWrapper').removeClass('enter-no-tr');
        _.delay(function(){
            $('#conditionWrapper').removeClass('enter');
            _.delay(function(){
                self.currentBinding(self);
            },100);                
        }, 10);
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
        if(self.renderType === 'topSelection' && drata.global.trackingChartTypes.indexOf(segmentProcessor.segment.chartType()) > -1){
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

var DataRetriever = {
    getData : function(model,callback){
        var postData = {
            chartType: model.segment.chartType,
            selection: model.segment.selection,
            dataGroup: model.segment.dataGroup,
            dataFilter: model.segment.dataFilter,
            group: model.segment.group,
            applyClientAggregation: model.applyClientAggregation
        };

        drata.apiClient.getData(postData, {dataSource: model.dataSource, database: model.database, collectionName: model.collectionName}, function(response){
            if(response.success && model.applyClientAggregation){
                var result = response.result;
                response.result = Conditioner.getGraphData(model.segment, response.result);
            }
            callback && callback(response);
        });
    }
};

var Conditioner = {
    calc : function(left, operation, right, type){
        if(left === undefined) return right;
        if(right === undefined && operation !== 'exists') return left;

        if(type === 'numeric') right = +right;
        if(type === 'bool') right = right == 'true';

        
        var hasError = (drata.global.numericOperations.indexOf(operation) > -1 && (isNaN(+left) || isNaN(+right)));
        var result;
        
        if(!hasError){
            result = drata.utils.calc(left, operation, right);
        }

        if(hasError || isNaN(result)){
            if(drata.global.numericOperations.indexOf(operation) > -1){
                throw 'Invalid arithmetic operation: <strong>( '  + left + ' ' + operation + ' ' + right + ' )</strong>';
            }
            else{
                throw "There seems to be issue with your data. Please check your Selections."
            }
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
    hasProperty: function(name){
        return this.propertyTypes[name];
    },
    processSimple : function(obj, group){
        var complexValue, complexType;
        if(group.groupType === 'selection'){
            //perform arithmetic operation on selections
            complexValue = isNaN(+group.selectedProp) ? obj[group.selectedProp] : +group.selectedProp;
        }
        else{
            if(group.selection.isComplex){
                complexType = this.processGroup(obj, group.selection);
                complexValue = this.calc(complexType.value, group.operation, group.value, group.valType);
            }
            else{
                complexValue = this.calc(obj[group.selection.selectedProp], group.operation, group.value, group.valType);
            }
        }
        
        if(isNaN(+complexValue)){
            throw "Non numeric value detected: " + complexValue;
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
            var ret = this.groupByInterval(dataItem, dataGroup, selection);
            returnGroups.push({
                key: groupName,
                values : ret
            });
        }.bind(this));
        return returnGroups;
    },
    groupByInterval : function(data, dataGroup, selection){
        var ret = [], yValue;
        if(selection.isComplex && selection.groupBy === 'count')
            throw "count not allowed for complex selections.";

        if(dataGroup.timeseries){
            var intervalGroup = drata.utils.divideDataByInterval({
                data: data,
                intervalType: dataGroup.xAxisType,
                interval: dataGroup.timeseriesInterval,
                property: dataGroup.xAxisProp
            });
            
            _.each(intervalGroup, function(gi, time){
                ret.push({
                    x:  +time, //fix numeric. This can be month/quarter etc, not just numeric
                    y:  this.reduceData(gi,selection)
                });
            }.bind(this));
        }
        else {
            _.each(data, function(item){
                yValue = this.processGroup(item,selection).value;

                if(item.hasOwnProperty(selection.selectedProp) || selection.isComplex) {
                    ret.push({
                        x: (dataGroup.xAxisType === 'date') ? +new Date(item[dataGroup.xAxisProp]) : item[dataGroup.xAxisProp],
                        y: yValue
                    });
                }
            }.bind(this));
        }
        return ret;
    },
    filterData : function(data, segment){
        var range = drata.utils.getDateRange(segment.dataFilter);
        
        if(!data || !data.length || !segment.dataFilter) return data;
        if (!segment.group || segment.group.length === 0) return data;
        return data.filter(function(item, index){
            if(item.timestamp < range.min || item.timestamp > range.max) return false;
            return this.processGroups(item, segment.group).value;
        }.bind(this));
    },
    getGraphData: function(segmentModel, inputData){
        //console.time('raw_to_chart_data:' + segmentModel.chartType);
        if(segmentModel.selection.length === 0)
            throw "Selections required";
        this.propertyTypes = segmentModel.propertyTypes;
        var returnData;
        if(drata.global.trackingChartTypes.indexOf(segmentModel.chartType) > -1){
            returnData = this.getLineCharData(segmentModel, inputData);
        }else{
            returnData = this.getPieData(segmentModel, inputData);
        }
        //window.debug.chartdata = returnData;
        //console.timeEnd('raw_to_chart_data:' + segmentModel.chartType);
        return returnData;
    },
    getLineCharData: function(segmentModel, inputData){
        var result = [];
        var groupCounter = 0;
        var groupedData;
        
        if(segmentModel.dataGroup.hasGrouping){
            groupedData = _.groupBy(inputData, function(item){return item[segmentModel.dataGroup.groupByProp]});
        }
        _.each(segmentModel.selection, function(sel){
           var values;
            if(segmentModel.dataGroup.hasGrouping){
                values = this.processDataGroups(groupedData, segmentModel.dataGroup, sel);
            }
            else{
                values = this.groupByInterval(inputData, segmentModel.dataGroup, sel);
            }
            //here sort the values by x
            if(segmentModel.dataGroup.xAxisType === 'currency' || segmentModel.dataGroup.xAxisType === 'numeric'){
                values.sort(function(x,y){
                    return x.x - y.x;
                });
            }
            if(sel.perc){
                var prev = values[0].y, temp;
                values = values.map(function(v){
                    temp = v.y;
                    v.y = drata.utils.percChange(v.y, prev);
                    prev = temp;
                    return v;
                })
            }
            result.push({
                key: this.getSelectionKeyName(sel),
                values: values
            });
        }.bind(this));

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
            throw "Count Not allowed for complex selections.";

        var ret = _.reduce(objArray, function(previous, current){ 
            var numval;
            if(selection.isComplex){ //complex selection. so we need to process it.
                var temp = Conditioner.processGroup(current,selection);
                numval = temp.value;
            }
            else if(selection.groupBy === 'min'){
                return previous < current[selection.selectedProp] ? previous : current[selection.selectedProp];
            }
            else if(selection.groupBy === 'max'){
                return previous < current[selection.selectedProp] ? current[selection.selectedProp] : previous;
            }
            else if(selection.groupBy === 'count'){
                numval = current[selection.selectedProp]? 1 : 0;
            }
            else if(selection.groupBy === 'sum' || selection.groupBy === 'avg'){ // sumby
                if(isNaN(+current[selection.selectedProp]))
                    throw 'Attempt to calculate <em>' +selection.groupBy+ '</em> of property: <strong>' + selection.selectedProp + '</strong> with non-numeric value "' + current[selection.selectedProp] + '" detected';
                numval = +current[selection.selectedProp] || 0;
            }
            else{
                throw 'For this visualization, you need Your selections should have <em>sum</em>,<em>count</em> or <em>avg</em>';
            }
            return previous + numval; 
        }, (!selection.isComplex && objArray.length > 0 && (selection.groupBy === 'min' || selection.groupBy === 'max'))? +objArray[0][selection.selectedProp] : 0);

        return selection.groupBy === 'avg' ? ret/objArray.length : ret;
    },
    getSelectionKeyName: function(sel){
        return drata.utils.format('{0}{1}_{2}', sel.perc ? '%_' : '', sel.groupBy, sel.isComplex ? sel.aliasName : sel.selectedProp);
    },
    getPieData: function(segmentModel, inputData){
        var response = [];
        var groupCounter = 0;
        var result = [];
        var topLevelResponse = [];
        
        var formattingTypes = {
            date: function(name, interval){
                var timeFormat;
                switch(interval){
                    case 'month':
                        timeFormat = d3.time.format('%b %Y');
                        break;
                    case 'quarter':
                        timeFormat = function(d){
                            return d.getFullYear() + ' Q ' + (Math.floor(d.getMonth() / 3) + 1);
                        }
                        break;
                    case 'year':
                        timeFormat = d3.time.format('%Y');
                        break;
                    default:
                        timeFormat = d3.time.format('%d.%b.%y %H:%M');
                }
                return timeFormat(new Date(+name));
            },
            numeric: function(name){
                return d3.format('.3s')(+name);
            },
            string: function(name){
                return name;
            }
        };

        if(segmentModel.dataGroup.hasGrouping){
            var groupedData = drata.utils.divideDataByInterval({
                data: inputData,
                property: segmentModel.dataGroup.groupByProp,
                interval: segmentModel.dataGroup.groupByInterval,
                intervalType: segmentModel.dataGroup.groupByIntervalType
            });
            
            if(!segmentModel.dataGroup.hasDivideBy){
                response = [];
                _.each(segmentModel.selection, function(sel){
                    result = [];
                    _.each(groupedData, function(groupedDataItem, groupName){
                        var val = this.reduceData(groupedDataItem,sel);
                        groupName = formattingTypes[segmentModel.dataGroup.groupByIntervalType](groupName, segmentModel.dataGroup.groupByInterval);
                        
                        val >= 0 && result.push({
                            key: groupName,
                            value: val
                        });
                    }.bind(this));
                    
                    response.push({
                        key : this.getSelectionKeyName(sel),
                        groupLevel: 'B',
                        values: result
                    });
                }.bind(this));

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
                        if(sel.groupBy === 'value'){
                            throw "When using <em>GroupBy</em>, you should specify <em>sum</em>, <em>count</em> or <em>avg</em> on selection. Selecting value is not permitted";
                        }

                        if(sel.isComplex && sel.groupBy === 'count'){
                            throw '<em>Count</em> not allowed for Complex Selection : ' + sel.aliasName ;
                        }

                        var divData = drata.utils.divideDataByInterval({
                            data: groupedDataItem,
                            property: segmentModel.dataGroup.divideByProp,
                            interval: segmentModel.dataGroup.divideByInterval,
                            intervalType: segmentModel.dataGroup.divideByIntervalType
                        });

                        _.each(divData, function(value, name){
                            name = formattingTypes[segmentModel.dataGroup.divideByIntervalType](name, segmentModel.dataGroup.divideByInterval);
                            result.push({
                                key: name,
                                value: this.reduceData(value, sel)
                            });
                        }.bind(this));

                        response.push({
                            key : formattingTypes[segmentModel.dataGroup.groupByIntervalType](groupName, segmentModel.dataGroup.groupByInterval),
                            groupLevel: 'B',
                            values: result
                        });
                    }.bind(this));

                    topLevelResponse.push({
                        key : this.getSelectionKeyName(sel),
                        groupLevel : 'A',
                        values: response
                    });
                }.bind(this));
            }
        }
        else{
            var toplevelkey = 'xxxx';
            result = [];
            
            _.each(segmentModel.selection, function(sel){
                var val = this.reduceData(inputData, sel);
                result.push({
                    key: this.getSelectionKeyName(sel),
                    value: val
                });
            }.bind(this));

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