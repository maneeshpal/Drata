"use strict";

var Dashboard = function(dashboardId){
    var self = this;
    self.name = ko.observable();
    self.index= 1;
    self.loading = ko.observable(true);
    self.widgets = ko.observableArray();
    self.dashboardNotFound = ko.observable();
    self.loadDashboard = function(d_id){
        dashboardId = d_id;
        drata.apiClient.getDashboard(dashboardId, function(response){
            var d = response.result;
            if(!d || !response.success){
                self.dashboardNotFound(true);
                return;
            }
            self.name(d.name);
            drata.cPanel.topBar.currentDashboardName(d.name);
            //dashboardId = d._id;
            drata.apiClient.getWidgetsOfDashboard(d._id, function(widgetResponse){
                var ind = 0;
                var widgets = widgetResponse.result;
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
        console.log('widget added to dashboard');
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
    var _name = ko.observable(previewMode ? 'Preview' : (widgetModel.name || 'widget x')), _sizex = ko.observable(widgetModel.sizex), _sizey = ko.observable(widgetModel.sizey);

    self.name = ko.computed({
        read: function(){
            return _name();
        },
        write: function(newValue){
            _name(newValue);
            self.update();
            self.resizeContent();
        }
    });

    self.sizex = ko.computed({
        read: function(){
            return _sizex();
        },
        write: function(newValue){
            console.log('sizex saved in db');
            _sizex(newValue);
            self.update();
            self.resizeContent();
        }
    });

    self.sizey = ko.computed({
        read: function(){
            return _sizey();
        },
        write: function(newValue){
            _sizey(newValue);
            console.log('sizey saved in db');
            self.update();
            self.resizeContent();
        }
    });

    // self.sizex = ko.observable(widgetModel.sizex || 4);
    // self.sizey = ko.observable(widgetModel.sizey || 2);
    self.widgetClass= ko.computed(function(){
        if(previewMode) return 'widget-size-4';
        return 'widget-size-' + self.sizex();
    });

    self.getId = function(){
        return widgetModel._id;
    };

    self.parseError = ko.observable();
    self.widgetLoading = ko.observable(true);

    self.chartType = ko.observable(widgetModel.segmentModel.chartType);
    
    self.logoClass = ko.computed(function(){
        switch(self.chartType()){
            case 'line':
                return 'icon-statistics';
                break;
            case 'area':
                return 'icon-graph';
                break;
            case 'pie':
                return 'icon-pie';
                break;
            case 'bar':
                return 'icon-bars2';
                break;
            case 'scatter':
                return  'icon-air';
                break;
            case 'numeric':
                return 'icon-uniE650';
                break;
        }
    });

    self.widgetHeight = ko.computed(function(){
        if(previewMode) return 300;
        var wh = ($(window).height()- 45 - (45 * self.sizey())) / self.sizey();
        wh = Math.max(200, wh);
        return wh;
    });

    self.update = function(){
        if(previewMode) return;
        var m = self.getModel();
        if(!m._id) return;
        drata.apiClient.updateWidget(m, function(resp){
            console.log('widget updated');    
        });
    };

    var content;
    self.contentTemplate = ko.computed(function(){
        var contentOptions = {
            index : index,
            widgetUpdate : self.update.bind(self)
        }
        switch(self.chartType()){
            case 'line':
                content = new LineContent(contentOptions);
                break;
            case 'area':
                content = new AreaContent(contentOptions);
                break;
            case 'pie':
                content = new PieContent(contentOptions);
                break;
            case 'bar':
                content = new BarContent(contentOptions);
                break;
            case 'scatter':
                content = new ScatterContent(contentOptions);
                break;
            case 'numeric':
                content = new NumericContent(contentOptions);
                break;
        }
        return {
            name: content.template, 
            data: content
        };
    });

    self.editWidget = function () {
        drata.pubsub.publish('widgetedit', {
            widgetModel: widgetModel
        });
        location.hash = '#editwidget';
    };

    var _t = undefined, resize = true;

    self.resizeContent = function(){
        _t && clearTimeout(_t);
        if(!resize) return;
        if(!content || !content.resize || !!self.parseError()) return;
        _t = setTimeout(content.resize, 500);
    };

    self.clearTimeouts = function(){
        resize = false;
        _t && clearTimeout(_t);
    };

    self.loadWidget = function(wm){
        if(wm) widgetModel = wm;
        var resizeContent = widgetModel.sizex !== _sizex() || widgetModel.sizey !== _sizey();
        _sizex(widgetModel.sizex);
        _sizey(widgetModel.sizey);
        _name(widgetModel.name);
        resizeContent && self.resizeContent();
        self.parseError(undefined);
        self.chartType(widgetModel.segmentModel.chartType);
        console.log('loadWidget');
        DataRetriever.getData({applyClientAggregation:false, dataSource: widgetModel.dataSource, database: widgetModel.database, collectionName: widgetModel.selectedDataKey, segment: widgetModel.segmentModel}, function(response){
            if(!response.success){
                self.parseError(response.message);
                return;
            }
            chartData = response.result;
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
            drata.pubsub.subscribe('resizewidgets',self.resizeContent.bind(self));
        });
    };

    self.getModel = function (argument) {
        widgetModel.sizex = self.sizex();
        widgetModel.sizey = self.sizey();
        widgetModel.displayIndex = self.displayIndex();
        widgetModel.name = self.name();
        if(content && content.getModel){
            widgetModel.contentModel = content.getModel();
        }
        
        return widgetModel;
    };
    
    self.selectedPieKey.subscribe(function(newValue){
        if(!newValue) return;
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

    // self.sizex.subscribe(function(){
    //     self.update();
    //     self.resizeContent();
    // });
    // self.sizey.subscribe(function(){
    //     self.update();
    //     self.resizeContent();
    // });

    self.displayIndex.subscribe(function(){
        self.update();
    });
    // self.name.subscribe(function(){
    //     self.update();
    // });
    //socket
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
        chart = drata.charts.lineChart().xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval).includeDataMarkers(false);
        d3.select('#'+self.widgetContentId +' svg')
            .datum(_data.values)
            .call(chart);
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
        //chart && 
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

    // self.backgroundChartType.subscribe(function(newValue){
        
    // });

    var drawChartBackground = function(){
        var data, xFormat = xtextFormat();
        firstArr = firstArr.map(function(i){
            delete i.key;
            return i;
        });

        switch(self.backgroundChartType())
        {
            case 'line':
                chart = drata.charts.lineChart().drawLabels(false).xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval).drawXAxis(false).drawYAxis(true);
                data = [{
                    key: self.currentDataKey(),
                    values: firstArr.slice()
                }];
            break;
            case 'area':
                chart = drata.charts.areaChart().drawLabels(false).includeDataMarkers(false).xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval).drawXAxis(false).drawYAxis(true);
                data = [{
                    key: self.currentDataKey(),
                    values: firstArr.slice()
                }];
            break;
            case 'bar':
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
            case 'pie':
                data = {
                    key: self.currentDataKey(),
                    values: firstArr.map(function(dp){
                        return {
                            key: xFormat(dp.x),
                            value: +dp.y
                        }
                    })
                }
                chart = drata.charts.pieChart().drawOuterLabels(false);
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
        //dummy(dummy() +1);
        chart && chart.resize && chart.resize();
        console.log('resizing');
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
            chart.change && chart.change(_data.values);
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
        chart = drata.charts.areaChart().xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval).includeDataMarkers(false);
        d3.select('#'+self.widgetContentId +' svg')
            .datum(_data.values)
            .call(chart);
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