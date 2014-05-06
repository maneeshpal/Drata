  
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
                '<select class="combo-dd columns" data-bind="enable: enabled,value: selectedPrefix, options: prefixOptions">',
                '</select>',
                '<div class="combo-txt columns" data-bind="template : {name: \'comboTemplate\', data : $data}">',
                '</div>',
            '</div>'            
    ].join('');

    var editLabelTemplateStr = [
        '<div class="edit-label" data-bind="css: {\'edit\': editingTitle}">',
            '<div class="title-display">',
                '<a data-bind="visible: href(), text:title, attr: {\'href\': href}"></a>',
                '<span data-bind="visible: !href(), text:title, click: editTitle"></span>',
                '<i class="general foundicon-edit" data-bind="click: editTitle"></i>',
            '</div>',
            '<div class="row collapse title-edit">',
                '<div class="small-8 columns">',
                    '<input type="text" data-bind="value: title"></input>',
                '</div>',
                '<div class="small-2 columns" data-bind="click: acceptEdit">',
                    '<span class="postfix">',
                        '<i class="general foundicon-checkmark"></i>',
                    '</span>',
                '</div>',
                '<div class="small-2 columns" data-bind="click: cancelEdit">',
                    '<span class="postfix">',
                        '<i class="general foundicon-remove"></i>',
                    '</span>',
                '</div>',
            '</div>',
        '</div>'
    ].join('');


    templateEngine.addTemplate('comboTemplateStr', comboTemplateStr);
    templateEngine.addTemplate('ddComboTemplateStr', ddComboTemplateStr);
    templateEngine.addTemplate('editLabelTemplateStr', editLabelTemplateStr);

    /********** KO TEMPLATES ******************/

    var ComboVM = function(config){
        var self = this;
        self.selectedValue = config.selectedValue;
        self.availableOptions = ko.isObservable(config.options) ? config.options : ko.observableArray(config.options);
        self.filteredOptions =  ko.observableArray(self.availableOptions());
        self.availableOptions.subscribe(function(newValue){
            self.filteredOptions(newValue);
        });
        self.optionsCaption = config.optionsCaption;
        self.enabled = ko.isObservable(config.enabled) ? config.enabled : ko.observable(config.enabled);
        var $elem;
        var $combolist;
        var hideCombo = function(){
            $combolist.hide();
            if(!config.allowCustom){
                var sel = self.selectedValue();
                var selExists;
                //need to fix property casing
                if(sel){
                    sel = sel.toLowerCase();
                    selExists = self.availableOptions().some(function(opt){
                        return opt.toLowerCase().indexOf(sel) > -1;
                    });
                }
                
                if(!selExists) {
                    self.selectedValue('');
                    $elem.removeClass('combo-error');
                }
            }
        };
        var filterOptions = function(){
            var inputval = $elem.val();
            var filteredList = self.availableOptions().filter(function(opt){
                return opt.toLowerCase().indexOf(inputval) > -1;
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

    var comboBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'comboTemplateStr';
            var config = {
                selectedValue : value.selectedValue|| ko.observable(),
                element: element,
                options: value.options,
                optionsCaption: value.optionsCaption || 'Select..',
                enabled: value.enabled === undefined ? true: value.enabled,
                allowCustom : value.allowCustom === undefined ? true : value.allowCustom
            };
            
            var comboVM = new ComboVM(config);

            ko.renderTemplate(template, comboVM, { templateEngine: templateEngine, afterRender : comboVM.accessComboElements.bind(comboVM) }, element, 'replaceChildren');

            return { controlsDescendantBindings: true };
        }
    };

    var DdComboVM = function(config){
        var self = this;
        $.extend(self, new ComboVM(config));
        self.prefixOptions = ko.isObservable(config.prefixOptions) ? config.prefixOptions : ko.observableArray(config.prefixOptions);
        self.selectedPrefix = ko.isObservable(config.selectedPrefix) ? config.selectedPrefix : ko.observable(config.selectedPrefix);
        if(self.selectedPrefix() === undefined)
            self.selectedPrefix(self.prefixOptions()[0]);

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

    var EditLabelVM = function(config){
        this.title = config.title;
        this.editingTitle = ko.observable(false);
        this.href = ko.isObservable(config.href) ? config.href: ko.observable(config.href);
        var temp = this.title();
        this.editTitle = function(){
            temp = this.title();
            this.editingTitle(true);
            return false;
        }
        this.cancelEdit = function(){
            this.title(temp);
            this.editingTitle(false);
        }
        this.acceptEdit = function(){
            this.editingTitle(false);
            temp = this.title();
        }
    };

    var editLabelBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'editLabelTemplateStr';
            var config = {
                title: value.title,
                href: value.href
            };
            
            var editLabel = new EditLabelVM(config);

            ko.renderTemplate(template, editLabel, { templateEngine: templateEngine}, element, 'replaceChildren');

            return { controlsDescendantBindings: true };
        }
    };

    ko.bindingHandlers.comboBox = comboBindingHandler;
    ko.bindingHandlers.ddComboBox = ddComboBindingHandler;
    ko.bindingHandlers.editLabel = editLabelBindingHandler;
})(ko, jQuery);