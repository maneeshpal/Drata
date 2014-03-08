
var SegmentProcessor = function(){
    var self = this;
    self.segment = new Segmentor();
    self.newWidget = ko.observable(true);
    var data = DataRetriever.getData('Shopper Stop');
    var properties = DataRetriever.getUniqueProperties(data);
    self.segment.initialize({properties:properties, chartType : 'bar'}); 

    self.outputData = ko.observable();
    self.rawData = ko.observable();
    //self.data = DataRetriever.getData('key1');
    self.rawData(JSON.stringify(data, null, '\t'));
 
    self.process = function(){
        var model = self.segment.getModel();

        Conditioner.properties = properties;
        var result = Conditioner.getGraphData(model,data);

        self.outputData(JSON.stringify(result, null, '\t'));

        self.draw(model,result[0].values);
    };
  
    self.draw = function(segmentModel, mydata){
        var chart;
        switch(segmentModel.chartType)
        {
            case 'line':
                chart = drata.charts.lineChart().xAxisType(segmentModel.dataGroup.xAxisType);
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
    
}