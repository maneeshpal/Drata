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
        if (parts.length === 0) return ns;
        var first = parts.shift();
        if (!ns[first]) ns[first] = Object.create(nsProto);
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

    var format = function(format /*, ...replacements*/) {
        var replacements = toArray(arguments, 1);
        for (var i = 0, j = replacements.length; i < j; i++) {
            format = format.replace(new RegExp('\\{' + (i) + '\\}', 'g'), replacements[i]);
        }
        return format;
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
        txt.attr('style', style + ' display:none');
        txt.html(text);
        return txt.width();
    };
    var head = document.getElementsByTagName('head')[0];
        
    var createTemplate = function (templateName, templateString, overrideExisting) {
        if (document.getElementById(templateName) && !overrideExisting) return document.getElementById(templateName);

        var el = document.createElement('script');

        el.type = 'text/html';
        el.id = templateName;
        el.text = templateString;
        var insertBeforeEl = head && head.getElementsByTagName('base')[0] || null;
        document.body ? document.body.appendChild(el) : head.insertBefore(el, insertBeforeEl);

        return el;
    };

    var parseTime = function(input){
        if(!input) return input;
        var hmsConv = {
            h: 60 * 60 * 1000,
            m: 60 * 1000,
            s: 1000,
            d: 60 * 60 * 1000 * 24,
            y: 60 * 60 * 1000 * 24 * 365,
            w: 60 * 60 * 1000 * 24 * 7
        };
        var hms = input.split(/[^a-z]/gi).filter(function(j){return !!j && hmsConv.hasOwnProperty(j)});
        var num = input.split(/\D/g).map(function(i){return +i}).filter(function(j){return !!j});
        if(hms.length <= 0 || hms.length !== num.length) return null;
        var output = 0;
        
        for(var i=0;i<hms.length;i++){
            output = output + hmsConv[hms[i]] * num[i];
        }
        return output;
    };

    var flatten = function(data) {
        var result = {};
        function recurse (cur, prop) {
            if (Object(cur) !== cur) {
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

    var calc = function(left, operation, right){
        var result;
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
    };

    var divideDataByInterval = function(params){
        var val, groupBy;
        var intervalGroup = _.groupBy(params.data, function(item){
            val = item[params.property];
            //TODO: Clean this 
            switch(params.intervalType){
                case 'time':
                    groupBy = Math.floor(+(new Date(val))/ +params.interval) * (+params.interval);
                break;
                case 'numeric':
                case 'currency':
                    groupBy = Math.floor(+val/ +params.interval) * (+params.interval);
                    break;
                default :
                    groupBy = val;
            }
            return groupBy;
        });

        return intervalGroup;
    };

    var contentToMongo = function(conditions){

        function processCondition(condition){

        }
        
    };

    drata.ns('js').extend({
        logmsg : false
    });

    drata.ns('global').extend({
        conditionalOperations : ['>', '<', '>=','<=', '=', '!=','exists','like'],
        arithmeticOperations : ['+', '-', '*','/'],
        groupingOptions : ['value','count', 'sum', 'avg'],
        xAxisTypes : ['time','numeric','currency'],
        chartTypes : ['line', 'area', 'scatter', 'pie','bar'],
        logics : ['and', 'or'],
        intervalTypes: ['string', 'time', 'numeric'],
        numericOperations: ['>', '<', '<=', '>=', '+', '-', '*', '/']
    });
    drata.ns('utils').extend({
        format: format,
        extend: extend,
        getUrlParam: getUrlParam,
        clone:clone,
        windowResize:windowResize,
        textToPixel : textToPixel,
        createTemplate: createTemplate,
        flatten: flatten,
        parseTime: parseTime,
        calc: calc,
        divideDataByInterval: divideDataByInterval
    });
})(this);

