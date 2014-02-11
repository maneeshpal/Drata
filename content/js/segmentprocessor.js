
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

        var result = Conditioner.getGraphData(model, data);

        self.outputData(JSON.stringify(result, null, '\t'));

        self.draw(result[0].values);
    };
  
    self.draw = function(mydata){
        var chart = drata.charts.barChart();
        d3.select('#graph svg')
            .datum(mydata)
            .call(chart);
        
    };
    
}