;(function(ko){
    var StringTemplate = function(text) {
        var _data = {};
        var _text = text;
        this.data = function(key, value) {
            if (!value) return _data[key];
            _data[key] = value;
        };
        this.text = function(newValue) {
            if (!newValue) return _text;
            _text = newValue;
        };
    };

    var stringTemplateEngine = function() {
        var _templates = {};
        var _nativeEngine = new ko.nativeTemplateEngine();

        _nativeEngine.makeTemplateSource = function(templateName) {
            return _templates[templateName];
        };

        _nativeEngine.addTemplate = function(name, body) {
            _templates[name] = new StringTemplate(body);
        };

        return _nativeEngine;
    };

    ko.stringTemplateEngine = stringTemplateEngine;

    var slideVisibleBindingHandler = {
        init: function(element, valueAccessor) {
            var value = valueAccessor();
            $(element).toggle(ko.utils.unwrapObservable(value));
        },
        update: function (element, valueAccessor, allBindingsAccessor) {
            var allBindings = allBindingsAccessor();
            var duration = allBindings.slideDuration || 100;
            ko.utils.unwrapObservable(valueAccessor()) ? $(element).slideDown(duration) : $(element).slideUp(duration);
        }
    };
    ko.bindingHandlers.slideVisible = slideVisibleBindingHandler;

    ko.subscribable.fn.subscribeChanged = function (callback) {
        var oldValue;
        this.subscribe(function (_oldValue) {
            oldValue = _oldValue;
        }, this, 'beforeChange');

        this.subscribe(function (newValue) {
            callback(newValue, oldValue);
        });
    };
})(ko);
