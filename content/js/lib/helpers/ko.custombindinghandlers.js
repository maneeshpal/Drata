  
;(function(ko, $){
    var templateEngine = new ko.stringTemplateEngine();
    /********** KO TEMPLATES ******************/
    var comboTemplateStr = [
            '<div style="position:relative">',
            '<input type="text" id="txtInput" data-bind="enable: enabled,value:selectedValue,attr:{placeholder:optionsCaption}"></input>',
            '<ul id="combolist" class="combolist no-bullet" style="display:none">',
                '<!-- ko foreach: filteredOptions -->',
                '<li data-bind="value: $data, text: $data, click: $parent.selectItem"></li>',
                '<!-- /ko -->',
            '</ul>',
            '</div>'
    ].join('');

    var ddComboTemplateStr = [
            '<div class="row collapse">',
                '<div class="combo-dd columns" data-bind="text: selectedPrefix,click:changePrefix">',
                '</div>',
                '<div class="combo-txt columns" data-bind="template : {name: \'comboTemplate\', data : $data}">',
                '</div>',
            '</div>'            
    ].join('');

    // var complexComboStr = [
    //     '<!-- ko template : template -->',
    //     '<!-- /ko -->'
    // ].join('');
    templateEngine.addTemplate('comboTemplateStr', comboTemplateStr);
    templateEngine.addTemplate('ddComboTemplateStr', ddComboTemplateStr);
    //templateEngine.addTemplate('complexComboStr', complexComboStr);

    /********** KO TEMPLATES ******************/

    var ComboVM = function(config){
        var self = this;
        self.selectedValue = config.selectedValue;
        self.availableOptions = ko.isObservable(config.options) ? config.options : ko.observableArray(config.options);
        self.filteredOptions =  ko.observable(ko.utils.unwrapObservable(self.availableOptions));
        self.optionsCaption = config.optionsCaption;
        self.enabled = ko.isObservable(config.enabled) ? config.enabled : ko.observable(config.enabled);
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
        self.accessComboElements = function(nodes){
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

    };

    /**************************************/
    /**************************************/
    /*************COMBOCOMPLEX*************/
    /**************************************/
    /**************************************/

    // var ComplexComboVM = function(config){
    //     var self = this;
    //     $.extend(self, new ComboVM(config));
    //     self.group = new Group(config.level,'selections', undefined, self);
    //     var $complexWrapper;
    //     self.accessComplexComboElements = function(nodes){
    //         self.accessComboElements(nodes);
    //         $complexWrapper = $(nodes).find('#complexWrapper');
           
    //     }
    //     self.template = {name: 'complexCombo', data : self, afterRender:self.accessComplexComboElements.bind(self)};
    //     //self.complex = ko.observable(false);
    //     // self.toggleComplex = function(){
    //     //     self.complex(!self.complex());
    //     //     if(self.complex() && self.groups().length === 0) {
    //     //         self.addCondition();
    //     //     }
    //     //     //else if(!self.complex() && )
    //     // };
    // };


    var comboBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'comboTemplateStr';
            var config = {
                selectedValue : value.selectedValue|| ko.observable(),
                element: element,
                options: value.options || [],
                optionsCaption: value.optionsCaption || 'Select..',
                enabled: value.enabled === undefined ? true: value.enabled,
                allowCustom : value.allowCustom === undefined ? true : value.allowCustom
            };
            
            var comboVM = new ComboVM(config);

            ko.renderTemplate(template, comboVM, { templateEngine: templateEngine, afterRender : comboVM.accessComboElements.bind(comboVM) }, element, 'replaceChildren');

            return { controlsDescendantBindings: true };
        }
    };

    var ddComboBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'ddComboTemplateStr';
            drata.utils.createTemplate('comboTemplate', comboTemplateStr);
            var config = {
                selectedValue : value.selectedValue|| ko.observable(),
                element: element,
                options: value.options || [],
                selectedPrefix: value.selectedPrefix || ko.observable(),
                prefixOptions : value.prefixOptions || ko.observableArray(),
                optionsCaption: value.optionsCaption || 'Select..',
                enabled: value.enabled === undefined ? true: value.enabled,
                allowCustom : value.allowCustom === undefined ? true : value.allowCustom
            };
            
            var ddComboVM = new DdComboVM(config);

            ko.renderTemplate(template, ddComboVM, { templateEngine: templateEngine, afterRender : ddComboVM.accessComboElements.bind(ddComboVM) }, element, 'replaceChildren');

            return { controlsDescendantBindings: true };
        }
    };

    // var complexComboBindingHandler = {
    //     init: function (element, valueAccessor) {
    //         var value = valueAccessor();
    //         var template = 'complexComboStr';
    //         var config = {
    //             selectedValue : value.selectedValue|| ko.observable(),
    //             element: element,
    //             level: value.level,
    //             options: value.options || [],
    //             optionsCaption: value.optionsCaption || 'Select..',
    //             allowCustom : value.allowCustom === undefined ? true : value.allowCustom
    //         };
            
    //         window.complexCombo = new ComplexComboVM(config);

    //         ko.renderTemplate(template, complexCombo, { templateEngine: templateEngine}, element, 'replaceChildren');

    //         return { controlsDescendantBindings: true };
    //     }
    // };

    ko.bindingHandlers.comboBox = comboBindingHandler;
    ko.bindingHandlers.ddComboBox = ddComboBindingHandler;
   // ko.bindingHandlers.complexCombo = complexComboBindingHandler;
})(ko, jQuery);