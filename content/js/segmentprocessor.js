var segmentModel = {
            selection: {
                complexGroups: [],
                props: [
                    {
                        prop: "a"
                    }
                ]
            },
            dataGroup: {
                xAxisProp: "timestamp",
                groupByProp: "a"
            },
            group: {
                groupType: "conditions",
                groups: [
                    {
                        prop: "a",
                        logic: "and",
                        conditionType: "conditions",
                        renderType: "condition",
                        operation: ">",
                        selectionGroup: {
                            groupType: "selections",
                            renderType: "group",
                            logic: "+",
                            groups: []
                        },
                        isComplex: false,
                        value: "4"
                    }
                ],
                logic: "and"
            },
            properties: [
                "a",
                "b",
                "c",
                "timestamp"
            ]
        };

var SegmentProcessor = function(){
    var self = this;
    self.segment = new Segmentor();
    self.segment.initialize(segmentModel);
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
        
        var filteredData = Conditioner.filterData(self.data, model.group);
        self.filteredData(JSON.stringify(filteredData, null, '\t'));
        
        //var result = Conditioner.getGraphData(model, self.data);
        var result = Conditioner.getPieData(model, self.data);
        self.outputData(JSON.stringify(result, null, '\t'));
        //self.drawLineChart(result);
        self.drawPieChart(result);
    };
    self.toggleSegmentDisplay = function(){
        $('.segment-wrapper').toggleClass('showme');
    };
    self.drawLineChart = function(mydata){
        var chart;
        nv.addGraph(function() {
            chart = nv.models.lineChart().useInteractiveGuideline(true);

            chart.x(function(d,i) { 
                  return d.x;
            });

            
            var formatter = d3.format(",.1f");
            chart.margin({right: 40});
            chart.xAxis // chart sub-models (ie. xAxis, yAxis, etc) when accessed directly, return themselves, not the parent chart, so need to chain separately
                .tickFormat(
                    formatter
                  );
            chart.transitionDuration(1000);
            chart.yAxis
                .axisLabel('maneesh')
                .tickFormat(d3.format(',.2f'));


            d3.select('#graph svg')
                .datum(mydata)
              //.transition().duration(1000)
                .call(chart);

            nv.utils.windowResize(chart.update);

            return chart;
      });
    };
    self.drawPieChart = function(mydata){
        nv.addGraph(function() {
            var chart = nv.models.pieChart()
            .x(function(d) { return d.key })
            .y(function(d) { return d.value })
            .showLabels(true);

            d3.select("#graph svg")
            .datum(mydata[0])
            .transition().duration(1200)
            .call(chart);

            return chart;
        });
    }
}