
var SegmentProcessor = function(){
    var self = this;
    self.segment = new Segmentor();
    self.newWidget = ko.observable(true);
    self.rawData = ko.observable();
    var dataKey = 'APIQuoteRequest';
    // DataRetriever.getData('', function(res){
    //     data = res;
         
    //     self.rawData(JSON.stringify(data, null, '\t'));
    // });

    DataRetriever.getUniqueProperties(dataKey,function(res){
        //var group = JSON.parse('[{"groupType":"condition","groups":[],"logic":"and","selection":{"groupType":"selection","groups":[],"logic":"+","selectedProp":"price","isComplex":false},"isComplex":false,"operation":"=","value":"500"},{"groupType":"condition","groups":[{"groupType":"condition","groups":[],"logic":"and","selection":{"groupType":"selection","groups":[],"logic":"+","selectedProp":"tax","isComplex":false},"isComplex":false,"operation":"=","value":"40"},{"groupType":"condition","groups":[],"logic":"or","selection":{"groupType":"selection","groups":[],"logic":"+","selectedProp":"errorCount","isComplex":false},"isComplex":false,"operation":"=","value":"2"}],"logic":"and","selection":{"groupType":"selection","groups":[],"logic":"+","isComplex":false},"isComplex":true,"operation":"="}]');
        self.segment.initialize({properties:res, chartType : 'bar'});    
    });
    
    self.outputData = ko.observable();
    

    self.process = function(){
        var segmentModel = self.segment.getModel();

        self.rawData(JSON.stringify(segmentModel.group, null, '\t'));
        //self.outputData(JSON.stringify(drata.utils.getMongoQuery(segmentModel.group), null, '\t'));

        var data;
        DataRetriever.getData({applyClientfilters: false, dataKey: dataKey, segment:segmentModel}, function(res){
            self.outputData(JSON.stringify(res, null, '\t'));
        });


        // var errors = ko.validation.group(self.segment, {deep:true});
        // if(errors().length > 0){
        //     errors.showAllMessages();
        // }
        // else{
        //     var model = self.segment.getModel();

        //     Conditioner.properties = properties;
        //     var result = Conditioner.getGraphData(model,data);

        //     self.outputData(JSON.stringify(result, null, '\t'));

        //     self.draw(model,result[0].values);    
        // }
        
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