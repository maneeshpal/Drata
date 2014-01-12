
;(function(root) {
    var PieChart = function(elementId, chartData){
        var self = this;
        self.chartData = chartData;

        self.elem = document.getElementById(elementId); 
        
        self.elemHeight = function(){
            return self.elem.clientHeight;
        };
        self.elemWidth = function(){
            return self.elem.clientWidth;
        };
        self.drawChart = function(){
            var numPies = self.chartData.length;
            var w = self.elemWidth();
            var h = self.elemHeight();
            var sqrt = Math.sqrt(numPies);
            var maxgrid = Math.ceil(sqrt);
            var mingrid = Math.floor(sqrt);
            var x,y;
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
            
            var r = (xradius < yradius ? xradius : yradius) - 10;
            var m = 10;

            d3.select('#'+ self.elem.id)
                .selectAll("svg").remove();
            var svg = d3.select('#'+ self.elem.id)
                .selectAll("svg")
                .data(self.chartData)
                .enter().append("svg:svg").attr('class', 'pie')
                .attr("width", (r * 2) + m) 
                .attr("height", (r * 2) + m)
                .append("svg:g")
                .attr("class", "arc")
                .attr("transform", "translate(" + (r + m) + "," + (r + m) + ")");
            var arc = d3.svg.arc()
                .outerRadius(r)
                .innerRadius(r / 2);

            var pie = d3.layout.pie()
                .sort(null)
                .value(function(d) { 
                    return d.value; 
                });

            var g = svg.selectAll(".arc")
                .data(pie)
                .enter().append("g")
                .attr("class", "arc");

            g.append("path")
                .attr("d", arc)
                .style("fill", function(d, i) { return z(i); });

            g.append("text")
                .attr("class", "donuttext")
                .attr("transform", function(d) {
                    return "translate(" + arc.centroid(d) + ")";
                })
                .attr("dy", ".35em")
                .style("text-anchor", "middle")
                .text(function(d) { 
                    return d.data.key;
            });
        };
        self.drawChart();
        
        self.removeChart = function(){
            self._t && clearTimeout(self._t);
            d3.select('#'+ self.elem.id)
            .selectAll("svg").remove();
        };

        self.onResize = function(){
            self._t && clearTimeout(self._t);
            self._t = setTimeout(self.drawChart.bind(self), 2000);
        };
    };
    root.drata.ns('charts').extend({
        PieChart : PieChart
    });
})(this);