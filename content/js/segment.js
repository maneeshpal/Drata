

var Segmentor = function(){
    var self = this;
    self.group = ko.observable(new Group({groupType: 'conditions'}));
    self.selectionGroups = ko.observableArray([new Group({groupType: 'selections'})]);
    self.properties = ko.observableArray(['a', 'b', 'c']);
    self.conditionalOperations = ko.observableArray(['>', '<', '=', 'exists']);
    self.arithmeticOperations = ko.observableArray(['+', '-', '*','/']);
    self.logics = ko.observableArray(['and', 'or']);
    self.jsonFormattedInput = ko.observable();
    self.jsonFormattedOutput = ko.observable();
    self.jsonFormattedGroups = ko.observable();
    
    self.addSelectionGroup = function(){
        self.selectionGroups.push(new Group({groupType: 'selections'}));
    };
    self.removeGroup = function(group){
       self.selectionGroups.remove(group);
    };
    self.processConditionsSection = function(){
        var data = [{
            a : 10,
            b : 20,
            c : 30
        }];
        self.jsonFormattedInput(JSON.stringify(data, null, '\t'));
        var jsGroup = ko.toJS(self.group);
        self.jsonFormattedGroups(JSON.stringify(jsGroup, null, '\t'));

        var filteredData = data.filter(function(obj, index){
            console.log('prop: ' + index);
            var result = Conditioner.processGroup(obj, jsGroup);
            return result.value;
        });
        self.jsonFormattedOutput(JSON.stringify(filteredData, null, '\t'));
    };
    self.processSelectionsSection = function(){
        var data = [{
            a : 10,
            b : 20,
            c : 30
        }];
        self.jsonFormattedInput(JSON.stringify(data, null, '\t'));
        var result = [];
        var jsSelectionGroup = ko.toJS(self.selectionGroups);
        _.each(data, function(obj){
            _.each(jsSelectionGroup, function(group){
                result.push(Conditioner.processGroup(obj, group));
            });
        });
        
        self.jsonFormattedOutput(JSON.stringify(result, null, '\t'));
    }
};

var Condition = function(options){
    var self = this;
    self.prop = ko.observable(options.prop);
    self.operation = ko.observable(options.operation);
    self.value = ko.observable(options.value);
    self.logic = ko.observable(options.logic || 'and');
    self.conditionType = options.conditionType;
};

var Group = function(options){
    var self = this;
    self.groupType = options.groupType;
    self.conditions = ko.observableArray(options.conditions || []);
    self.logic = ko.observable((self.groupType === 'conditions')?'and':'+');
    self.groups = ko.observableArray([]);
    self.conditionTemplate = {name: (self.groupType === 'conditions')?'condition-template': 'operation-template', foreach: self.conditions};
    self.groupTemplate = {name: 'group-template', foreach: self.groups};
    self.selectionName = ko.observable();
    self.addGroup = function(){
        self.groups.push(new Group({groupType: self.groupType}));
    };
    
    self.removeGroup = function(group){
       self.groups.remove(group);
    };

    self.addCondition = function(){
        self.conditions.push(new Condition({
            logic : (self.groupType === 'conditions')? 'and' : '+',
            conditionType : self.groupType
        }));
    };
    
    self.removeCondition = function(condition){
        self.conditions.remove(condition);
    };
    self.groupTypeName = (self.groupType === 'conditions')? 'Condition Group' : 'Select';
    self.conditionTypeName = (self.groupType === 'conditions')? 'Add Condition' : 'Add selection';
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
        var self = this;
        _.each(conditions, function(condition){
            boolValues.push({
                value : (condition.conditionType === 'selections') ? obj[condition.prop]: self.calc(obj[condition.prop], condition.operation, condition.value),
                logic : condition.logic
            });
        });

        var returnValue = this.applyOperations(boolValues);
        
        console.log('conditions:');
        console.log(returnValue);
        return returnValue;
    },
    processSelections : function(){

    },
    processGroups : function(obj, groups){
        var boolValues = [];
        var self = this;
        _.each(groups, function(group){
            boolValues.push(self.processGroup(obj,group));
        });

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
    }
}