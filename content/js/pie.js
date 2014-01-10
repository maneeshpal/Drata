
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
        var r = (self.elemWidth()/numPies)/2 - 10;
        if(r > (self.elemHeight()/2)-20)
            r = (self.elemHeight()/2)-20;
        if(r < 75)
            r = 75;
        console.log(r);
        var m = 10, z = d3.scale.category20();
        
        d3.select('#'+ self.elem.id)
            .selectAll("svg").remove();
        var svg = d3.select('#'+ self.elem.id)
            .selectAll("svg")
            .data(self.chartData)
            .enter().append("svg:svg").attr('class', 'pie')
            .attr("width", (r + m) * 2)
            .attr("height", (r + m) * 2)
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
        $(window).on('resize', function(){
                self.drawChart();   
        });
        self.removeChart = function(){
            d3.select('#'+ self.elem.id)
            .selectAll("svg").remove();
        }
    };
    root.drata.ns('charts').extend({
        PieChart : PieChart
    });
})(this);