
var SegmentProcessor = function(){
    var self = this;
    self.segment = new Segmentor();
    self.maxAllowedHeight = ko.observable(100);
    var dataKey = 'shoppercheckout';
    self.remainingDataPoints = ko.observableArray();
    self.chartType = ko.observable();
    var graphData;
    self.dataKeys = ko.observableArray();
    self.selectedDataKey = ko.observable();
    self.latestDp = ko.observable();
    self.lastButOneDp = ko.observable();
    self.initialDp = ko.observable();

    var perc = function(curr, prev){
        return +(((curr * 100)/prev - 100).toFixed(2));
    };
    var segmentModel;
    self.process = function(){
        var errors = ko.validation.group(self.segment, {deep:true});
        if(errors().length > 0){
            errors.showAllMessages();
        }
        else{
            segmentModel = self.segment.getModel();
            DataRetriever.getData({applyClientfilters: false, dataKey: dataKey, segment:segmentModel}, function(res){
                graphData = Conditioner.getGraphData(segmentModel, res);
                console.log(graphData);
                self.dataKeys(graphData[0].values.map(function(item, index){
                    return {
                        key: item.key,
                        value: index
                    }
                }));
                self.selectedDataKey(self.dataKeys()[0]);
                //self.draw(graphData[0].values[0], 'area');
            });
        }
    };
    
    self.selectedDataKey.subscribe(function(newValue){
        if(!newValue) return;
        self.draw(graphData[0].values[newValue.value], 'area');
    });

    self.mainHeading = ko.computed(function(){
        return self.latestDp() ? self.latestDp().yLabel : '';
    })
    self.subHeading = ko.computed(function(){
        return self.selectedDataKey() && self.latestDp() ? drata.utils.format('{0} for {1}',self.selectedDataKey().key, self.latestDp().xLabel) : '';
    });

    self.totalPerChange = ko.computed(function(){
        if(!self.latestDp()) return 0;
        return perc(self.latestDp().y, self.initialDp().y);
    });

    
    self.draw = function(mydata, chartType){
        var chart;
        var firstArr = mydata.values;
        var xtextFormat = drata.utils.getTextFormat({
            formatType: segmentModel.dataGroup.xAxisType,
            formatSubType: segmentModel.dataGroup.timeseriesInterval
        });

        var ytextFormat = drata.utils.getTextFormat({
            formatType: 'numeric'
        });

        if(segmentModel.dataGroup.xAxisType === 'date'){
            _.each(firstArr, function(dataPoint){
                dataPoint.x = new Date(dataPoint.x);
            });
        }
        var prev = firstArr[0].y;
        var rdp = firstArr.map(function(dp){
            var ret = {
                x: dp.x,
                y: dp.y,
                yLabel: ytextFormat(dp.y),
                xLabel: xtextFormat(dp.x),
                perc : perc(dp.y, prev)
            }
            prev = dp.y;
            return ret;
        });

        
        switch(chartType)
        {
            case 'line':
                chart = drata.charts.lineChart().drawLabels(false).yticks(2).xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval);
            break;
            case 'area':
                chart = drata.charts.areaChart().drawLabels(false).includeDataMarkers(true).yticks(2).xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval);
            break;
            case 'bar':
                firstArr = rdp.map(function(dp){
                    return {
                        key: dp.xLabel,
                        value: +dp.y
                    }
                });
                chart = drata.charts.barChart();
                break; 
            case 'pie':
                chart = drata.charts.pieChart();
                
                break;
            case 'scatter':
                chart = drata.charts.scatterPlot().xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval);
                break;
        }

        self.initialDp(rdp[0]);
        self.latestDp(rdp.pop());

        self.remainingDataPoints(rdp.reverse());
        self.lastButOneDp(rdp[0]);
        var inputData = [{
            key: mydata.key,
            values: firstArr
        }];


        d3.select('#graph svg').remove();
        d3.select('#graph').append('svg');
        d3.select('#graph svg')
            .datum(inputData)
            .call(chart);
    };

    var segmentModel = JSON.parse('{"selection":[{"groupType":"selection","groups":[],"logic":"+","groupBy":"sum","selectedProp":"price","isComplex":false}],"dataGroup":{"hasGrouping":true,"groupByProp":"itemAgeGroup","xAxisType":"date","timeseries":true,"xAxisProp":"timestamp","timeseriesInterval":"year","errors":[]},"group":[],"dataFilter":{"intervalType":"static","min":"03/01/2008","max":"03/28/2014","dateProp":"timestamp"},"chartType":"line"}');
    
    DataRetriever.getUniqueProperties('shoppercheckout', function(propertyTypes){
        self.segment.initialize(segmentModel, propertyTypes);    
        self.process();
    });

}