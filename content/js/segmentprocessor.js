

var SegmentProcessor = function(){
    var self = this;
    self.segment = new Segmentor({
        properties: ['a', 'b', 'c', 'timestamp']
    });
    self.filteredData = ko.observable();
    self.outputData = ko.observable();
    self.rawData = ko.observable();
    self.data = DataRetriever.getData('key1');
    self.rawData(JSON.stringify(self.data, null, '\t'));

    self.processConditionsSection = function(){
        var jsGroup = ko.toJS(self.segment.group);
        var filteredData = Conditioner.filterData(self.data, jsGroup);
        self.filteredData(JSON.stringify(filteredData, null, '\t'));
    };

    self.processDataGroups = function(){
        var model = self.segment.getModel();
        //temp
        var filteredData = Conditioner.filterData(self.data, model.group);
        self.filteredData(JSON.stringify(filteredData, null, '\t'));
        //end temp
        var result = Conditioner.getGraphData(model, self.data);
        self.outputData(JSON.stringify(result, null, '\t'));
    };
}