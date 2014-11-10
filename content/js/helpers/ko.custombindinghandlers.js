  
;(function(ko, $){
    var templateEngine = new ko.stringTemplateEngine();
    /********** KO TEMPLATES ******************/
    var comboTemplateStr = [
        '<div style="position:relative">',
        '<ul id="combolist" class="combolist no-bullet" style="display:none">',
            '<!-- ko foreach: filteredOptions -->',
            '<li data-bind="value: $data, text: $data, click: $parent.selectItem"></li>',
            '<!-- /ko -->',
        '</ul>',
        '<input type="text" id="txtInput" data-bind="enable: enabled,value:selectedValue,attr:{placeholder:optionsCaption}"></input>',
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
                '<span class="edit-icon icon-pencil" data-bind="click: editTitle"></span>',
            '</div>',
            '<div class="row collapse title-edit">',
                '<div class="small-8 columns">',
                    '<input type="text" data-bind="value: overrideTitle"></input>',
                '</div>',
                '<div class="small-2 columns" data-bind="click: acceptEdit">',
                    '<span class="postfix">',
                        '<i class="icon-checkmark"></i>',
                    '</span>',
                '</div>',
                '<div class="small-2 columns" data-bind="click: cancelEdit">',
                    '<span class="postfix">',
                        '<i class="icon-close"></i>',
                    '</span>',
                '</div>',
            '</div>',
        '</div>'
    ].join('');

    var checkboxDropdownTemplateStr = [
        '<div class="chk-dd" style="position:relative">',
            '<div id="lblSelectedValues" class="chk-dd-label" data-bind="text: displayValuesList"></div>',
            '<ul id="combolist" class="combolist no-bullet" style="display:none; margin-top:0" data-bind="foreach: options">',
                '<li>',
                    '<input type="checkbox" data-bind="attr:{\'id\': \'chkdd\' + $index()}, checkedValue: $parent.optionsValue ? $data[$parent.optionsValue] : $data, checked: $parent.selectedOptions" />',
                    '<label data-bind="attr:{\'for\': \'chkdd\'+ $index()}, text: $parent.optionsText ? $data[$parent.optionsText] : $data"></label>',
                '</li>',
            '</ul>',
            '<span class="chk-dd-arrow icon-arrow-down5"></span>',
        '</div>'
    ].join('');

    templateEngine.addTemplate('comboTemplateStr', comboTemplateStr);
    templateEngine.addTemplate('ddComboTemplateStr', ddComboTemplateStr);
    templateEngine.addTemplate('editLabelTemplateStr', editLabelTemplateStr);
    templateEngine.addTemplate('checkboxDropdownTemplateStr', checkboxDropdownTemplateStr);

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
            $combolist.css('top', '2.3125rem');

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
        var showCombo = function(){
            if(!self.filteredOptions() || self.filteredOptions().length === 0){
                return;
            }
            $combolist.show();
            if($combolist.height() + $combolist.offset().top - $(window).scrollTop() > $(window).height()){
                $combolist.css('top', '-' + $combolist.height() + 'px');
            }else{
                $combolist.css('top', '2.3125rem');
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
                    $combolist.css('top', '2.3125rem');
                    self.filteredOptions(self.availableOptions());
                }
                else{
                    $elem.removeClass('combo-error');
                    showCombo();
                    self.filteredOptions(filteredList);
                }
            }
            else{
                showCombo();
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
                showCombo();
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

    var CheckboxDropdownVM = function(config){
        var self = this;
        self.selectedOptions = ko.isObservable(config.selectedOptions) ? config.selectedOptions : ko.observableArray(config.selectedOptions);
        self.options = ko.isObservable(config.options) ? config.options : ko.observableArray(config.options);
        self.optionsText = config.optionsText;
        self.optionsValue = config.optionsValue;
        self.optionsCaption = ko.isObservable(config.optionsCaption) ? config.optionsCaption : ko.observable(config.optionsCaption);
        
        self.options.subscribe(function(){
            self.selectedOptions([]);
        });

        self.enabled = ko.isObservable(config.enabled) ? config.enabled : ko.observable(config.enabled);
        var $elem, $combolist, $wrapper = $(config.element);
        
        self.displayValuesList = ko.computed(function(){
            if(self.selectedOptions().length === 0) return self.optionsCaption();
            var selectedOptions = self.selectedOptions();
            var s = self.options().filter(function(i){
                if(self.optionsValue){
                    return selectedOptions.indexOf(i[self.optionsValue]) > -1;
                }
                else{
                    return selectedOptions.indexOf(i) > -1;
                }
            })

            if(self.optionsText){
                return s.map(function(item){return item[self.optionsText]}).join(', ');
            }
            return a.join(', ');
        });

        self.accessComboElements = function(nodes){
            //var toplevelNode = nodes[0];
            $elem = $(nodes).find('#lblSelectedValues');
            $combolist =  $(nodes).find('#combolist');
            
            $elem.click(function(){
                $combolist.show();
                $elem.addClass('glow');
                $(document).on('click.comboSelections', function(){
                    if(!$.contains($wrapper[0], arguments[0].target)){
                        $combolist.hide();
                        $(document).off('.comboSelections');
                        $elem.removeClass('glow');
                    }
                });
            });
        };
    };

    var checkboxDropdownBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'checkboxDropdownTemplateStr';
            var config = {
                selectedOptions : value.selectedOptions,
                element: element,
                options: value.options,
                optionsValue: value.optionsValue,
                optionsText: value.optionsText,
                optionsCaption: value.optionsCaption,
                enabled: value.enabled === undefined ? true: value.enabled
            };
            
            var chkdd = new CheckboxDropdownVM(config);

            ko.renderTemplate(template, chkdd, { templateEngine: templateEngine, afterRender : chkdd.accessComboElements.bind(chkdd) }, element, 'replaceChildren');

            return { controlsDescendantBindings: true };
        }
    };

    var EditLabelVM = function(config){
        this.title = config.title;
        this.editingTitle = ko.observable(false);
        this.href = ko.isObservable(config.href) ? config.href: ko.observable(config.href);
        this.overrideTitle = ko.observable();
        this.editTitle = function(){
            //temp = this.title();
            this.editingTitle(true);
            this.overrideTitle(ko.unwrap(this.title));
            return false;
        }
        this.cancelEdit = function(){
            //this.title(temp);
            this.editingTitle(false);
        }
        this.acceptEdit = function(){
            this.editingTitle(false);
            this.title(this.overrideTitle());
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

    var sortableList = {
        init: function(element, valueAccessor) {
            var list = valueAccessor();
            $(element).sortable({
                cursor: 'move',
                handle: '.handle',
                forcePlaceholderSize: true,
                update: function(event, ui) {
                      //retrieve our actual data item
                      var oldPos = ui.item.data('index');
                      //figure out its new position
                      var newPos = ko.utils.arrayIndexOf(ui.item.parent().children(), ui.item[0]);
                      //remove the item and add it back in the right spot
                      if (newPos >= 0) {
                            var widgetList = list().sort(function(x, y){
                                return x.displayIndex() - y.displayIndex();
                            });
                          var item = widgetList[oldPos];
                          var len = widgetList.length;
                          
                          if(newPos < oldPos){
                            for(var i=newPos;i<oldPos;i++){
                                widgetList[i].displayIndex(i+1);
                            };
                          }
                          if(newPos > oldPos){
                            for(var i=oldPos+1;i<=newPos;i++){
                                widgetList[i].displayIndex(i-1);
                            };
                          }
                          item.displayIndex(newPos);
                    }
                }
          });
        }
    };

    var resizeText = {
        update: function(element, valueAccessor){
            var txt = ko.utils.unwrapObservable(valueAccessor());
            if(!txt) return;
            $(element).html(txt);
            var w = $(element).width();
            var h = $(element).height();
            //console.log('height: ' + h + '; width: ' + w);
            var maxFontSize = 0;
            function resize(){
                var x = {width:0, height: 0}, f = parseInt(h * 9/10), l = 0;
                do{
                    x = drata.utils.textToPixel(txt, 'font-size:' + f + 'px;');
                    //console.log(x);
                    //console.log('font: ' + f);
                    f = f - 10;
                    l++;
                }
                while((x.width > w - 20 || x.height > h) && l < 10);
                $(element).css('font-size', f + 'px');
            }
            resize();
        }
    }

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
    ko.bindingHandlers.comboBox = comboBindingHandler;
    ko.bindingHandlers.ddComboBox = ddComboBindingHandler;
    ko.bindingHandlers.editLabel = editLabelBindingHandler;
    ko.bindingHandlers.sortableList = sortableList;
    ko.bindingHandlers.resizeText = resizeText;
    ko.bindingHandlers.checkboxDropdown = checkboxDropdownBindingHandler;

    ko.virtualElements.allowedBindings.editLabel = true;
    ko.virtualElements.allowedBindings.sortableList = true;
})(ko, jQuery);