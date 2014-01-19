
 ;(function(root) {
    var PreviewPieChart = function(elementId, chartData){
        var self = this;

        self.elem = document.getElementById(elementId); 
        
        self.elemHeight = function(){
            return self.elem.clientHeight;
        };
        self.elemWidth = function(){
            return self.elem.clientWidth;
        };
        self.drawChart = function(){
            var numPies = chartData.length;
            var w = self.elemWidth();
            var h = self.elemHeight();
            var sqrt = Math.sqrt(numPies);
            var maxgrid = Math.ceil(sqrt);
            var mingrid = Math.floor(sqrt);
            var x,y;
            _.each(chartData, function(chartDatum, index){
                var total = _.reduce(chartDatum.values, function(memo, num){
                    return memo + (+num.value);
                }, 0);
                _.each(chartDatum.values, function(d){
                  d.perc = ((d.value * 100) / total).toFixed(1);
                });
            });
            
            if(mingrid === maxgrid){
                //perfect grid
                x = mingrid;
                y = mingrid;
            }
            else if(numPies > (mingrid * mingrid) + mingrid){
                //closer to the max 
                x = maxgrid;
                y = maxgrid;
            }
            else {
                x = maxgrid;
                y = mingrid; 
            }
            var xradius = w/(x*2);
            var yradius = h/(y*2);

            var z = d3.scale.category20();
            
            var r = Math.min(xradius, yradius) - 20;
            var m = 20;
            var arc = d3.svg.arc()
                .outerRadius(r)
                .innerRadius(r / 2);

            d3.select('#'+ self.elem.id)
                .selectAll("svg").remove();

            var svg = d3.select('#'+ self.elem.id)
                .selectAll("svg")
                .data(chartData)
                .enter()
                .append("svg")
                .datum(function(d){
                    return d.values;
                })
                .attr('class', 'pie')
                .attr("width", (r * 2) + m) 
                .attr("height", (r * 2) + m)
                .append("svg:g")
                .attr("transform", "translate(" + (r + m) + "," + (r + m) + ")");

            var pie = d3.layout.pie()
                .sort(null)
                .value(function(d) { 
                    return d.value; 
                });

            var g = svg.selectAll(".arc")
                .data(pie)
                .enter().append("g")
                .attr("class", "arc");

            var path = g.append("path")
                .attr("d", arc)
                .each(function(d){
                    this._current = d;
                })
                .attr("fill", function(d, i) { return z(i); });

            g.append("text")
                .attr("class", "donuttext")
                .attr("transform", function(d) {
                    return "translate(" + arc.centroid(d) + ")";
                })
                .attr("dy", ".35em")
                .style("text-anchor", "middle")
                .text(function(d) { 
                    return d.data.key + ' ('+ d.data.perc +'%)';
            });
        };
        
        self.change = function(value){
            var curData = _.find(chartData, function(d){
                return d.key === value;
            });
            var arcTween = function(a) {
                var i = d3.interpolate(this._current, a);
                this._current = i(0);
                return function(t) {
                    return self.arc(i(t));
                };
            };

            self.path
                .data(curData.values)
                .transition()
                .duration(750).attrTween("d", arcTween);

            self.svg.datum(curData.values)
                .selectAll("path")
                .data(self.pie);
        };
        self.drawChart();
        
        self.removeChart = function(){
            self._t && clearTimeout(self._t);
            d3.select('#'+ self.elem.id)
            .selectAll("svg").remove();
        };

        self.onResize = function(){
            self._t && clearTimeout(self._t);
            self._t = setTimeout(self.chart.bind(self), 2000);
        };
        window.chartData = chartData;
    };

    var PieChart = function(){
        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);
                var enterAntiClockwise = {
                  startAngle: Math.PI * 2,
                  endAngle: Math.PI * 2
                };
                var enterClockwise = {
                  startAngle: 0,
                  endAngle: 0
                };
                chart.update = function() { 
                    container
                    .transition()
                    .duration(1000)
                    .call(chart);
                };
                //chart.container = this;
                chart.change = function(newData){
                    container = container.datum(newData);
                    drawPie(newData);
                    drawText(newData);
                };
                var w = $(container[0]).width()/2;
                var h = $(container[0]).height()/2;
                var z = d3.scale.category20();
                var m = 20;
                var r = Math.min(w, h) - m;

                var pie = d3.layout.pie()
                    .value(function(d) {
                     return d.value;
                 }).sort(null);

                var arc = d3.svg.arc()
                    .outerRadius(r)
                    .innerRadius(r / 2);

                container.selectAll("svg").remove();

                var svg = container
                    .append("svg")
                    .attr("width", (r * 2) + m) 
                    .attr("height", (r * 2) + m);


                var arcTween = function(a) {
                    var i = d3.interpolate(this._current, a);
                    this._current = i(0);
                    return function(t) {
                        return arc(i(t));
                    };
                };
                // Interpolate exiting arcs start and end angles to Math.PI * 2
                // so that they 'exit' at the end of the data
                function arcTweenOut(a) {
                    var i = d3.interpolate(this._current, {
                        startAngle: Math.PI * 2, 
                        endAngle: Math.PI * 2, 
                        value: 0
                    });
                    this._current = i(0);
                    return function (t) {
                        return arc(i(t));
                    };
                };

                
                var arcGroup = svg.append("svg:g")
                    .attr('class', 'arcs-group')
                    .attr("transform", "translate(" + (r + m) + "," + (r + m) + ")");
                
                function drawPie(_data){
                    var paths = arcGroup.selectAll("path").data(pie(_data.values));
                    paths.enter().append('path')
                        .attr("fill", function (d, i) {
                            return z(i);
                        })
                        .each(function (d) {
                            this._current = {
                                data: d.data,
                                value: d.value,
                                startAngle: enterAntiClockwise.startAngle,
                                endAngle: enterAntiClockwise.endAngle
                            };
                      }); // store the initial values

                    paths.exit()
                      .transition()
                      .duration(750)
                      .attrTween('d', arcTweenOut)
                      .remove(); // now remove the exiting arcs
                    
                    paths.transition().duration(750).attrTween("d", arcTween); // redraw the arcs
                };

                function drawText(_data){
                    var texts = textGroup.selectAll("text")
                        .data(pie(_data.values));
                    texts.enter()
                        .append("svg:text")
                        .attr("class", "donuttext")
                        .attr("dy", ".35em")
                        .style("text-anchor", "middle")
                        .text(function(d) { 
                            return d.data.key;
                        });
                    texts.exit().remove();
                    texts.transition().duration(750).attr("transform", function(d) {
                            return "translate(" + arc.centroid(d) + ")";
                        });
                    
                };
                drawPie(data);
                
                var textGroup = svg.append("svg:g")
                    .attr("class", 'text-group')
                    .attr("transform", "translate(" + (r + m) + "," + (r + m) + ")");
                drawText(data);
            });
            
            return chart;
        };
        return chart;
    };
    root.drata.ns('charts').extend({
        PieChart : PieChart,
        PreviewPieChart: PreviewPieChart
    });
})(this);