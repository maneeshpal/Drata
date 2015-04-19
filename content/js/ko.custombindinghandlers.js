  
(function(ko, $){
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
            '<div class="combo-txt columns">',
            comboTemplateStr,
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
        '<div class="chk-dd" style="position:relative" data-bind="css: renderType">',
            '<div id="lblSelectedValues" class="chk-dd-label" data-bind="text: displayValuesList, click: handlelabelClick"></div>',
            '<ul id="combolist" class="combolist no-bullet" style="display:none; margin-top:0" data-bind="foreach: options">',
                '<li>',
                    '<input type="checkbox" data-bind="attr:{\'id\': \'chkdd\' + $index()}, checkedValue: $parent.optionsValue ? $data[$parent.optionsValue] : $data, checked: $parent.selectedOptions" />',
                    '<label data-bind="attr:{\'for\': \'chkdd\'+ $index()}, text: $parent.optionsText ? $data[$parent.optionsText] : $data"></label>',
                '</li>',
            '</ul>',
            '<span class="chk-dd-arrow icon-arrow-down5" data-bind="click: handlelabelClick"></span>',
        '</div>'
    ].join('');

    var dateTemplateStr = [
        '<div class="row collapse">',
            '<div class="small-9 columns">',
                '<input type="text" id="datepicker" data-bind="value:selectedValue, placeholder: placeholder"></input>',
            '</div>',
            '<div class="small-3 columns" data-bind="click: showDatePicker">',
                '<span class="postfix radius" style="z-index:1"><i class="general foundicon-calendar"></i></span>',
            '</div>',
        '</div>'
    ].join('');

    var dependableddComboTemplateStr = [
        '<div class="row collapse">',
            '<select class="combo-dd columns" data-bind="enable: enabled,value: selectedPrefix, options: prefixOptions">',
            '</select>',
            '<!-- ko ifnot: isDate -->',
            '<div class="combo-txt columns">',
            comboTemplateStr,
            '</div>',
            '<!-- /ko -->',
            '<!-- ko if: isDate -->',
            '<div class="combo-dpicker columns">',
            dateTemplateStr,
            '</div>',
            '<!-- /ko -->',
        '</div>'
    ].join('');

    var tabularTemplateStr = [
        '<div class="row collapse">',
            '<div class="small-12 columns">',
                '<!-- ko if: dataKeys().length > 0 -->',
                '<div class="right" data-bind="checkboxDropdown: { options:dataKeys, selectedOptions: selectedDataKeys,optionsCaption: \'Select Groups\', overrideSelectionText: \'{0} groups selected\', renderType: \'small\' }">',
                '</div>',
                '<!-- /ko -->',
                '<h6>Tabular View</h6>',
            '</div>',
        '</div>',
            
        '<div class="row collapse">',
        '<!-- ko foreach: selectedTabulars -->',
            '<div class="tabular-wrapper small-12 columns">',
                '<div class="row tabular-header">',
                    '<div class="columns small-12">',
                        'Selection: <!-- ko text: group --><!-- /ko -->,',
                        '<!-- ko if : subGroup -->',
                        '<!-- ko text: subGroupName --><!-- /ko -->:', 
                        '<!-- ko text: subGroup --><!-- /ko --> <!-- /ko -->',
                    '</div>',
                '</div>',
                '<div class="row tabular-body-header">',
                    '<div class="columns small-6">',
                        '<span data-bind="text: xAxisProp"></span>',
                        '<span class="icon-arrow-down" data-bind="click: sortData.bind($data, \'key\')"></span>',
                    '</div>',
                    '<div class="columns small-6">',
                        '<span data-bind="text: valType"></span>',
                        '<span class="icon-arrow-down" data-bind="click: sortData.bind($data, \'value\')"></span>',
                    '</div>',
                '</div>',
                '<!-- ko foreach: values -->',
                    '<div class="row tabular-body">',
                        '<div class="small-6 columns" data-bind="text: fKey"></div>',
                        '<div class="small-6 columns" data-bind="text: fValue"></div>',
                    '</div>',
                '<!-- /ko -->',
            '</div>',
        '<!-- /ko -->',   
        '</div>'
    ].join('');

    templateEngine.addTemplate('comboTemplateStr', comboTemplateStr);
    templateEngine.addTemplate('ddComboTemplateStr', ddComboTemplateStr);
    templateEngine.addTemplate('editLabelTemplateStr', editLabelTemplateStr);
    templateEngine.addTemplate('checkboxDropdownTemplateStr', checkboxDropdownTemplateStr);
    templateEngine.addTemplate('dateTemplateStr', dateTemplateStr);
    templateEngine.addTemplate('dependableddComboTemplateStr', dependableddComboTemplateStr);
    templateEngine.addTemplate('tabularTemplateStr', tabularTemplateStr);

    /********** KO TEMPLATES ******************/
    var DateTextBoxVM = function(config){
        var self = this, $elem, dp;
        
        self.selectedValue = config.selectedValue;
        self.placeholder = config.placeholder;
        self.enabled = config.enabled;
        var rnd = Math.floor(Math.random() * 1000);
        var options = {
            defaultDate: "-1m",
            changeMonth: true,
            changeYear: true,
            numberOfMonths: 1,
            //onClose: function( selectedDate ) {}
        };

        if(config.maxDate){
            options.maxDate = config.maxDate;
        }

        self.showDatePicker = function(){
            dp && dp.datepicker('show');
        };

        self.initializeDatePicker = function(nodes){
            dp = $(nodes).find('#datepicker');
            dp.attr('id', 'datepicker' + rnd);
            dp.datepicker(options);
        };
    };

    var dateTextBoxBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'dateTemplateStr';
            var config = {
                selectedValue : value.selectedValue|| ko.observable(),
                placeholder: value.placeholder || 'Select',
                enabled: value.enabled === undefined ? true: value.enabled,
                maxDate: value.maxDate
            };
            
            var dateTextBox = new DateTextBoxVM(config);

            ko.renderTemplate(template, dateTextBox, { templateEngine: templateEngine, afterRender : dateTextBox.initializeDatePicker.bind(dateTextBox) }, element, 'replaceChildren');

            return { controlsDescendantBindings: true };
        }
    };

    var dependableDdComboBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'dependableddComboTemplateStr';
            var config = {
                selectedValue : value.selectedValue|| ko.observable(),
                element: element,
                options: value.options || [],
                selectedPrefix: value.selectedPrefix || ko.observable(),
                prefixOptions : value.prefixOptions || ko.observableArray(),
                optionsCaption: value.optionsCaption || 'Select..',
                enabled: value.enabled === undefined ? true: value.enabled,
                allowCustom : value.allowCustom === undefined ? true : value.allowCustom,
                placeholder: value.placeholder || 'Select',
                maxDate: value.maxDate
            };
            
            var vm = new DependableDdComboVM(config);

            ko.renderTemplate(template, vm, { templateEngine: templateEngine, afterRender : vm.afterRender.bind(vm) }, element, 'replaceChildren');

            return { controlsDescendantBindings: true };
        }
    };

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
                    self.selectedValue(undefined);
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
            var filteredList = self.availableOptions().filter(function(opt) {
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

    var DependableDdComboVM = function(config){
        var self = this;
        $.extend(self, new DdComboVM(config));
        $.extend(self, new DateTextBoxVM(config));
        
        self.isDate = ko.computed(function(){
            return self.selectedPrefix() === 'date';
        });

        self.selectedPrefix.subscribe(function(newValue){
            if(newValue === 'bool'){
                self.availableOptions(['true', 'false']);
            }else if(newValue === 'date'){
                self.initializeDatePicker(_nodes);
                self.availableOptions([]);
            }
        });
        var _nodes;
        self.afterRender = function(nodes){
            _nodes = nodes;
            self.accessComboElements(nodes);
            self.initializeDatePicker(nodes);
        }
    };

    var ddComboBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'ddComboTemplateStr';
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
        self.overrideSelectionText = ko.isObservable(config.overrideSelectionText) ? config.overrideSelectionText : ko.observable(config.overrideSelectionText);
        self.options = ko.isObservable(config.options) ? config.options : ko.observableArray(config.options);
        self.optionsText = config.optionsText;
        self.optionsValue = config.optionsValue;
        self.optionsCaption = ko.isObservable(config.optionsCaption) ? config.optionsCaption : ko.observable(config.optionsCaption);
        self.renderType = config.renderType || '';
        self.options.subscribe(function(){
            self.selectedOptions([]);
        });

        self.enabled = ko.isObservable(config.enabled) ? config.enabled : ko.observable(config.enabled);
        var $elem, $combolist, $wrapper = $(config.element);
        
        self.displayValuesList = ko.computed(function() {
            if(self.selectedOptions().length === 0) return self.optionsCaption();

            var selectedOptions = self.selectedOptions();

            if(self.overrideSelectionText()) return drata.utils.format(self.overrideSelectionText(), selectedOptions.length);

            var s = self.options().filter(function(i){
                if(self.optionsValue){
                    return selectedOptions.indexOf(i[self.optionsValue]) > -1;
                }
                else{
                    return selectedOptions.indexOf(i) > -1;
                }
            })

            if(self.optionsText){
                s = s.map(function(item){return item[self.optionsText]});
            }
            return s.join(', ');
        });

        self.handlelabelClick = function () {
            $combolist.show();
            $elem.addClass('glow');
            $(document).on('click.comboSelections', function(){
                if(!$.contains($wrapper[0], arguments[0].target)){
                    $combolist.hide();
                    $(document).off('.comboSelections');
                    $elem.removeClass('glow');
                }
            });
        };

        self.accessComboElements = function(nodes){
            $elem = $(nodes).find('#lblSelectedValues');
            $combolist =  $(nodes).find('#combolist');
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
                overrideSelectionText: value.overrideSelectionText,
                optionsCaption: value.optionsCaption,
                enabled: value.enabled === undefined ? true: value.enabled,
                renderType: value.renderType
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
            if(!w || !h) return;
            //console.log('height: ' + h + '; width: ' + w);
            var maxFontSize = 0, dimToUse = Math.min(w, h);
            function resize(){
                var x = {width:0, height: 0}, f = parseInt( dimToUse * 9/10), l = 0;
                do{
                    x = drata.utils.textToPixel(txt, 'font-size:' + f + 'px;');
                    //console.log(x);
                    //console.log('font: ' + f);
                    f = f - (x.width > w + 60 ? parseInt(( x.width - w )/3) : 10);
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

    var tooltip = {
        init: function(element, valueAccessor){
            var options = valueAccessor();
            var $elem = $(element);

            $elem.click(function() {
                if($elem.data('dropdown')){
                    return;
                }
                
                var size = options.size || 'small';
                var uniqId = 'tt' + +(new Date());
                $elem.attr('data-dropdown', uniqId);
                var contentElem = document.createElement('div');
                contentElem.id = uniqId;
                $(contentElem)
                    .attr('data-dropdown-content', '')
                    .addClass('f-dropdown content ' + size)
                    .html(drata.nsx.toolTipContent[options.datakey]);
                $('body').append(contentElem);
            });
            
            !drata.globalsettings.enableToolTips() && $elem.hide();

            drata.globalsettings.enableToolTips.subscribe(function(show){
                show ? $elem.show() : $elem.hide();
            });
        }
    };

    var Tabular = function (options) {
        var self = this;
        self.group = ko.observable(options.group);
        self.subGroup = ko.observable(options.subGroup);
        self.xAxisProp = ko.observable(options.xAxisProp);
        self.valType = ko.observable(options.valType);
        self.values = ko.observableArray(options.values);
        self.subGroupName = ko.observable(options.subGroupName);
        self.dataKey = options.dataKey;
        //debugging
        //self.level = options.level;
        var sortOrder = { key: ko.observable(), value: ko.observable() };

        self.sortData = function (prop) {
            sortOrder[prop](!sortOrder[prop]());
            self.values.sort(function (c, n) {
                return sortOrder[prop]() ? c[prop] < n[prop] : c[prop] > n[prop];
            })
        };
    }

    var TabularMapper = function (model) {
        var self = this;
        self.headers = ko.observableArray();
        self.selectionHeaders = ko.observableArray();
        self.name = model.name;
        self.data = ko.isObservable(model.data) ? model.data: ko.observable(data);
        self.segment = ko.isObservable(model.segment) ? model.segment: ko.observable(segment);
        self.groupBy = ko.observable(), self.hasDivideBy = ko.observable();
        self.tabulars = ko.observableArray([]);
        self.dataKeys = ko.observableArray();
        self.selectedDataKeys = ko.observableArray();
        
        self.selectedTabulars = ko.computed(function () {
            if(self.dataKeys().length === 0) return self.tabulars();
            return self.tabulars().filter(function(t) {
                return self.selectedDataKeys.indexOf(t.dataKey) > -1;
            })
        });

        function init(data, segment) {
            var segment = self.segment();
            var data = self.data();
            
            if(!segment || !data || data.length === 0) {
                self.tabulars([]);
                self.dataKeys([]);
                return;
            }

            var textFormat_x, textFormat_y, level, h = [];
            self.isTrackChart = drata.global.trackingChartTypes.indexOf(segment.chartType) > -1;
            segment.selection.forEach(function (sel) {
                self.selectionHeaders.push( sel.isComplex ? sel.aliasName: sel.selectedProp);
            })

            if(segment.dataGroup.hasGrouping) {
                self.groupBy(segment.dataGroup.groupByProp);
            }

            if(segment.dataGroup.hasDivideBy) {
                self.groupBy(segment.dataGroup.hasDivideBy);
            }
            
            if (self.isTrackChart) {
                if(!segment.dataGroup.timeseries && !segment.dataGroup.hasGrouping) {
                    level = 3;
                }
                else if(segment.dataGroup.hasGrouping){
                    level = 1;
                }
                else {
                    level = 2;
                }
            }
            else {
                if (!segment.dataGroup.hasGrouping) {
                    level = 3;
                }
                else if (segment.dataGroup.hasGrouping && !segment.dataGroup.hasDivideBy) {
                    level = 2;
                }
                else {
                    level = 1;
                }
            }
            textFormat_y = drata.utils.getTextFormat({
                formatType: 'numeric'
            });

            if (self.isTrackChart) {
                textFormat_x = drata.utils.getTextFormat({
                    formatType: segment.dataGroup.xAxisType,
                    formatSubType: segment.dataGroup.timeseriesInterval
                });
                
                if(segment.dataGroup.xAxisType === 'date') {
                    data.forEach( function(item_level_1) {
                        item_level_1.values.forEach( function(item_level_2) {
                            item_level_2.values.forEach( function(dataPoint) {
                                dataPoint.x = new Date(dataPoint.x);
                            })
                        })
                    })
                }
            }

            _.each(data, function (item_level_1, index_level_1) {
                _.each(item_level_1.values, function (item_level_2, index_level_2) {
                    var t = {};
                    
                    if (self.isTrackChart) {
                        t.valType = level >= 2 ? item_level_2.key : item_level_1.key;
                        t.group = segment.selection[(level >= 2 ? index_level_2 : index_level_1)].selectedProp;
                        t.xAxisProp = segment.dataGroup.xAxisProp;
                    }
                    else {
                        if (level === 3) {
                            t.valType = '';
                            t.group = '';
                            t.xAxisProp = '';
                        }
                        else {
                            t.valType = level === 2 ? item_level_2.key : item_level_1.key;
                            t.group = segment.selection[((level === 2 ? index_level_2 : index_level_1))].selectedProp;    
                            t.xAxisProp = level === 2 ? segment.dataGroup.groupByProp : segment.dataGroup.divideByProp;
                        }
                    }
                    
                    t.level = level;

                    t.subGroup = level >= 2 ? '' : item_level_2.key;
                    t.subGroupName = level >= 2 ? '' : segment.dataGroup.groupByProp;
                    
                    t.values = self.isTrackChart ? 
                    item_level_2.values.map(function(d) {
                        return {
                            fKey : textFormat_x(d.x),
                            fValue: textFormat_y(d.y),
                            key: d.x,
                            value: d.y
                        }
                    }) :  
                    item_level_2.values.map(function(d) {
                        return {
                            fKey : d.key,
                            fValue: textFormat_y(d.value),
                            key: d.key,
                            value: d.value
                        }
                    });

                    var k = [];
                    t.group && k.push(t.group);
                    t.subGroup && k.push(t.subGroup);
                    if(k.length > 0) { 
                        t.dataKey = k.join(' -> ');
                        self.dataKeys.push(t.dataKey); 
                    };
                    
                    self.tabulars.push(new Tabular(t));
                });
            });

            self.selectedDataKeys(self.dataKeys().slice());

        }
        init();
        self.data.subscribe(init);
        self.segment.subscribe(init);
    }

    var tabularMapperBindingHandler = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            var template = 'tabularTemplateStr';
            
            var vm = new TabularMapper(value);

            ko.renderTemplate(template, vm, { templateEngine: templateEngine }, element, 'replaceChildren');

            return { controlsDescendantBindings: true };
        }
    };

    ko.bindingHandlers.slideVisible = slideVisibleBindingHandler;
    ko.bindingHandlers.comboBox = comboBindingHandler;
    ko.bindingHandlers.ddComboBox = ddComboBindingHandler;
    ko.bindingHandlers.editLabel = editLabelBindingHandler;
    ko.bindingHandlers.sortableList = sortableList;
    ko.bindingHandlers.resizeText = resizeText;
    ko.bindingHandlers.checkboxDropdown = checkboxDropdownBindingHandler;
    ko.bindingHandlers.tooltip = tooltip;
    ko.bindingHandlers.dateTextBox = dateTextBoxBindingHandler;
    ko.bindingHandlers.dependableDdCombo = dependableDdComboBindingHandler;
    ko.bindingHandlers.tabular = tabularMapperBindingHandler;

    ko.virtualElements.allowedBindings.editLabel = true;
    ko.virtualElements.allowedBindings.sortableList = true;
    ko.virtualElements.allowedBindings.dateTextBox = true;
    ko.virtualElements.allowedBindings.tabular = true;

})(ko, jQuery);