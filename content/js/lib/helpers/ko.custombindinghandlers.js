  
;(function(ko, $){
    var templateEngine = new ko.stringTemplateEngine();
    /********** KO TEMPLATES ******************/
    var comboTemplate = [
            '<div style="position:relative">',
            '<input type="text" id="txtInput" data-bind="value:selectedValue,attr:{placeholder:optionsCaption}"></input>',
            '<ul id="combolist" class="combolist no-bullet" style="display:none">',
                '<!-- ko foreach: filteredOptions -->',
                '<li data-bind="value: $data, text: $data, click: $parent.selectItem"></li>',
                '<!-- /ko -->',
            '</ul>',
            '</div>'
    ].join('');

    var ddComboTemplate = [
            '<div class="row collapse">',
                '<div class="combo-dd columns" data-bind="text: selectedPrefix,click:changePrefix">',
                '</div>',
                '<div class="combo-txt columns">',
                    '<div style="position:relative">',
                    '<input type="text" id="txtInput" data-bind="value:selectedValue,attr:{placeholder:optionsCaption}"></input>',
                    '<ul id="combolist" class="combolist no-bullet" style="display:none">',
                        '<!-- ko foreach: filteredOptions -->',
                        '<li data-bind="value: $data, text: $data, click: $parent.selectItem"></li>',
                        '<!-- /ko -->',
                    '</ul>',
                    '</div>',
                '</div>',
            '</div>'            
    ].join('');

    templateEngine.addTemplate('comboTemplate', comboTemplate);
    templateEngine.addTemplate('ddComboTemplate', ddComboTemplate);

    /********** KO TEMPLATES ******************/

    var ComboVM = function(config){
        var self = this;
        self.selectedValue = config.selectedValue;
        self.availableOptions = ko.isObservable(config.options) ? config.options : ko.observableArray(config.options);
        self.filteredOptions =  ko.observable(ko.utils.unwrapObservable(self.availableOptions));
        self.optionsCaption = config.optionsCaption;
        var $elem;
        var $combolist;
        var hideCombo = function(){
            $combolist.hide();
            if(!config.allowCustom){
                var sel = self.selectedValue();
                var selExists = self.availableOptions().some(function(opt){
                    return opt.indexOf(sel) > -1;
                });
                if(!selExists) {
                    self.selectedValue('');
                    $elem.removeClass('combo-error');
                }
            }
        };
        var filterOptions = function(){
            var inputval = $elem.val();
            var filteredList = self.availableOptions().filter(function(opt){
                return opt.indexOf(inputval) > -1;
            });
            if(!config.allowCustom){
                if(filteredList.length === 0){
                    $elem.addClass('combo-error');
                    $combolist.hide();
                    self.filteredOptions(self.availableOptions());
                }
                else{
                    $elem.removeClass('combo-error');
                    $combolist.show();
                    self.filteredOptions(filteredList);
                }
            }
            else{
                $combolist.show();
                self.filteredOptions(filteredList);
            }            
        };
        self.selectItem = function(listItemValue){
            self.selectedValue(listItemValue);
            //self.selecting(false);
            hideCombo();
            $(document).off('.comboSelections');
        };
        self.accessDomElements = function(nodes){
            //var toplevelNode = nodes[0];
            $elem = $(nodes).find('#txtInput');
            $combolist =  $(nodes).find('#combolist');
            $elem.keyup(function(ele){
                //self.selecting(true);
                filterOptions();
                $(document).on('click.comboSelections', function(){
                    arguments[0].target !== $elem[0] && hideCombo();
                });
            });
            $elem.click(function(ele){
                $combolist.show();
                $(document).on('click.comboSelections', function(){
                    arguments[0].target !== $elem[0] && hideCombo();
                });
            });
            var $wrapper = $(config.element);
        };
    };

    var DdComboVM = function(config){
        var self = this;
        $.extend(self, new ComboVM(config));
        self.changePrefix = function(){
            var currPrefix = self.selectedPrefix();
            var index = 0;
            if(currPrefix){
                index = self.prefixOptions.indexOf(currPrefix) + 1;
                index = index < self.prefixOptions().length ? index : 0;
            } 
            self.selectedPrefix(self.prefixOptions()[index]);
        };
        self.prefixOptions = ko.isObservable(config.prefixOptions) ? config.prefixOptions : ko.observableArray(config.prefixOptions);
        self.selectedPrefix = ko.isObservable(config.selectedPrefix) ? config.selectedPrefix : ko.observable(config.selectedPrefix);
        if(self.selectedPrefix() === undefined)
            self.selectedPrefix(self.prefixOptions()[0]);

    }
    var comboBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'comboTemplate';
            var config = {
                selectedValue : value.selectedValue|| ko.observable(),
                element: element,
                options: value.options || [],
                optionsCaption: value.optionsCaption || 'Select..',
                allowCustom : value.allowCustom === undefined ? true : value.allowCustom
            };
            
            window.comboVM = new ComboVM(config);

            ko.renderTemplate(template, comboVM, { templateEngine: templateEngine, afterRender : comboVM.accessDomElements.bind(comboVM) }, element, 'replaceChildren');

            return { controlsDescendantBindings: true };
        }
    };

    var ddComboBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'ddComboTemplate';
            var config = {
                selectedValue : value.selectedValue|| ko.observable(),
                element: element,
                options: value.options || [],
                selectedPrefix: value.selectedPrefix || ko.observable(),
                prefixOptions : value.prefixOptions || ko.observableArray(),
                optionsCaption: value.optionsCaption || 'Select..',
                allowCustom : value.allowCustom === undefined ? true : value.allowCustom
            };
            
            window.ddComboVM = new DdComboVM(config);

            ko.renderTemplate(template, ddComboVM, { templateEngine: templateEngine, afterRender : ddComboVM.accessDomElements.bind(ddComboVM) }, element, 'replaceChildren');

            return { controlsDescendantBindings: true };
        }
    };

    ko.bindingHandlers.comboBox = comboBindingHandler;
    ko.bindingHandlers.ddComboBox = ddComboBindingHandler;

})(ko, jQuery);