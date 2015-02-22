
var utils = require('../utils/utils');

var getProperties = function(segment){
    var ret = {};
    var selectionProperties = utils.getSelectionProperties(segment);
    
    selectionProperties.forEach(function(sel){
        ret[sel] = 1;
    });

    ret['_id'] = 0;
    return ret;
};


var getQuery = function(segment){
    var query = segment.group ? getMongoConditions(segment.group) : {};
    
    if(segment.dataFilter.dateProp){
        query[segment.dataFilter.dateProp] = query[segment.dataFilter.dateProp] || {};
        if(segment.dataFilter.from && !query[segment.dataFilter.dateProp]['$gte']){
            query[segment.dataFilter.dateProp]['$gte'] = utils.getDateFromTimeframe(segment.dataFilter.from);
        }
        if(segment.dataFilter.to && !query[segment.dataFilter.dateProp]['$lte']){
            query[segment.dataFilter.dateProp]['$lte'] = utils.getDateFromTimeframe(segment.dataFilter.to);
        }
    }
    
    return query;
};

var getMongoConditions = function(conditions){
    if(!conditions || conditions.length === 0)
        return {};
    var result = getMongoCondition(conditions[0]);
    
    var fl = undefined;

    for(var i=1;i<conditions.length;i++){
        var c = conditions[i];
        var logic = '$'+ c.logic;
        if(logic !== fl){
            var x = utils.clone(result);
            result = {};
            result[logic] = [];
            result[logic].push(x);
        }
        result[logic].push(getMongoCondition(c));
        fl = logic;
    }
    return result;
};

var getMongoCondition = function(c){
    if(!c.isComplex){
        var a = {}, b = {}, val;
        switch(c.valType){
            case 'date':
                val = new Date(c.value);
            break;
            case 'numeric':
                val = +c.value;
            break;
            case 'bool':
                val = c.value == 'true' || c.value == '1' || c.value === true;
            break;
            case 'string':
                val = c.value + '';
            break;
            default:
                val = c.value;
        }
        if(c.selection.isComplex){
                a['$where'] = _mongoSelectExpression(c.selection, false) + ' ' + c.operation + ' ' + val;
            }
            else{
                switch(c.operation){
                    case '=':
                        b = val;
                        break;
                    case 'exists':
                        b[utils.symbolMap[c.operation].mongo] = true;
                        break;
                    default :
                        b[utils.symbolMap[c.operation].mongo] = val;
                        break;
                }
                a[c.selection.selectedProp] = b;
            }
        return a;
    }
    else {
       return getMongoConditions(c.groups);
    }
};

var _mongoSelectExpression = function(selection, includeBracket){
    var expression = '';
    
    if(!selection.isComplex){
        return 'obj.' + selection.selectedProp;
    }

    selection.groups.forEach(function(sel,index){
        expression = expression + ((index === 0)? _mongoSelectExpression(sel, true) : ' ' + sel.logic + ' ' + _mongoSelectExpression(sel, true));
    });

    if(includeBracket) expression = '(' + expression + ')';
    return expression;
};

var getwidgetListMongoQuery = function(model){
    if(!model || Object.keys(model).length === 0) return {};
        var q = {},x = {}, condition;
        q['$and'] = [];
        for (var key in model) {
            if(model.hasOwnProperty(key)){
                x = {};
                condition = model[key];
                x[condition.property] = {};
                x[condition.property][condition.operator] = condition.value;
                q['$and'].push(x);
            }
        }
        // _.each(model, function(condition){
        //     x = {};
        //     x[condition.property] = {};
        //     x[condition.property][condition.operator] = condition.value;
        //     q['$and'].push(x);
        // })
        return q;
};

exports.getQuery = getQuery;
exports.getProperties = getProperties;