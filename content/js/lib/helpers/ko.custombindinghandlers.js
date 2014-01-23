  
;(function(ko, $){
    var templateEngine = new ko.stringTemplateEngine();
    /********** KO TEMPLATES ******************/
    var comboTemplate = [
            '<input type="text" id="txtInput" data-bind="value:selectedValue,attr:{placeholder:optionsCaption}"></input>',
            '<ul class="combolist no-bullet" style="display:none">',
                '<!-- ko foreach: filteredOptions -->',
                '<li data-bind="value: $data, text: $data, click: $parent.selectItem"></li>',
                '<!-- /ko -->',
            '</ul>'
    ].join('');

    templateEngine.addTemplate('comboTemplate', comboTemplate);

    /********** KO TEMPLATES ******************/

    var ComboVM = function(config){
        var self = this;
        self.selectedValue = config.selectedValue;
        self.availableOptions = ko.isObservable(config.options) ? config.options : ko.observableArray(config.options);
        self.filteredOptions =  ko.observable(ko.utils.unwrapObservable(self.availableOptions));
        self.optionsCaption = config.optionsCaption;
        var $elem;
        var $combolist;
        var filterOptions = function(){
            var inputval = $elem.val();
            var filteredList = self.availableOptions().filter(function(opt){
                return opt.indexOf(inputval) > -1;
            });
            $combolist.show();
            self.filteredOptions(filteredList);
        };
        self.selectItem = function(listItemValue){
            self.selectedValue(listItemValue);
            //self.selecting(false);
            $combolist.hide();
            $(document).off('.comboSelections');
        };
        self.accessDomElements = function(nodes){
            //var toplevelNode = nodes[0];
            $combolist = $(nodes[1]);
            $elem =  $(nodes[0]);
            $elem.keyup(function(ele){
                //self.selecting(true);
                filterOptions();
                $(document).on('click.comboSelections', function(){
                    arguments[0].target !== $elem[0] && $combolist.hide();
                });
            });
            $elem.click(function(ele){
                $combolist.show();
                $(document).on('click.comboSelections', function(){
                    arguments[0].target !== $elem[0] && $combolist.hide();
                });
            });
            //var $wrapper = $(config.element);
        };
    };
    var comboBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'comboTemplate';
            var config = {
                selectedValue : value.selectedValue|| ko.observable(),
                element: element,
                options: value.options || [],
                optionsCaption: value.optionsCaption || 'Select..'
            };
            
            window.comboVM = new ComboVM(config);

            ko.renderTemplate(template, comboVM, { templateEngine: templateEngine, afterRender : comboVM.accessDomElements }, element, 'replaceChildren');

            return { controlsDescendantBindings: true };
        }
    };

    ko.bindingHandlers.comboBox = comboBindingHandler;

})(ko, jQuery);