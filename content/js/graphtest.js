
var SegmentProcessor = function(){
    var self = this;
    self.segment = new Segmentor();

    var dataKey = 'shoppercheckout';


    self.process = function(){
        var errors = ko.validation.group(self.segment, {deep:true});
        if(errors().length > 0){
            errors.showAllMessages();
        }
        else{
            var segmentModel = self.segment.getModel();
            DataRetriever.getData({applyClientfilters: false, dataKey: dataKey, segment:segmentModel}, function(res){
                var graphData = Conditioner.getGraphData(segmentModel, res);
                self.draw(segmentModel,graphData[0].values);
            });
        }
    };
  
    self.draw = function(segmentModel, mydata){
        var chart;
        switch(segmentModel.chartType)
        {
            case 'line':
                chart = drata.charts.lineChart().xAxisType(segmentModel.dataGroup.xAxisType);
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
        d3.select('#graph svg').remove();
        d3.select('#graph').append('svg');
        d3.select('#graph svg')
            .datum(mydata)
            .call(chart);
        
    };

    DataRetriever.getUniqueProperties(dataKey,function(res){
        var group = JSON.parse('{"selection":[{"groupType":"selection","groups":[],"logic":"+","groupBy":"value","selectedProp":"price","isComplex":false}],"dataGroup":{"hasGrouping":false,"xAxisType":"date","xAxisProp":"timestamp","timeseriesInterval":"300000","errors":[]},"group":[],"dataFilter":{"intervalKind":"day","intervalType":"dynamic","min":19,"max":60,"dateProp":"timestamp"},"chartType":"area"}');
        group.propertyTypes = res;
        self.segment.initialize(group);
        self.process();
    });
    
}