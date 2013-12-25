

var Segmentor = function(){
    var self = this;
    self.group = ko.observable(new Group({}));
    self.properties = ko.observableArray(['a', 'b', 'c']);
    self.operations = ko.observableArray(['>', '<', '=', 'exists']);
    self.logics = ko.observableArray(['and', 'or']);
    self.jsonFormattedInput = ko.observable();
    self.jsonFormattedOutput = ko.observable();
    self.jsonFormattedGroups = ko.observable();
    self.processConditioner = function(){

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
    }
};

var Condition = function(options){
    var self = this;
    self.prop = ko.observable(options.prop);
    self.operation = ko.observable(options.operation);
    self.value = ko.observable(options.value);
    self.logic = ko.observable(options.logic || 'and');
};

var Group = function(options){
    var self = this;
    self.conditions = ko.observableArray(options.conditions || []);
    self.logic = ko.observable('and');
    self.groups = ko.observableArray([]);

    self.addGroup = function(){
        self.groups.push(new Group({parent:self}));
    };
    
    self.removeGroup = function(group){
       self.groups.remove(group);
    };

    self.addCondition = function(){
        self.conditions.push(new Condition({}));
    };
    
    self.removeCondition = function(condition){
        self.conditions.remove(condition);
    };

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
            result = this.calc(result, boolValue.logic, nextValue.value);
        };
        var returnValue = {
            value : result,
            logic : boolValues[boolValues.length-1].logic
        };
        return returnValue;
    },
    processConditions : function(obj, conditions){
        var boolValues = [];
        var self = this;
        _.each(conditions, function(condition){
            boolValues.push({
                value : self.calc(obj[condition.prop], condition.operation, condition.value),
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
        var boolValues = [];
        group.conditions.length > 0 && boolValues.push(this.processConditions(obj, group.conditions));
        group.groups.length > 0 && boolValues.push(this.processGroups(obj, group.groups));
        if (boolValues.length === 0){
            return {value : true};
        }
        
        var returnValue = this.applyOperations(boolValues);
        
        console.log('group:');
        console.log(returnValue);
        return returnValue;
    }
}