"use strict";
var Dashboard = function(){
    var self = this;
    self.name = ko.observable();
    self.index= 1;
    self.loading = ko.observable(true);
    self.widgets = ko.observableArray();
    self.newDashboardItem = ko.observable();
    self.dashboardNotFound = ko.observable(false);
    var dashboardId = window.location.pathname.split('/')[2];
    
    var loadDashboard = function(){
        drata.apiClient.getDashboard(dashboardId, function(response){
            var d = response.result;
            if(!d || !response.success){
                self.dashboardNotFound(true);
                return;
            }
            self.name(d.name);
            topBar.currentDashboardName(d.name);
            dashboardId = d._id;
            console.time('gettingwidgets');
            drata.apiClient.getWidgetsOfDashboard(d._id, function(widgetResponse){
                var ind = 0;
                var widgets = widgetResponse.result;
                console.timeEnd('gettingwidgets');
                self.loading(false);
                widgets = widgets.sort(function(x,y){
                    return x.displayIndex - y.displayIndex;
                });
                console.time('instantiatewidgets');
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
                 console.timeEnd('instantiatewidgets');
            });
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
        widgetModel.dashboardId = dashboardId;
        delete widgetModel.dateCreated;
        delete widgetModel._id;
        widgetModel.displayIndex = self.widgets().length + 1;
        drata.apiClient.upsertWidget(widgetModel, function(response){
           // widgetModel._id = response._id;
            //widgetModel.dateCreated = response.dateCreated;
            widgetModel = response.result;
            var widget = new Widget(widgetModel, self.index++);
            self.widgets.push(widget);
        });
    };

    self.deleteWidget = function(widget){
        if(confirm('This will permanently remove this Widget. Do you wish to Continue ?')){
            widget.remove();
            self.widgets.remove(widget);    
        }
    };

    if(!dashboardId || dashboardId === 'add'){
        self.newDashboardItem(new DashboardItem({},{isNew: true}));
    }
    else {
        loadDashboard();
    }
};

var Widget = function(widgetModel, index){
    var self = this;
    var chartData;
    self.widgetId = 'widget'+index;
    self.displayIndex = ko.observable(widgetModel.displayIndex);
    self.pieKeys = ko.observableArray([]);
    self.selectedPieKey = ko.observable();
    self.name = ko.observable(widgetModel.name || 'widget x');
    self.sizex = ko.observable(widgetModel.sizex || 1);
    self.sizey = ko.observable(widgetModel.sizey || 1);
    self.widgetClass= ko.computed(function(){
        return 'widget-size-' + self.sizex();
    });

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
        var wh = ($(window).height()- 45 - (45 * self.sizey())) / self.sizey();
        wh = Math.max(200, wh);
        return wh;
    });

    var content;
    self.contentTemplate = ko.computed(function(){
        switch(self.chartType()){
            case 'line':
                content = new LineContent(index);
                break;
            case 'area':
                content = new AreaContent(index);
                break;
            case 'pie':
                content = new PieContent(index);
                break;
            case 'bar':
                content = new BarContent(index);
                break;
            case 'scatter':
                content = new ScatterContent(index);
                break;
            case 'numeric':
                content = new NumericContent(index);
                break;
        }

        return {
            name: content.template, 
            data: content
        };

    });

    self.editWidget = function () {
        $('#graphBuilder').addClass('showme');
        segmentProcessor.attach(widgetModel, self.updateWidget.bind(self));
    };

    var _t = undefined;

    self.resizeContent = function(){
        _t && clearTimeout(_t);
        if(!content || !content.resize || !!self.parseError()) return;
        _t = setTimeout(content.resize, 500);
    };

    self.loadWidget = function(){
        self.parseError(undefined);

        DataRetriever.getData({applyClientfilters:false, dataSource: widgetModel.dataSource, database: widgetModel.database, collectionName: widgetModel.selectedDataKey, segment: widgetModel.segmentModel}, function(response){
            if(!response.success){
                self.parseError(response.message);
                return;
            }
            chartData = response.result;
            // try{
            //     chartData = Conditioner.getGraphData(widgetModel.segmentModel, response.result);
            // }
            // catch(e){
            //     self.parseError(e);
            //     return;
            // }
            var dataToMap;

            if(widgetModel.segmentModel.chartType === 'pie'){
                dataToMap = chartData[0].values;
            }else{
                dataToMap = chartData;
            }
            var pieKeys = dataToMap.map(function(dataItem, index){
                return {label: dataItem.key, value: index};
            });

            self.pieKeys(pieKeys);

            self.selectedPieKey(self.pieKeys()[0]);
            console.time(self.chartType() + ' : ' + self.widgetId);
            content.drawChart(chartData[0], widgetModel.segmentModel);
            self.widgetLoading(false);
            //prevent double draw on page load
            console.timeEnd(self.chartType() + ' : ' + self.widgetId);
            setTimeout(function(){
                drata.utils.windowResize(self.resizeContent.bind(self));
            }, 200);
        });
        
    };

    self.updateWidget = function (newModel) {
        widgetModel = newModel;
        self.chartType(widgetModel.segmentModel.chartType);
        self.loadWidget();
        self.update();
    };

    self.getModel = function (argument) {
        widgetModel.sizex = self.sizex();
        widgetModel.sizey = self.sizey();
        widgetModel.displayIndex = self.displayIndex();
        widgetModel.name = self.name();
        return widgetModel;
    };
    
    self.selectedPieKey.subscribe(function(newValue){
        if(!newValue) return;
        var dataToMap = chartData;
        if(widgetModel.segmentModel.chartType === 'pie'){
                dataToMap = chartData[0].values;
        }else{
            dataToMap = chartData;
        }
        content && content.change && content.change(dataToMap[newValue.value]);
    });
    
    self.update = function(){
        var m = self.getModel();
        if(!m._id) return;
        drata.apiClient.upsertWidget(m);
    };

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
      drata.apiClient.deleteWidget(widgetModel._id);
    };

    self.sizex.subscribe(function(){
        self.update();
        self.resizeContent();
    });
    self.sizey.subscribe(function(){
        self.update();
        self.resizeContent();
    });
    self.displayIndex.subscribe(function(){
        //console.log('displayIndex updating..');
        self.update();
    });
    self.name.subscribe(function(){
        self.update();
    });
};

var LineContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.template = 'content-template';
    var chart, chartData;
    
    var _t;
    self.drawChart = function(_data, segmentModel){
        //chartData = _data;
        _t && clearTimeout(_t);
        
        chart = drata.charts.lineChart().xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval).includeDataMarkers(false);
        d3.select('#'+self.widgetContentId +' svg')
            .datum(_data.values)
            .call(chart);
        //return chart;
    };

    self.resize = function(){
        chart && chart.resize && chart.resize();
    };
    
    self.change = function(_data){
        chart && chart.change && chart.change(_data.values);
    };
};

var NumericContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.template = 'numeric-content-template';
    var chart, chartData, segmentModel;
    
    self.remainingDataPoints = ko.observableArray();
    self.dataKeys = ko.observableArray();
    self.selectedDataKeys = ko.observableArray();
    self.latestDp = ko.observable();
    self.lastButOneDp = ko.observable();
    self.initialDp = ko.observable();
    
    self.backgroundChartType = ko.observable('area');
    
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

    var perc = function(curr, prev){
        if(prev === 0) return 100;
        return +(((curr * 100)/prev - 100).toFixed(2));
    };

    
    self.selectedDataKeys.subscribe(function(newValue){
        var indexes = newValue.map(function(i){
            return i.value;
        });
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

        // if(segmentModel.dataGroup.xAxisType === 'date'){
        //    firstArr = currentData.map(function(dp){
        //         return {
        //             x: new Date(dp.x), 
        //             y: dp.y
        //         }
        //     });
        // }
        // else{
            firstArr = currentData.slice();
        //}
        drawSideBar();
        drawChartBackground(self.backgroundChartType());
    });

    self.mainHeading = ko.computed(function(){
        return self.latestDp() ? self.latestDp().yLabel : '';
    });

    self.currentDataKey = ko.observable();
    
    self.subHeading = ko.computed(function(){
        return self.currentDataKey() && self.latestDp() ? drata.utils.format('{0} for {1}',self.currentDataKey(), self.latestDp().xLabel) : '';
    });

    self.totalPerChange = ko.computed(function(){
        if(!self.latestDp()) return 0;
        return perc(self.latestDp().y, self.initialDp().y);
    });

    var _t, uniqueXvalues;
    self.drawChart = function(_data, _segmentModel){
        chartData = _data.values;
        segmentModel = _segmentModel;
        self.currentDataKey(_data.key);
        self.dataKeys(chartData.map(function(item, index){
            return {
                key: item.key,
                value: index
            }
        }));
        combinedObj = {}, currentIndexes = [];
        self.selectedDataKeys(self.dataKeys());
        //self.selectedDataKey(self.dataKeys()[0]);
        _t && clearTimeout(_t);
    };
    
    var drawSideBar = function(mydata, chartType){
        var prev = firstArr[0].y, xFormat = xtextFormat(), yFormat = ytextFormat();
        var rdp = firstArr.map(function(dp){
            var ret = {
                x: dp.x,
                y: dp.y,
                yLabel: yFormat(dp.y),
                xLabel: xFormat(dp.x),
                perc : perc(dp.y, prev)
            }
            prev = dp.y;
            return ret;
        });

        self.initialDp(rdp[0]);
        self.latestDp(rdp.pop());

        self.remainingDataPoints(rdp.reverse());
        self.lastButOneDp(rdp[0]);
    };

    self.setChartBackground = function(chartType){
        self.backgroundChartType(chartType);
    };

    self.backgroundChartType.subscribe(function(newValue){
        drawChartBackground(newValue);
    });

    var drawChartBackground = function(chartType){
        var data, xFormat = xtextFormat();
        firstArr = firstArr.map(function(i){
            delete i.key;
            return i;
        });

        switch(chartType)
        {
            case 'line':
                chart = drata.charts.lineChart().drawLabels(false).xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval);
                data = [{
                    key: 'xxxx',
                    values: firstArr.slice()
                }];
            break;
            case 'area':
                chart = drata.charts.areaChart().drawLabels(false).includeDataMarkers(true).yticks(2).xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval);
                data = [{
                    key: 'xxxx',
                    values: firstArr.slice()
                }];
            break;
            case 'bar':
                data = [{
                    key: 'xxxx' + (Math.random() * 100),
                    values: firstArr.map(function(dp){
                        return {
                            key: xFormat(dp.x),
                            value: +dp.y
                        }
                    })
                }];
                chart = drata.charts.barChart();
                break; 
            case 'pie':
                data = {
                    key: 'xxxx',
                    values: firstArr.map(function(dp){
                        return {
                            key: xFormat(dp.x),
                            value: +dp.y
                        }
                    })
                }
                chart = drata.charts.pieChart();
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
        self.latestDp(a);
    };
    
    self.change = function(_data){
        if(!segmentModel) return;
        //chartData = _data.values;
        self.drawChart(_data, segmentModel);
        var a = 0;
        //chart && chart.change && chart.change(_data.values);
    };
};

var ScatterContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.template = 'content-template';
    var chart;
    var _t;
    self.drawChart = function(_data, segmentModel){
        //chartData = _data;
        _t && clearTimeout(_t);

        chart = drata.charts.scatterPlot().xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval);
        
        d3.select('#'+self.widgetContentId +' svg')
            .datum(_data.values)
            .call(chart);
        return chart;
    };
    self.resize = function(){
        chart && chart.resize && chart.resize();
    };
    self.change = function(_data){
        chart && chart.change && chart.change(_data.values);
    };
};

var BarContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.template = 'content-template';
    self.contentType = 'bar';
    var chart, _t;

    self.drawChart = function(_data){
        //chartData = _data;
        _t && clearTimeout(_t);
        
        chart = drata.charts.barChart().showBarLabels(true);
        d3.select('#'+self.widgetContentId +' svg')
            .datum(_data.values)
            .call(chart);
        return chart;
    };
    self.resize = function(){
        chart && chart.resize && chart.resize();
    };
    self.change = function(_data){
        chart && chart.change && chart.change(_data.values);
    };
};

var AreaContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.template = 'content-template';
    var chart;
    var _t;
    self.drawChart = function(_data, segmentModel){
        //chartData = _data;
        _t && clearTimeout(_t);

        chart = drata.charts.areaChart().xAxisType(segmentModel.dataGroup.xAxisType).includeDataMarkers(false).dateInterval(segmentModel.dataGroup.timeseriesInterval);
        
        d3.select('#'+self.widgetContentId +' svg')
            .datum(_data.values)
            .call(chart);
        return chart;
    };
    self.resize = function(){
        chart && chart.resize && chart.resize();
    };
    self.change = function(_data){
        chart && chart.change && chart.change(_data.values);
    };
};

var PieContent = function(index){
    var self = this;
    self.widgetContentId = 'widgetContent'+index;
    self.contentType = 'pie';
    self.template = 'content-template';
    var _t = undefined;
    //var chartData = [];
    var chart;
    
    self.drawChart = function(_data){
        //chartData = _data[0].values;
        _t && clearTimeout(_t);
        chart = drata.charts.pieChart();

        d3.select('#'+self.widgetContentId + ' svg')
            .datum(_data.values[0])
            .call(chart);
        return chart;
    };
    self.resize = function(){
        chart && chart.resize && chart.resize();
    };
    self.change = function(_data){
        chart && chart.change && chart.change(_data);
    };
};

var SegmentProcessor = function(){
    var self = this;
    self.widgetName = ko.observable();
    self.addUpdateBtnText = ko.observable('Add Widget');
    self.processSegment = true;
    self.previewGraph = ko.observable(false);
    self.dataKeys = ko.observableArray();
    
    self.selectedDataKey = ko.observable();
    self.dataSource = ko.observable();
    self.dataSourceNames = ko.observableArray();
    self.databaseNames = ko.observableArray();
    self.database = ko.observable();
    self.parseError = ko.observable();
    self.propertyTypes = ko.observable();
    
    var cloneModel = {};
    
    self.dataSource.subscribe(function(newValue){
        if(!newValue){
            self.databaseNames(undefined);
            self.database(undefined);
        }
        else{
            if(cloneModel.dataSource !== newValue ){
                cloneModel.dataSource = newValue;
                cloneModel.database = undefined;
            }
            drata.apiClient.getDatabaseNames(newValue, function(resp){
                self.databaseNames(resp.result);
                self.database(cloneModel.database);
            });
        }
    });

    self.database.subscribe(function(newValue){
        if(!newValue || !self.dataSource()){
            self.dataKeys(undefined);
            self.selectedDataKey(undefined);
        }
        else{
            if(cloneModel.database !== newValue ){
                cloneModel.database = newValue;
                cloneModel.selectedDataKey = undefined;
            }
            drata.apiClient.getDataKeys({dataSource: self.dataSource(),database: newValue}, function(resp){
                self.dataKeys(resp.result);
                self.selectedDataKey(cloneModel.selectedDataKey);
            });
        }
    });

    self.selectedDataKey.subscribe(function(newValue){
        if(!newValue || !self.dataSource() || !self.database()){
            self.propertyTypes(undefined);
        }
        else {
            if(cloneModel.selectedDataKey !== newValue){
                cloneModel.segmentModel = undefined;
                cloneModel.selectedDataKey = newValue;
            }
            drata.apiClient.getUniqueProperties({dataSource: self.dataSource(), database: self.database(), collectionName: newValue}, function(response){
                self.propertyTypes(response.result);
                self.segment.initialize(cloneModel.segmentModel, response.result);
            });
        }
    });

    drata.apiClient.getDataSourceNames(function(resp){
        self.dataSourceNames(resp.result);
    });

    self.segment = new Segmentor();
    self.notifyWidget = function () {
        cloneModel.segmentModel = self.segment.getModel();
        
        if(!cloneModel.segmentModel)
            return;
        cloneModel.dataSource = self.dataSource();
        cloneModel.database = self.database();
        cloneModel.selectedDataKey  = self.selectedDataKey();

        self.onWidgetUpdate && self.onWidgetUpdate(cloneModel);
        !self.onWidgetUpdate && dashboard.addWidget(cloneModel);
        cloneModel = {};
        self.onWidgetUpdate = undefined;
        self.onWidgetCancel = undefined;
        self.addUpdateBtnText('Add');
        self.dataSource(undefined);
        self.previewGraph(false);
        $('#graphBuilder').removeClass('showme');
        //self.newWidget(true);
    };
    var dbns, dks, pts;
    self.attach = function (model,onWidgetUpdate, onWidgetCancel) {
        cloneModel = drata.utils.clone(model);
        cloneModel.dataSource = cloneModel.dataSource || 'drataDemoExternal';
        cloneModel.database = cloneModel.database || 'shopperstop';
        self.dataSource(cloneModel.dataSource);
        
        self.addUpdateBtnText('Update Widget');
        self.onWidgetUpdate = onWidgetUpdate;
        self.onWidgetCancel = onWidgetCancel;
        
        self.handleGraphPreview(cloneModel.dataSource, cloneModel.database, cloneModel.selectedDataKey ,cloneModel.segmentModel);
    };

    self.widgetCancel = function() {
        self.parseError(undefined);
        self.onWidgetUpdate = undefined;
        self.onWidgetCancel = undefined;
        self.addUpdateBtnText('Add Widget');
        self.previewGraph(false);

        self.dataSource(undefined);
        //self.selectedDataKey(undefined);
        $('#graphBuilder').removeClass('showme');
        cloneModel = {};
    };
    var chart, _t;
    self.handleGraphPreview = function(dataSource, database, selectedDataKey, segmentModel){
        self.parseError(undefined);
        if(segmentModel.chartType === 'numeric') return;
        DataRetriever.getData({applyClientfilters: false, dataSource: dataSource, database:database, collectionName: selectedDataKey, segment: segmentModel}, function(response){
            if(!response.success){
                self.parseError(response.message);
                return;
            }
            var data = response.result;
            // var data;
            // try{
            //     data = Conditioner.getGraphData(segmentModel, response.result);
            // }
            // catch(e){
            //     self.parseError(e);
            //     throw e;
            // }
            if(!data) return;         

            self.previewGraph(true);
            
            var mydata = data[0].values;

            switch(segmentModel.chartType)
            {
                case 'line':
                    chart = drata.charts.lineChart().xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval);
                break;
                case 'area':
                    chart = drata.charts.areaChart().xAxisType(segmentModel.dataGroup.xAxisType);
                break;
                case 'bar':
                    chart = drata.charts.barChart();
                    break; 
                case 'pie':
                    chart = drata.charts.pieChart();
                    mydata = mydata[0];
                break;
                case 'scatter':
                    chart = drata.charts.scatterPlot();
                break;
            }
            d3.select('#previewgraph').selectAll('svg').remove();
            d3.select('#previewgraph').append('svg');

            d3.select('#previewgraph svg')
                .datum(mydata)
                .call(chart);

            drata.utils.windowResize(function(){
                if(!chart) return;
                _t && clearTimeout(_t);
                _t = setTimeout(chart.resize, 500);
            });
        });
    };
    
    self.preview = function(){
        var model = self.segment.getModel();
        if(!model) return;
        self.handleGraphPreview(self.dataSource(), self.database(), self.selectedDataKey(), model);
    };
    self.previewGraph.subscribe(function(newValue){
        if(!newValue){
            d3.select('#previewgraph').selectAll('svg').remove();
            d3.select('#previewgraph').append('svg');
            _t && clearTimeout(_t);
            chart = undefined;   
        }
    });
};


var TopBar = function(){
    var self = this;
    self.addWidget = function(){
        $('#graphBuilder').toggleClass('showme');
    };
    self.manageDashboards = function(){
        dashboardManager.populateDashboards();
        $('#dashboardManager').toggleClass('showme');
    };
    self.manageWidgets = function(){
        widgetManager.bindWidgets(widgetManager.chosenChartTypes());
        $('#widgetManager').toggleClass('showme');
    };

    self.tagList = ko.observableArray();
    self.untaggedList = ko.observableArray();

    drata.apiClient.getAllTags(function(resp){
        var tagDashboardList = _.groupBy(resp.result, function(item){
            return item.tagName;
        });
        for(var i in tagDashboardList){
            if(tagDashboardList.hasOwnProperty(i)){
                var a = tagDashboardList[i];
                if(i === '__'){
                    self.untaggedList(a);
                }else{
                    self.tagList.push({tagName: i, dashboards: a});    
                }
                
            }
        }
    });
    self.currentDashboardName = ko.observable('Dashboards');
}