
var SegmentProcessor = function(){
    var self = this;
    self.segment = new Segmentor();
    var dataKey = 'shoppercheckout';
    var graphData;


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
                
                self.draw(graphData[0].values, segmentModel.chartType);
            });
        }
    };
    
    self.draw = function(mydata, chartType){
        var chart;
        switch(chartType)
        {
            case 'line':
                chart = drata.charts.lineChart().drawLabels(false).yticks(2).xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval);
            break;
            case 'area':
                chart = drata.charts.areaChart().drawLabels(false).includeDataMarkers(true).yticks(2).xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval);
            break;
            
            case 'bar':
                chart = drata.charts.barChart().showBarLabels(true);
            break;

            case 'scatter':
                chart = drata.charts.scatterPlot().xAxisType(segmentModel.dataGroup.xAxisType).dateInterval(segmentModel.dataGroup.timeseriesInterval);
                break;
        }

        d3.select('#graph svg').remove();
        d3.select('#graph').append('svg');
        d3.select('#graph svg')
            .datum(mydata)
            .call(chart);
    };

    var segmentModel = JSON.parse('{"selection":[{"groupType":"selection","groups":[],"logic":"+","groupBy":"sum","selectedProp":"price","isComplex":false},{"groupType":"selection","groups":[],"logic":"+","groupBy":"avg","selectedProp":"discount","isComplex":false}],"dataGroup":{"hasGrouping":true,"groupByProp":"timestamp","groupByInterval":"year","divideByInterval":"5","groupByIntervalType":"date","hasDivideBy":true,"divideByProp":"errorCount","divideByIntervalType":"numeric","groupByIntervalOptions":["1h","5m","60s","1d","1w","month","quarter","year"],"divideByIntervalOptions":[],"errors":[]},"group":[],"dataFilter":{"intervalType":"static","min":"03/02/2012","max":"05/11/2014","dateProp":"timestamp"},"chartType":"bar"}');
    
    DataRetriever.getUniqueProperties(dataKey, function(propertyTypes){
        self.segment.initialize(segmentModel, propertyTypes);    
        self.process();
    });

}