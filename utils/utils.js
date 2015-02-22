
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

var symbolMap = {
    '<': { mongo: '$lt', sql: '<' },
    '>': { mongo: '$gt', sql: '>' },
    '<=': { mongo: '$lte', sql: '<=' },
    '>=': { mongo: '$gte', sql: '>=' },
    '!=': { mongo: '$ne', sql: '<>' },
    'exists': { mongo: '$exists', sql: 'is not null' }
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
exports.flatten = flatten;
exports.format = format;
exports.percChange = percChange;
exports.getPercentageChange = getPercentageChange;
exports.clone = clone;
exports.parseTime = parseTime;
exports.getType = getType;
exports.firstDayOfWeek = firstDayOfWeek;
exports.getSelectionProperties = getSelectionProperties;
exports.symbolMap = symbolMap;
exports.getDateFromTimeframe = getDateFromTimeframe;