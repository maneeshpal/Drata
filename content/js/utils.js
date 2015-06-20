/**
 * drata namespace
 * Defines a library of common utilities
 */

; (function(root) {
    var drata = root.drata = {};
    drata.ns = function(namespacePath) {
        var namespaceParts;

        if (arguments.length > 1) {
            namespaceParts = toArray(arguments);
        } else if (isArray(namespacePath)) {
            namespaceParts = namespacePath;
        } else if (typeof namespacePath === 'string') {
            namespaceParts = namespacePath.split('.');
        }

        if (!namespaceParts) throw new Error('Either pass in a single string with dot-separated namespaces, an array of namespace strings, or a separate string param for each namespace');

        if (namespaceParts[0].toLowerCase() === 'drata') {
            namespaceParts = namespaceParts.slice(1);
        }

        return addPartToNamespace(drata, namespaceParts);
    };

    function addPartToNamespace(ns, parts) {
        if (parts.length === 0) {
            return ns;
        }
        var first = parts.shift();
        if (!ns[first]){
            ns[first] = Object.create(nsProto);
        }
        else{
            ns[first].extend = Object.create(nsProto).extend;
        }
        return addPartToNamespace(ns[first], parts);
    }

    var nsProto = {
        extend: function(source) {
            extend(this, source);
            return this;
        }
    };

    var isArray = Array.isArray || function(obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
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

    var onTemplateLoad = function(templates, callback){
        var c = 0;
        function loaded(tmpl){
            $('body').append(tmpl);
            c++;
            if(c === templates.length) callback && callback();
        }
        _.each(templates, function(t){
            $.get('/templates/' + t + '.html', loaded);
        });
    };
    
    var formatDate = function(dt){
        return (dt instanceof Date) ? format('{0}/{1}/{2} {3}:{4}', dt.getMonth() + 1, dt.getDate(), dt.getFullYear(), dt.getHours(), dt.getMinutes()): '__';
    };

    var extend = function(target, source /*, ...sources */) {
        if (source) {
            for(var prop in source) {
                if(source.hasOwnProperty(prop)) {
                    target[prop] = source[prop];
                }
            }
        }

        //Recursively apply additional sources
        if (arguments.length > 2) {
            var args = toArray(arguments, 2);
            args.unshift(target);
            return extend.apply(this, args);
        }

        return target;
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

    var getUrlParam = function(key) {
        var result = new RegExp(key + "=([^&]*)", "i").exec(window.location.search);
        return result && result[1] || "";
    };

    var windowResize = function(fun){
        if (fun === undefined) return;
        var oldresize = window.onresize;

        window.onresize = function(e) {
            if (typeof oldresize == 'function') oldresize(e);
            fun(e);
        }
    };

    var textToPixel = function(text, style){
        var txt = $('#lid');
        if(txt.length === 0){
            txt = $(document.createElement('span'));
            txt.attr('id', 'lid');
            $('body').append(txt);
        }
        style  = style || 'font-size: 12px; font-family: arial;';
        txt.attr('style', style + ' position:relative; left:-100%;visibility:hidden;');
        txt.html(text);
        return {height: txt.height(), width: txt.width() };
    };
    
    var head = document.getElementsByTagName('head')[0];
        
    // var createTemplate = function (templateName, templateString, overrideExisting) {
    //     if (document.getElementById(templateName) && !overrideExisting) return document.getElementById(templateName);

    //     var el = document.createElement('script');

    //     el.type = 'text/html';
    //     el.id = templateName;
    //     el.text = templateString;
    //     var insertBeforeEl = head && head.getElementsByTagName('base')[0] || null;
    //     document.body ? document.body.appendChild(el) : head.insertBefore(el, insertBeforeEl);

    //     return el;
    // };

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

    var flatten = function(data) {
        var result = {};
        function recurse (cur, prop) {
            if (Object(cur) !== cur || _.isDate(cur)) {
                result[prop] = cur;
            } else if (Array.isArray(cur)) {
                //  for(var i=0, l=cur.length; i<l; i++)
                //      recurse(cur[i], prop + "[" + i + "]");
                // if (l == 0)
                //     result[prop] = [];
            } else {
                var isEmpty = true;
                for (var p in cur) {
                    isEmpty = false;
                    recurse(cur[p], prop ? prop+"."+p : p);
                }
                if (isEmpty && prop)
                    result[prop] = {};
            }
        }
        recurse(data, "");
        return result;
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
    
    var getType = function(val){
        if(_.isNumber(val))
            return 'number';
        if(_.isString(val))
            return 'string';
        if(_.isBoolean(val))
            return 'bool';
        if(_.isDate(val))
            return 'date';

        return 'unknown';
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

    var intervalFormats = {
        month : {format: '%b %Y', mb: 40, ml: 60},
        year: {format: '%Y', mb: 30, ml: 30},
        day: {format: '%Y %b %d', mb: 50, ml: 60},
        hours: {format: '%Y %b %d %H:%M', mb: 70, ml: 70},
        get: function(range){
            if(!range) return this.day;
            var msDay = 172800000, msMonth = 7776000000, msYear = 31536000000;
            var interval = range[1] - range[0];
            if(interval <= msDay){
                // 3 days
                return this.hours;
            }
            return this.day;
        }
    };

    var formatNumber = function(number, decimals, dec_point, thousands_sep) {
        number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
        var n = !isFinite(+number) ? 0 : +number,
            prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
            sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
            dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
            s = '',
            toFixedFix = function (n, prec) {
                var k = Math.pow(10, prec);
                return '' + Math.round(n * k) / k;
            };
        // Fix for IE parseFloat(0.55).toFixed(0) = 0;
        s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
        if (s[0].length > 3) {
            s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
        }
        if ((s[1] || '').length < prec) {
            s[1] = s[1] || '';
            s[1] += new Array(prec - s[1].length + 1).join('0');
        }
        return s.join(dec);
    };

    var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

    var getTextFormat = function(type){
        var tickFormat;
        switch(type.formatType){
            case 'numeric':
                tickFormat = d3.format('.3s');
                break;
            case 'currency':
                tickFormat = function(d) {
                    var f = d3.format('.2s');
                    return '$' + f(d);
                };
                break;
            case 'date':
                switch(type.formatSubType){
                    case 'week': //lets just use the day format for weeks.
                        tickFormat = d3.time.format(intervalFormats.day.format);
                        break;
                    case 'month':
                        tickFormat = d3.time.format(intervalFormats.month.format);
                        break;
                    case 'quarter':
                        tickFormat = function(d){
                            return d.getFullYear() + ' Q ' + (Math.floor(d.getMonth() / 3) + 1);
                        }
                        break;
                    case 'year':
                        tickFormat = d3.time.format(intervalFormats.year.format);
                        break;
                    default:
                        intFormat = intervalFormats.get(type.domain);
                        
                        tickFormat = d3.time.format(intFormat.format);
                }
                break;
        }
        return tickFormat;
    };

    var getUniqueProperties = function(data){
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
        var uniqueTypes = [];
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

    drata.ns('js').extend({
        logmsg : false
    });

    var _conditionExpression = function(condition){
        var expression = '';
        if(condition.isComplex){
            return conditionsExpression(condition.groups);
        }
        else{
            return  selectionExpression(condition.selection) + ' ' + condition.operation + ' ' + ((condition.operation === 'exists')? '': format(['numeric', 'boolean'].indexOf(condition.valType) === -1 ? '\'{0}\'' : '{0}', (condition.value ? condition.value : '__')));
        }
    };

    var conditionsExpression = function(conditions){
        var expression = '';
        _.each(conditions, function(gr,index){
            expression = expression + ((index === 0)? _conditionExpression(gr) : ' ' + gr.logic + ' ' + _conditionExpression(gr));
        });
        return !expression? '' : '(' + expression + ')';
    };

    var selectionExpression = function(selection){
        var expression = '';
        if(!selection.isComplex){
            return selection.selectedProp ? selection.selectedProp : '__';
        }
        else{
            return selectionsExpression(selection.groups);
        }
        
    };

    var selectionsExpression = function(selections, isTopLevel){
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

    var getSelectionProperties = function(selections){
        var ret = [];
        _.each(selections, function(sel){
            if(!sel.isComplex){
                ret.push(sel.selectedProp.split('.')[0]);
            }
            else {
                innerSel = getSelectionProperties(sel.groups);
                ret = ret.concat(innerSel);
            }
        });        
        return _.uniq(ret);
    };

    var percChange = function(curr, prev){
        if(prev === 0 && curr === 0) return 0;
        if(prev === 0) return 100;
        return +(((curr * 100)/prev - 100).toFixed(2));
    };

    window.debug = {};
    window.widgetmongo = function(model){
        if(!model || model.length === 0) return {};
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

    var chartMappings = [
    {
        name: 'line',
        label: 'line',
        icon: 'fa-line-chart',
        type: 'track'
    }, {
        name: 'area',
        label: 'area',
        icon: 'fa-area-chart',
        type: 'track'
    }, {
        name: 'scatter',
        label: 'scatter',
        icon: 'fa-sliders',
        type: 'track'
    }, {
        name: 'pie',
        label: 'pie',
        icon: 'fa-pie-chart',
        type: 'comparison'
    }, {
        name: 'bar',
        label: 'bar',
        icon: 'fa-bar-chart',
        type: 'comparison'
    }, {
        name: 'trend',
        label: 'trend',
        icon: 'fa-th-list',
        type: 'track'
    }];

    var chartType = {}, chartIconMapping = {};
    chartMappings.forEach(function (mapping) {
        chartType[mapping.name] = mapping.label;
        chartIconMapping[mapping.name] = mapping.icon;
    })

    var getChartTypes = function(type) {
        return chartMappings.filter( function(mapping) {
            return mapping.type === type;
        }).map( function (trackingChart) {
            return trackingChart.label
        });
    }

    drata.ns('global').extend({
        conditionalOperations : ['>', '<', '>=','<=', '=', '!=','exists','like', 'not like'],
        arithmeticOperations : ['+', '-', '*','/'],
        groupingOptions : ['value','count', 'sum', 'avg', 'min', 'max'],
        xAxisTypes : ['date','numeric','currency'],
        chartType: chartType,
        chartIcon: chartIconMapping,
        trackingChartTypes: getChartTypes('track'),
        comparisonChartTypes: getChartTypes('comparison'),
        logics : ['and', 'or'],
        propertyTypes: ['string', 'date', 'bool', 'numeric', 'unknown'],
        numericOperations: ['>', '<', '<=', '>=', '+', '-', '*', '/'],
        timeframes : ['minute', 'hour', 'day', 'month', 'year'],
        uniqueClientId: parseInt(Math.random() * 100000000),
        dateIntervalTypeAheads: ['1h', '5m','60s', '1d','1w', 'week', 'month', 'quarter', 'year'],
        timeframeIntervalExamples: ['60s', '5m', '5h', '1d','1w'],
        sortTypes: { 
            numeric: { 
                asc: 'fa-sort-numeric-asc', 
                desc: 'fa-sort-numeric-desc'
            },
            alpha: { 
                asc: 'fa-sort-alpha-asc', 
                desc: 'fa-sort-alpha-desc'
            },
            generic: { 
                asc: 'fa-sort-asc', 
                desc: 'fa-sort-desc'
            },
            amount: { 
                asc: 'fa-sort-amount-asc', 
                desc: 'fa-sort-amount-desc'
            }
        }
    });

    Date.prototype.format = function(f){
        return format(f, this.getFullYear(), this.getMonth() + 1, this.getDate());
    };

    var getDataFilterExpression = function(dataFilter){
        var exp = '{0} to {1}';
        var fromExp = (+new Date(dataFilter.from)) ? dataFilter.from : parseTime(dataFilter.from).expression + ' since current time';
        var toExp = (+new Date(dataFilter.to)) ? dataFilter.to : parseTime(dataFilter.to).expression + ' since current time';
        return format(exp, fromExp || '__', toExp || '__');
    };

    var firstDayOfWeek = function(d){
        var _x = new Date(d);
        var day = _x.getDate() - _x.getDay();
        _x.setDate(day);
        return new Date(_x.toDateString());
    };

    drata.ns('utils').extend({
        format: format,
        toArray:toArray,
        extend: extend,
        getUrlParam: getUrlParam,
        clone:clone,
        windowResize:windowResize,
        textToPixel : textToPixel,
        //createTemplate: createTemplate,
        flatten: flatten,
        parseTime: parseTime,
        applyOperation: applyOperation,
        getUniqueProperties: getUniqueProperties,
        getValidDate: getValidDate,
        formatDate: formatDate,
        selectionsExpression: selectionsExpression,
        conditionsExpression: conditionsExpression,
        onTemplateLoad: onTemplateLoad,
        intervalFormats: intervalFormats,
        getTextFormat: getTextFormat,
        getSelectionProperties: getSelectionProperties,
        percChange: percChange,
        getDataFilterExpression: getDataFilterExpression,
        formatNumber: formatNumber,
        isArray: isArray,
        firstDayOfWeek: firstDayOfWeek
    });
})(this);

