/**
 * atombomb namespace
 * Defines a library of common utilities
 */

; (function(root) {
    var atombomb = root.atombomb = {};
    /**
     * Returns a nested namespace. Takes three argument forms:
     *    var module = atombomb.namespace('path.to.module');
     *    var module = atombomb.namespace(['path', 'to', 'module']);
     *    var module = atombomb.namespace('path', 'to', 'module');
     * ...where the path to the module is a series of nested namespaces that may or may not have been initialized
     */
    atombomb.namespace = function(namespacePath) {
        var namespaceParts;

        if (arguments.length > 1) {
            namespaceParts = toArray(arguments);
        } else if (isArray(namespacePath)) {
            namespaceParts = namespacePath;
        } else if (typeof namespacePath === 'string') {
            namespaceParts = namespacePath.split('.');
        }

        if (!namespaceParts) throw new Error('Either pass in a single string with dot-separated namespaces, an array of namespace strings, or a separate string param for each namespace');

        if (namespaceParts[0].toLowerCase() === 'atombomb') {
            namespaceParts = namespaceParts.slice(1);
        }

        return addPartToNamespace(atombomb, namespaceParts);
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

    //Utilities

    var isArray = Array.isArray || function(obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    };

    var toArray = function(args, ix) {
        return Array.prototype.slice.call(args, ix || 0);
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

    var forEach = function(obj, fn) {
        if (isArray(obj)) {
            obj.forEach(fn, this);
        } else {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    fn(prop, obj[prop]);
                }
            }
        }
    };

    var flattenToArray = function(/* arguments */) {
        var acc = [],
            args = toArray(arguments);

        args.forEach(function(item) {
            if (isArray(item)) {
                acc = acc.concat(flattenToArray.apply(null, item));
            } else {
                acc.push(item);
            }
        });

        return acc;
    };

    var getUrlParam = function(key) {
        var result = new RegExp(key + "=([^&]*)", "i").exec(window.location.search);
        return result && result[1] || "";
    };

    atombomb.namespace('utils').extend({
        isArray: isArray,
        toArray: toArray,
        format: format,
        extend: extend,
        forEach: forEach,
        flattenToArray: flattenToArray,
        getUrlParam: getUrlParam
    });
})(this);

