 ;(function(root) {
    var LineChart = function(){
        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);
                
                chart.update = function() { 
                    container
                    .transition()
                    .duration(1000)
                    .call(chart);
                };
                
                var z = d3.scale.category20();
                var m = {l:20, r:20, t:20, b:20};
                var w = $(container[0]).width() - m.l -m.r;
                var h = $(container[0]).height() -m.t -m.b;
                
                var x = d3.time.scale()
                    .range([0, width]);

                var y = d3.scale.linear()
                    .range([height, 0]);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");
            });
            
            return chart;
        };
        return chart;
    };
    root.drata.ns('charts').extend({
        LineChart : LineChart
    });
})(this);