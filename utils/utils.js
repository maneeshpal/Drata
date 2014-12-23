
var _ = require('underscore');

Date.prototype.format = function(f){
    return format(f, this.getFullYear(), this.getMonth() + 1, this.getDate(), this.getHours(), this.getMinutes(), this.getSeconds());
}

Date.prototype.getWeek = function() {
    var onejan = new Date(this.getFullYear(),0,1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
}

// Date.prototype.firstDayOfWeek = function(){
//     var _x = new Date(this);
//     var day = _x.getDate() - _x.getDay();
//     _x.setDate(day);
//     return new Date(_x.toDateString());
// }

var firstDayOfWeek = function(d){
    var _x = new Date(d);
    var day = _x.getDate() - _x.getDay();
    _x.setDate(day);
    return new Date(_x.toDateString());
}

var getType = function(val){
    if(_.isNumber(val))
        return 'numeric';
    if(_.isString(val))
        return 'string';
    if(_.isBoolean(val))
        return 'bool';
    if(_.isDate(val))
        return 'date';

    return 'unknown';
};

var getUniqueProperties = function(data){
    if(!data || !data.length) return {};
    var flattened = data.map(function(d){
        return flatten(d);  
    });
    var propertyTypes = {};
    var max = Math.min(flattened.length -1, 40);
    for (var i = max; i >= 0; i--) {
        var dataValue = flattened[i];
        for (var property in dataValue) {
            if(!propertyTypes[property]){
                propertyTypes[property] = [];
            }
            propertyTypes[property].push(getType(dataValue[property]));
            //(dataValue.hasOwnProperty(property) && returnArr.indexOf(property) === -1) && returnArr.push(property);
        }
    };
    var uniqueTypes = {};
    for (var property in propertyTypes) {
        var counts = _.countBy(propertyTypes[property], function(pType){
            return pType;
        });
        var returnType = 'unknown', tempCount = 0;
        for(var i in counts){
            if(counts.hasOwnProperty(i) && i !== 'unknown'){
                if(tempCount < counts[i]){
                    returnType = i;
                    tempCount = counts[i];
                }    
            }
        }
        uniqueTypes[property] = returnType;
    }
   
    return uniqueTypes;
};

var flatten = function(data) {
    var result = {};
    function recurse (cur, prop) {
    	if(prop !== '_id'){
	        if (Object(cur) !== cur || _.isDate(cur)) {
	            result[prop] = cur;
	        } else if (Array.isArray(cur)) {
	        	//exclude arrays
	            //  for(var i=0, l=cur.length; i<l; i++)
	            //      recurse(cur[i], prop + "[" + i + "]");
	            // if (l == 0)
	            //     result[prop] = [];
	        } else {
	            var isEmpty = true;
	            for (var p in cur) {
	                isEmpty = false;
	                p !== '_id' && recurse(cur[p], prop ? prop+"."+p : p);
	            }
	            if (isEmpty && prop)
	                result[prop] = {};
	        }
    	}
    }
    recurse(data, "");
    return result;
 };

var mongoSymbolMap = {
    '<': '$lt',
    '>': '$gt',
    '<=': '$lte',
    '>=': '$gte',
    '!=': '$ne',
    'exists': '$exists'
};

var getMongoQuery = function(segment){
    var query = segment.group ? getMongoConditions(segment.group) : {};
    
    if(segment.dataFilter.dateProp){
        query[segment.dataFilter.dateProp] = {};
        if(segment.dataFilter.from){
            query[segment.dataFilter.dateProp]['$gte'] = getDateFromTimeframe(segment.dataFilter.from);
        }
        if(segment.dataFilter.from){
            query[segment.dataFilter.dateProp]['$lte'] = getDateFromTimeframe(segment.dataFilter.to);
        }
    }
    
    return query;
};

var getMongoConditions = function(conditions){
    if(!conditions || conditions.length === 0)
		return {};
    var result = getMongoCondition(conditions[0]);
    var fl = undefined;
    //result[fl] = [];
    for(var i=1;i<conditions.length;i++){
        var c = conditions[i];
        var logic = '$'+ c.logic;
        if(logic !== fl){
            var x = clone(result);
            result = {};
            result[logic] = [];
            result[logic].push(x);
        }
        result[logic].push(getMongoCondition(c));
        fl = logic;
    }
    return result;
};

var getwidgetListMongoQuery = function(model){
    if(!model || Object.keys(model).length === 0) return {};
        var q = {},x = {};
        q['$and'] = [];
        _.each(model, function(condition){
            x = {};
            x[condition.property] = {};
            x[condition.property][condition.operator] = condition.value;
            q['$and'].push(x);
        })
        return q;
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
                        b[mongoSymbolMap[c.operation]] = true;
                        break;
                    default :
                    	b[mongoSymbolMap[c.operation]] = val;
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
    _.each(selection.groups, function(sel,index){
        expression = expression + ((index === 0)? _mongoSelectExpression(sel, true) : ' ' + sel.logic + ' ' + _mongoSelectExpression(sel, true));
    });
    if(includeBracket) expression = '(' + expression + ')';
    return expression;
};

var clone = function(obj) {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
};

var getValidDate = function(dateVal, isUs) {
    var matches = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/.exec(dateVal);
    if (matches == null) return undefined;
    
    var d = isUs? matches[2]:matches[1];
    var m = isUs? matches[1]-1:matches[2]-1;
    var y = matches[3];
    var composedDate = new Date(y, m, d);
    return (composedDate.getDate() == d &&
        composedDate.getMonth() == m &&
        composedDate.getFullYear() == y) ? composedDate : undefined;
};

var hmsConv = {
    h: { label: 'hours', labelSingular: 'hour', value: 60 * 60 * 1000 },
    m: { label: 'minutes', labelSingular: 'minute', value: 60 * 1000 },
    s: { label: 'seconds', labelSingular: 'second', value: 1000 },
    d: { label: 'days', labelSingular: 'day', value: 60 * 60 * 1000 * 24 },
    y: { label: 'years', labelSingular: 'year', value: 60 * 60 * 1000 * 24 * 365 },
    w: { label: 'weeks', labelSingular: 'week', value: 60 * 60 * 1000 * 24 * 7 }
};

var parseTime = function(input){
    if(!input || !isNaN(+input)) return { ms: null, expression:'' };

    var hms = input.split(/[^a-z]/gi).filter(function(j){
        return !!j && hmsConv.hasOwnProperty(j)
    });
    
    var num = input.split(/\D/g).map(function(i){
        return +i
    }).filter(function(j){
        return !!j
    });
    
    if(hms.length <= 0 || hms.length !== num.length) return { ms: null, expression:'' };
    var output = 0, expression = [];
    
    for(var i=0;i<hms.length;i++){
        output = output + hmsConv[hms[i]].value * num[i];
        expression.push(format('{0} {1}', num[i], (num[i] > 1 ? hmsConv[hms[i]].label: hmsConv[hms[i]].labelSingular)));
    }
    return {ms : output, expression: expression.join(',')};
};

var getDateFromTimeframe = function(timeframe){
    var d = new Date(timeframe);
    if(+d) return new Date(d);
    var ms = parseTime(timeframe).ms || 0;
    return new Date(+new Date() - ms);
};

var getMongoProperties = function(segment){
    var ret = {};
    var selectionProperties = getSelectionProperties(segment);
    _.each(selectionProperties, function(sel){
        ret[sel] = 1;
    });
    ret['_id'] = 0;
    return ret;
};

var getSelectionProperties = function(segment){
    var sp = _getBaseSelectionProperties(segment.selection);
    if(segment.dataGroup.hasGrouping && sp.indexOf(segment.dataGroup.groupByProp) === -1) sp.push(segment.dataGroup.groupByProp);
    if(segment.dataGroup.hasDivideBy && sp.indexOf(segment.dataGroup.divideByProp) === -1) sp.push(segment.dataGroup.divideByProp);
    if(segment.dataGroup.xAxisProp && sp.indexOf(segment.dataGroup.divideByProp) === -1) sp.push(segment.dataGroup.xAxisProp); 
    return sp;
};

var _getBaseSelectionProperties = function(selections){
    var ret = [];
    _.each(selections, function(sel){
        if(!sel.isComplex){
            ret.push(sel.selectedProp.split('.')[0]);
        }
        else {
            innerSel = _getBaseSelectionProperties(sel.groups);
            ret = ret.concat(innerSel);
        }
    });
    return _.uniq(ret);
};

var toArray = function(args,ix){
    return Array.prototype.slice.call(args,ix || 0); 
};

var format = function(format /*, ...replacements*/) {
    var replacements = toArray(arguments, 1);
    for (var i = 0, j = replacements.length; i < j; i++) {
        format = format.replace(new RegExp('\\{' + (i) + '\\}', 'g'), replacements[i]);
    }
    return format;
};

var percChange = function(curr, prev){
    if(prev === 0 && curr === 0) return 0;
    if(prev === 0) return 100;
    return +(((curr * 100)/prev - 100).toFixed(2));
};

var getPercentageChange = function(arr, prop){
    if(!arr || arr.length === 0) return arr;

    var prev = arr[0][prop], temp;
    return arr.map(function(v){
        temp = v[prop];
        v[prop] = percChange(v[prop], prev);
        prev = temp;
        return v;
    });
};

var getSqlQuery = function(dbname, tableName, segment){
    function _conditionExpression(condition){
        var expression = '', val;
        if(condition.isComplex){
            return conditionsExpression(condition.groups);
        }
        else{
            if(condition.operation === 'exists'){
                val = '';    
            }
            else if(condition.valType === 'bool'){
                val = condition.value === 'true' ? 1:0;
            }
            else if(condition.valType === 'numeric'){
                val  = condition.value;
            }
            else{
                val = format('\'{0}\'', condition.value || '');
            }
            return format('{0} {1} {2}', selectionExpression(condition.selection), condition.operation, val);
        }
    };

    function conditionsExpression(conditions){
        var expression = '';
        _.each(conditions, function(gr,index){
            expression = expression + ((index === 0)? _conditionExpression(gr) : ' ' + gr.logic + ' ' + _conditionExpression(gr));
        });
        return !expression? '' : '(' + expression + ')';
    };

    function selectionExpression(selection){
        var expression = '';
        if(!selection.isComplex){
            return selection.selectedProp ? selection.selectedProp : '__';
        }
        else{
            return selectionsExpression(selection.groups);
        }
        
    };

    function selectionsExpression(selections, isTopLevel){
        var expression='';
        if(isTopLevel){
            var expressions = [];
            _.each(selections, function(gr,index){
                expression = selectionExpression(gr);
                if(gr.groupBy !== 'value'){
                    expression = gr.groupBy + '(' + expression + ')';
                }
                expressions.push(expression);
            });
            return expressions.join(', ');
        }
        else{
            _.each(selections, function(gr,index){
                expression = expression + ((index === 0)? selectionExpression(gr) : ' ' + gr.logic + ' ' + selectionExpression(gr));
            });
            return '(' + expression + ')';
        }
    };

    var selectionProperties = getSelectionProperties(segment);
    var condition = conditionsExpression(segment.group);
    
    var returnQuery = format('select {0} from {1}', selectionProperties.join(','), tableName);
    
    if(segment.dataFilter.dateProp){
        if(segment.dataFilter.from && segment.dataFilter.to){
            returnQuery = format('{0} where {1} between \'{2}\' and \'{3}\'', returnQuery, segment.dataFilter.dateProp, getDateFromTimeframe(segment.dataFilter.from).format('{0}-{1}-{2} {3}:{4}:{5}'), getDateFromTimeframe(segment.dataFilter.to).format('{0}-{1}-{2} {3}:{4}:{5}'));
        }
        else if(segment.dataFilter.from && !segment.dataFilter.to){
            returnQuery = format('{0} where {1} > \'{2}\'', returnQuery, segment.dataFilter.dateProp, getDateFromTimeframe(segment.dataFilter.from).format('{0}-{1}-{2} {3}:{4}:{5}'));
        }
        else if(!segment.dataFilter.from && segment.dataFilter.to){
            returnQuery = format('{0} where {1} < \'{2}\'', returnQuery, segment.dataFilter.dateProp, getDateFromTimeframe(segment.dataFilter.to).format('{0}-{1}-{2} {3}:{4}:{5}'));
        }
    }
    
    if(condition.trim()){
        returnQuery = format('{0} and {1}',returnQuery, condition);
    }
    //console.log(returnQuery);
    return returnQuery;
};

var applyOperation = function(left, operation, right){
    var result;
    switch (operation){
        case '>':
            result = left > right;
            break;
        case '<':
            result = left < right;
            break;
        case '<=':
            result = left <= right;
            break;
        case '=':
            result = (left === right);
            break;
        case '!=':
            result = (left !== right);
            break;
        case '>=':
            result = left >= right;
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
        case 'not like':
                result = left.indexOf(right) === -1;
                break;
        case '/':
            result = (+left) / (+right);
    }

    return result;
};

exports.applyOperation = applyOperation;
exports.getUniqueProperties = getUniqueProperties;
exports.getMongoQuery = getMongoQuery;
exports.getSqlQuery = getSqlQuery;
exports.flatten = flatten;
exports.getMongoProperties = getMongoProperties;
exports.getwidgetListMongoQuery = getwidgetListMongoQuery;
exports.format = format;
exports.percChange = percChange;
exports.getPercentageChange = getPercentageChange;
exports.clone = clone;
exports.parseTime = parseTime;
exports.getType = getType;
exports.firstDayOfWeek = firstDayOfWeek;
