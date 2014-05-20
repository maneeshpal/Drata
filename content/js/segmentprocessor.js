
var SegmentProcessor = function(){
    var self = this;
    self.segment = new Segmentor();
    self.newWidget = ko.observable(true);
    self.rawData = ko.observable();
    self.query = ko.observable();
    var dataKey = 'shoppercheckout';
    self.opjs = ko.observable();
    var segmentModel = JSON.parse('{"selection":[{"groupType":"selection","groups":[{"groupType":"selection","groups":[],"logic":"+","selectedProp":"price","isComplex":false},{"groupType":"selection","groups":[],"logic":"*","selectedProp":"4","isComplex":false}],"logic":"+","aliasName":"Price*4","groupBy":"sum","selectedProp":"Price*4","isComplex":true},{"groupType":"selection","groups":[{"groupType":"selection","groups":[],"logic":"+","selectedProp":"price","isComplex":false},{"groupType":"selection","groups":[],"logic":"*","selectedProp":"3","isComplex":false}],"logic":"+","aliasName":"Proce*3","groupBy":"sum","selectedProp":"Proce*3","isComplex":true},{"groupType":"selection","groups":[],"logic":"+","groupBy":"sum","selectedProp":"price","isComplex":false}],"dataGroup":{"hasGrouping":false,"xAxisType":"date","timeseries":true,"xAxisProp":"timestamp","timeseriesInterval":"year","errors":[]},"group":[],"dataFilter":{"intervalType":"static","min":"03/01/2008","max":"03/28/2014","dateProp":"timestamp"},"chartType":"line"}');
    DataRetriever.getUniqueProperties(dataKey, function(propertyTypes){
        self.segment.initialize(segmentModel, propertyTypes);   
        self.process();
    });

    self.outputData = ko.observable();
    

    self.process = function(){
        var segmentModel = self.segment.getModel();

        //self.rawData(JSON.stringify(segmentModel.group, null, '\t'));

        var data;
        DataRetriever.getData({applyClientfilters: false, dataKey: dataKey, segment:segmentModel}, function(res){
            self.rawData(JSON.stringify(res, null, '\t'));
            self.query(JSON.stringify(Conditioner.getGraphData(segmentModel, res), null, '\t'));
        });

    };
  
}