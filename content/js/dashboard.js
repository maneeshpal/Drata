
(function(root, ko){
    "use strict";
    var Dashboard = function(dashboardId){
        var self = this;
        self.name = ko.observable();
        var theme;
        self.index= 1;
        self.loading = ko.observable(true);
        self.widgets = ko.observableArray();
        self.dashboardNotFound = ko.observable();
        self.loadDashboard = function(d_id){
            dashboardId = d_id;
            drata.apiClient.getDashboard(dashboardId).then(function(dashboard){
                self.name(dashboard.name);
                drata.cPanel.topBar.currentDashboardName(dashboard.name);
                drata.cPanel.theme(dashboard.theme);
                theme = dashboard.theme;

                //dashboardId = d._id;
                drata.apiClient.getWidgetsOfDashboard(dashboard._id).then(function(widgets){
                    var ind = 0;
                    self.loading(false);
                    widgets = widgets.sort(function(x,y){
                        return x.displayIndex - y.displayIndex;
                    });
                    self.widgets(ko.utils.arrayMap(
                        widgets,
                        function(model) {
                            return new Widget(model, self.index++); 
                        }
                    ));
                    _.each(self.widgets(), function(w){
                        w.displayIndex(ind);
                        ind++;
                    });
                });
                //socket
                drata.nsx.dashboardSyncService.listenWidgetCreated(dashboardId);
            }, function(err){
                self.dashboardNotFound(true);
            });
        };
        
        self.noWidgets = ko.computed(function(){
            return self.widgets().length === 0 && !self.loading();
        });

        self.loadWidget = function(elem,widget){
            widget && widget.loadWidget();
            $(document).foundation();
        };

        self.addWidget = function(widgetModel){
            var widget = new Widget(widgetModel, self.index++);
            self.widgets.push(widget);
        };

        self.deleteWidget = function(widget){
            if(confirm('This will permanently remove this Widget. Do you wish to Continue ?')){
                widget.remove();
                self.widgets.remove(widget);    
            }
        };

        self.getId = function(){
            return dashboardId;
        };

        self.update = function(){
            if(self.dashboardNotFound()) return;
            var model = {
                name: self.name(),
                _id: dashboardId,
                theme: theme
            };
            drata.apiClient.upsertDashboard(model);    
        };

        drata.pubsub.subscribe('themechanged', function(eventName, newTheme){
            if(newTheme !== theme){
                theme = newTheme;
                self.update();
            }
        });

        self.loadDashboard(dashboardId);
    };

    var Widget = function(widgetModel, index, previewMode){
        var self = this;
        var chartData;
        self.previewMode = previewMode;
        self.widgetId = 'widget'+index;
        self.displayIndex = ko.observable(widgetModel.displayIndex);
        self.pieKeys = ko.observableArray([]);
        self.selectedPieKey = ko.observable();
        self.widgetHeight = ko.observable();
        self.widgetLoaded = ko.observable();
        var _name = ko.observable(widgetModel.name || 'New widget'),
        _sizex = ko.observable(widgetModel.sizex),
        _sizey = ko.observable(widgetModel.sizey);
        
        var content, chartType = drata.global.chartType;

        function setWidgetHeight () {
            var wh = ($(window).height()- 45 - (45 * self.sizey())) / self.sizey();
            self.widgetHeight(Math.max(200, wh));
        };

        self.name = ko.computed({
            read: function(){
                return _name();
            },
            write: function(newValue){
                _name(newValue);
                self.update();
                //self.resizeContent();
            }
        });

        self.sizex = ko.computed({
            read: function(){
                if(previewMode) return '4';
                return _sizex();
            },
            write: function(newValue){
                if(newValue === _sizex()) return;
                _sizex(newValue);
                self.update();
                self.resizeContent();
            }
        });

        self.sizey = ko.computed({
            read: function(){
                if(previewMode) return '2';
                return _sizey();
            },
            write: function(newValue){
                if(newValue === _sizey()) return;
                _sizey(newValue);
                self.update();
                self.resizeContent();
            }
        });

        self.widgetClass= ko.computed(function(){
            return 'widget-size-' + self.sizex();
        });

        self.getId = function(){
            return widgetModel._id;
        };

        self.parseError = ko.observable();
        self.widgetLoading = ko.observable(true);

        self.chartType = ko.observable(widgetModel.segmentModel.chartType);
        
        self.logoClass = ko.computed(function(){
            return drata.global.chartIcon[self.chartType()];
        });

        self.update = function(){
            if(previewMode) return;
            var m = self.getModel();
            if(!m._id) return;
            drata.apiClient.updateWidget(m).then(function(resp){

            });
        };

        self.contentTemplate = ko.computed(function(){
            var contentOptions = {
                index : index,
                widgetUpdate : self.update.bind(self)
            }
            switch(self.chartType()){
                case chartType.line:
                    content = new LineContent(contentOptions);
                    break;
                case chartType.area:
                    content = new AreaContent(contentOptions);
                    break;
                case chartType.pie:
                    content = new PieContent(contentOptions);
                    break;
                case chartType.bar:
                    content = new BarContent(contentOptions);
                    break;
                case chartType.scatter:
                    content = new ScatterContent(contentOptions);
                    break;
                case chartType.trend:
                    content = new NumericContent(contentOptions);
                    break;
            }
            return {
                name: content.template, 
                data: content
            };
        });

        self.editWidget = function () {
            var widgetId = self.getId();
            
            if(widgetModel.isDemo) {
                location.hash = '#editwidget/demo';
                drata.pubsub.publish('widgetedit', {
                    widgetModel: widgetModel
                });
            }
            else{
                location.hash = '#editwidget/' + widgetId;    
            }
        };

        var _t = undefined, resize = true;

        self.resizeContent = function(){
            _t && clearTimeout(_t);
            if(!resize) return;
            if(!content || !content.resize || !!self.parseError()) return;
            _t = setTimeout( function () {
                previewMode && setWidgetHeight();
                content.resize();
            }, 500);
        };

        self.clearTimeouts = function(){
            resize = false;
            _t && clearTimeout(_t);
        };

        self.loadWidget = function(wm){
            self.widgetLoaded(false);
            self.widgetLoading(true);
            if(wm) widgetModel = wm;
            var resizeContent = widgetModel.sizex !== _sizex() || widgetModel.sizey !== _sizey();
            _sizex(widgetModel.sizex);
            _sizey(widgetModel.sizey);
            _name(widgetModel.name);
            resizeContent && self.resizeContent();
            self.parseError(undefined);
            self.chartType(widgetModel.segmentModel.chartType);
            
            drata.apiClient.getData({
                dataSource: widgetModel.dataSource, 
                database: widgetModel.database, 
                collectionName: widgetModel.selectedDataKey, 
                segment: widgetModel.segmentModel
            }).then(function(response){
                chartData = response;
                if(!response || response.length === 0) {
                    self.widgetLoading(false);
                    self.parseError('No data found');
                    return;
                }

                var dataToMap;
                if(widgetModel.segmentModel.chartType === 'pie'){
                    dataToMap = chartData[0].values;
                }
                else
                {
                    dataToMap = chartData;
                }
                var pieKeys = dataToMap.map(function(dataItem, index){
                    return {label: dataItem.key, value: index};
                });
                
                self.pieKeys(pieKeys);
                self.widgetLoading(false);
                self.widgetLoaded(true);
                drata.pubsub.subscribe('resizewidgets',self.resizeContent.bind(self));
            }, function(error){
                self.widgetLoading(false);
                self.parseError(error.responseText);
            });
        };

        self.getCurrentData = function() {
            return !self.parseError() && chartData.slice();
        };

        self.getModel = function (argument) {
            widgetModel.sizex = _sizex();
            widgetModel.sizey = _sizey();
            widgetModel.displayIndex = self.displayIndex();
            widgetModel.name = self.name();
            if(content && content.getModel){
                widgetModel.contentModel = content.getModel();
            }
            
            return widgetModel;
        };
        
        self.selectedPieKey.subscribe(function(newValue){
            if(!newValue) return;
            if((widgetModel.segmentModel.chartType === 'pie' &&  chartData[0].values.length === 0) ||
                chartData[newValue.value].values.length === 0){
                self.parseError('No data found');
                return;
            }

            if(widgetModel.segmentModel.chartType === 'pie'){
                content && content.change && content.change(chartData[0], widgetModel.segmentModel, widgetModel.contentModel, newValue);
            }else{
                content && content.change && content.change(chartData[newValue.value], widgetModel.segmentModel, widgetModel.contentModel);
            }
        });
        
        // self.updatePosition = function(){
        //     var model = {
        //         sizex : self.sizex(),
        //         sizey: self.sizey(),
        //         name: self.name(),
        //         displayIndex: self.displayIndex(),
        //         _id: widgetModel._id
        //     };
        //     drata.apiClient.updateWidget(model);
        // };

        self.remove = function(){
            self.clearTimeouts();
            drata.apiClient.deleteWidget(widgetModel._id);
        };

        self.displayIndex.subscribe(function(){
            self.update();
        });

        _sizex.subscribe(setWidgetHeight)
        _sizey.subscribe(setWidgetHeight);

        setWidgetHeight();

        if(!previewMode){
            drata.nsx.dashboardSyncService.listenWidgetUpdated(widgetModel._id);
            drata.nsx.dashboardSyncService.listenWidgetRemoved(widgetModel._id);
        }
    };

    var LineContent = function(contentOptions){
        var self = this;
        self.widgetContentId = 'widgetContent'+ contentOptions.index;
        self.template = 'content-template';
        var chart, chartData;
        
        self.drawChart = function(_data, segmentModel){
            chart = drata.charts.lineChart().xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval).includeDataMarkers(true);
            d3.select('#'+self.widgetContentId +' svg')
                .datum(_data.values)
                .call(chart);
        };

        self.resize = function(){
            chart && chart.resize && chart.resize();
        };
        
        self.change = function(_data, _segmentModel){
            if(chart){
                chart.change && chart
                    .xAxisType(_segmentModel.dataGroup.xAxisType)
                    .dateInterval(_segmentModel.dataGroup.timeseriesInterval)
                    .includeDataMarkers(true).change(_data.values);
            }else{
                self.drawChart(_data, _segmentModel);
            }
        };
    };

    var NumericContent = function(contentOptions){
        var self = this;
        self.widgetContentId = 'widgetContent'+ contentOptions.index;
        self.template = 'numeric-content-template';
        var chart, chartData, segmentModel;
        
        self.remainingDataPoints = ko.observableArray();
        self.dataKeys = ko.observableArray();
        self.selectedDataKeys = ko.observableArray();
        self.latestDp = ko.observable();
        self.lastButOneDp = ko.observable();
        self.initialDp = ko.observable();
        self.currentDataKey = ko.observable('');
        
        self.backgroundChartType = ko.observable();
        
        var combinedObj = {}, currentIndexes = [];
        var firstArr = [];
        var xtextFormat = function(){
            return drata.utils.getTextFormat({
                formatType: segmentModel.dataGroup.xAxisType,
                formatSubType: segmentModel.dataGroup.timeseriesInterval
            });
        };

        var ytextFormat = function(){
            return drata.utils.getTextFormat({
                formatType: 'numeric'
            });
        };

        self.selectedDataKeys.subscribe(function(newValue){
            var indexes = newValue.map(function(i){
                return i.value;
            });

            self.currentDataKey(newValue.map(function(i){
                return i.key;
            }).join(' + '));

            if(indexes.length === 0) return;
            var outgoing = _.difference(currentIndexes, indexes);
            var incoming = _.difference(indexes, currentIndexes);
            for(var i = 0; i < incoming.length; i++){
                currentIndexes.push(incoming[i]);
                _.each(chartData[incoming[i]].values, function(dp){
                    if(!combinedObj[dp.x]) combinedObj[dp.x] = 0;
                    combinedObj[dp.x] += dp.y;  
                });
            }

            for(var i = 0; i < outgoing.length; i++){
                currentIndexes.splice(currentIndexes.indexOf(outgoing[i]), 1);
                _.each(chartData[outgoing[i]].values, function(dp){
                    //if(!combinedObj[dp.x]) combinedObj[dp.x] = 0;
                    combinedObj[dp.x] -= dp.y;
                    //if(combinedObj[dp.x] === 0) delete combinedObj[dp.x];
                });
            }

            var currentData = [];
            if(segmentModel.dataGroup.xAxisType === 'date'){
                _.each(combinedObj, function(item, x){
                    currentData.push({
                        x: new Date(+x),
                        y: item
                    });
                });

            }
            else{
                _.each(combinedObj, function(item, x){
                    currentData.push({
                        x: +x,
                        y: item
                    });
                });            
            }
            
            currentData.sort(function(x, y){
                return x.x - y.x;
            });

            firstArr = currentData.slice();
            drawSideBar();
            drawChartBackground(self.backgroundChartType());
            //self.setChartBackground('area');
        });

        self.mainHeading = ko.computed(function(){
            return self.latestDp() ? self.latestDp().yLabel : '';
        });
        
        self.subHeading = ko.computed(function(){
            return self.currentDataKey() && self.latestDp() ? drata.utils.format('{0} for {1}',self.currentDataKey(), self.latestDp().xLabel) : '';
        });

        self.totalPerChange = ko.computed(function(){
            if(!self.latestDp()) return undefined;
            return drata.utils.percChange(self.latestDp().y, self.initialDp().y);
        });

        var uniqueXvalues;
        self.drawChart = function(_data, _segmentModel, _contentModel){
            chartData = _data.values;
            segmentModel = _segmentModel;
            self.backgroundChartType(_contentModel && _contentModel.backgroundChartType ?  _contentModel.backgroundChartType : 'area');
            self.dataKeys(chartData.map(function(item, index){
                return {
                    key: item.key,
                    value: index
                }
            }));
            combinedObj = {}, currentIndexes = [];
            self.selectedDataKeys(self.dataKeys());
        };
        
        var drawSideBar = function(mydata, chartType){
            var prev = firstArr[0].y, xFormat = xtextFormat(), yFormat = ytextFormat();
            var rdp = firstArr.map(function(dp){
                var ret = {
                    x: dp.x,
                    y: dp.y,
                    yLabel: yFormat(dp.y),
                    xLabel: xFormat(dp.x),
                    perc : drata.utils.percChange(dp.y, prev)
                }
                prev = dp.y;
                return ret;
            });

            self.initialDp(rdp[0]);
            self.latestDp(rdp.pop());

            self.remainingDataPoints(rdp.reverse());
            self.lastButOneDp(rdp[0]);
            //self.latestDp(rdp[0]);
        };

        self.setChartBackground = function(chartType){
            self.backgroundChartType(chartType);
            drawChartBackground();
            contentOptions.widgetUpdate && contentOptions.widgetUpdate();
        };

        var drawChartBackground = function(){
            var data, xFormat = xtextFormat(), chartType = drata.global.chartType;
            firstArr = firstArr.map(function(i){
                delete i.key;
                return i;
            });

            switch(self.backgroundChartType())
            {
                case chartType.line:
                    chart = drata.charts.lineChart().drawLabels(false).xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval).drawXAxis(false).drawYAxis(true);
                    data = [{
                        key: self.currentDataKey(),
                        values: firstArr.slice()
                    }];
                break;
                case chartType.area:
                    chart = drata.charts.areaChart().drawLabels(false).includeDataMarkers(false).xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval).drawXAxis(false).drawYAxis(true);
                    data = [{
                        key: self.currentDataKey(),
                        values: firstArr.slice()
                    }];
                break;
                case chartType.bar:
                    data = [{
                        key: self.currentDataKey(),
                        values: firstArr.map(function(dp){
                            return {
                                key: xFormat(dp.x),
                                value: +dp.y
                            }
                        })
                    }];
                    chart = drata.charts.barChart().drawLabels(false).drawXAxis(false).drawYAxis(false);
                    break; 
                case chartType.pie:
                    data = {
                        key: self.currentDataKey(),
                        values: firstArr.map(function(dp){
                            return {
                                key: xFormat(dp.x),
                                value: +dp.y
                            }
                        })
                    }
                    chart = drata.charts.pieChart().drawOuterLabels(false).drawPolyLines(false);
                    break;
            }

            d3.select('#'+self.widgetContentId +' svg').remove();
            d3.select('#'+self.widgetContentId).append('svg');
            d3.select('#'+self.widgetContentId +' svg')
                .datum(data)
                .call(chart);
        };

        self.resize = function(){
            var a = self.latestDp();
            self.latestDp(undefined);
            chart && chart.resize && chart.resize();
            self.latestDp(a);
        };
        
        self.change = function(_data, _segmentModel, _contentModel){
            if(!_segmentModel) return;
            self.drawChart(_data, _segmentModel, _contentModel);
        };

        self.getModel = function(){
            return {
                backgroundChartType : self.backgroundChartType()
            }
        }
    };

    var ScatterContent = function(contentOptions){
        var self = this;
        self.widgetContentId = 'widgetContent'+ contentOptions.index;
        self.template = 'content-template';
        var chart;
        self.drawChart = function(_data, segmentModel){
            chart = drata.charts.scatterPlot().xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval);
            
            d3.select('#'+self.widgetContentId +' svg')
                .datum(_data.values)
                .call(chart);
            return chart;
        };
        self.resize = function(){
            chart && chart.resize && chart.resize();
        };
        self.change = function(_data, _segmentModel){
            if(chart){
                chart.change && chart.xAxisType(_segmentModel.dataGroup.xAxisType).dateInterval(_segmentModel.dataGroup.timeseriesInterval).change(_data.values);
            }else{
                self.drawChart(_data, _segmentModel);
            }
        };
    };

    var BarContent = function(contentOptions){
        var self = this;
        self.widgetContentId = 'widgetContent'+contentOptions.index;
        self.template = 'content-template';
        self.contentType = 'bar';
        var chart;

        self.drawChart = function(_data){
            chart = drata.charts.barChart().showBarLabels(true);
            d3.select('#'+self.widgetContentId +' svg')
                .datum(_data.values)
                .call(chart);
            //return chart;
        };
        self.resize = function(){
            chart && chart.resize && chart.resize();
        };
        self.change = function(_data, _segmentModel){
            if(chart){
                chart.change && chart.change(_data.values);
            }else{
                self.drawChart(_data, _segmentModel);
            }
        };
    };

    var AreaContent = function(contentOptions){
        var self = this;
        self.widgetContentId = 'widgetContent'+contentOptions.index;
        self.template = 'content-template';
        var chart;
        self.drawChart = function(_data, segmentModel){
            chart = drata.charts.areaChart().xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval).includeDataMarkers(true);
            d3.select('#'+self.widgetContentId +' svg')
                .datum(_data.values)
                .call(chart);
        };
        self.resize = function(){
            chart && chart.resize && chart.resize();
        };
        self.change = function(_data, _segmentModel){
            if(chart){
                chart.change && chart.xAxisType(_segmentModel.dataGroup.xAxisType).dateInterval(_segmentModel.dataGroup.timeseriesInterval).includeDataMarkers(true).change(_data.values);
            }else{
                self.drawChart(_data, _segmentModel);
            }
        };
    };

    var PieContent = function(contentOptions){
        var self = this;
        self.widgetContentId = 'widgetContent'+contentOptions.index;
        self.contentType = 'pie';
        self.template = 'content-template';
        var chart;
        
        self.drawChart = function(_data){
            chart = drata.charts.pieChart();
            d3.select('#'+self.widgetContentId + ' svg')
                .datum(_data.values[0])
                .call(chart);
        };
        self.resize = function(){
            chart && chart.resize && chart.resize();
        };
        
        self.change = function(_data, _segmentModel, _contentModel, pieKey){
            if(chart){
                chart.change && chart.change(_data.values[pieKey.value]);
            }else{
                self.drawChart(_data, _segmentModel);
            }
        };
    };
    root.drata.ns('dashboard').extend({
        dashboard: Dashboard,
        widget: Widget
    });
})(this, ko);