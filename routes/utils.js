
var _ = require('underscore');

Date.prototype.format = function(f){
    return format(f, this.getFullYear(), this.getMonth() + 1, this.getDate());
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
    var dateRange = getDateRange(segment.dataFilter);
    
    query[segment.dataFilter.dateProp] = {
        $gte : dateRange.min, 
        $lte: dateRange.max
    };
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
var getBounds = function(type){
    var bounds = [];
    switch(type){
        case 'day' :
            bounds = [1, 60];
            break;
        case 'minute':
            bounds = [1,60];
            break;
        case 'hour':
            bounds = [1, 72];
            break;
        case 'month':
            bounds = [0,24];
            break;
        case 'year':
            bounds = [0,5];
            break;
    }
    return bounds;
};

var getDateRange = function(dataFilter){
    var min, max;
        switch(dataFilter.intervalType){
            case 'static':
                min = getValidDate(dataFilter.min, true);
                max = getValidDate(dataFilter.max, true);
                break;
            case 'dynamic':
                var bounds = getBounds(dataFilter.intervalKind);
                var multiplier;
                min = bounds[1] - dataFilter.min;
                max = bounds[1] - dataFilter.max;
                var cd = new Date();

                if(!isNaN(+min) && !isNaN(+max)){
                    switch(dataFilter.intervalKind){
                        case 'day':
                            multiplier = 86400000;
                            min = new Date(+cd - (multiplier * min));
                            max = new Date(+cd - (multiplier * max));
                            break;
                        break;
                        case 'minute':
                            multiplier = 60000;
                            min = new Date(+cd - (multiplier * min));
                            max = new Date(+cd - (multiplier * max));
                            break;
                        case 'hour':
                            multiplier = 3600000;
                            min = new Date(+cd - (multiplier * min));
                            max = new Date(+cd - (multiplier * max));
                            
                            break;
                        case 'month':
                            var cm = cd.getMonth();
                            var d1 = new Date(cd);
                            min = new Date(cd.setMonth(cm-min));
                            max = new Date(d1.setMonth(cm-max));
                            break;
                        case 'year':
                            var cy = cd.getFullYear();
                            var d1 = new Date(cd);
                            min = new Date(cd.setFullYear(cy-min));
                            max = new Date(d1.setFullYear(cy-max));
                            break;
                    }
                }
            break;
        }

        return {
            min: min,
            max: max
        };
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

//var getMongoSelectionProperties = function(selections){
    // _.each(selections, function(sel){
    //     if(!sel.isComplex){
    //         ret[sel.selectedProp.split('.')[0]] = 1;
    //     }
    //     else {
    //         innerSel = getMongoSelectionProperties(sel.groups);
    //         for(var inner in innerSel){
    //             if(innerSel.hasOwnProperty(inner)) ret[inner] = 1;
    //         }
    //     }
    // });
    // return ret;
//};

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
    var dateRange = getDateRange(segment.dataFilter);

    var returnQuery = format('select {0} from {1}.{2} where {3} between \'{4}\' and \'{5}\'', selectionProperties.join(','), dbname, tableName, segment.dataFilter.dateProp, dateRange.min.format('{0}-{1}-{2}'), dateRange.max.format('{0}-{1}-{2}'));
    if(condition.trim()){
        returnQuery = format('{0} and {1}',returnQuery, condition);
    }
    return returnQuery;
};

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
