
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

        self.resize = function(){
            self.drawChart();
        };
    };

    var PieChart = function(){
        var arc = d3.svg.arc();
        var z = d3.scale.category20();
        var m = {t:30, r:10, b:50, l:10};
        var pie = d3.layout.pie();

        var enterAntiClockwise = {
                  startAngle: Math.PI * 2,
                  endAngle: Math.PI * 2
                };
        var enterClockwise = {
          startAngle: 0,
          endAngle: 0
        };
        var dispatch = d3.dispatch('togglePath');
        var disabledItems = 0;
        function chart(selection){
            console.log('pie chart drawn');
            selection.each(function(data) {
                var container = d3.select(this);
                var itemCount = data.values.length;
                chart.resize = function() { 
                    container
                    .transition()
                    .duration(1000)
                    .call(chart);
                };
                //chart.container = this;
                chart.change = function(newData){
                    container
                    .datum(newData)
                    .call(chart);
                };

                dispatch.on("togglePath", function(d, i){
                    var toggle;
                    if(disabledItems === itemCount-1){
                        _.each(data.values, function(item){
                           item.disabled = false;
                        });
                        disabledItems = 0;
                    }
                    else{
                        toggle = d.disabled;
                        d.disabled = !toggle;
                        disabledItems = toggle ? disabledItems - 1 : disabledItems + 1;
                    }
                    //console.log(data);
                    chart.resize();
                });

                var w = $(this.parentNode).width();
                var h = $(this.parentNode).height();

                container.attr('width', w).attr('height', h);
                
                z.domain(data.values.map(function(d){
                    return d.key
                }));
                
                var r = Math.min(w - m.l -m.r, h - m.t - m.b)/2;

                pie.value(function(d) {
                    return d.disabled ? 0 : d.value;
                }).sort(null);

                arc.outerRadius(r)
                    .innerRadius(r / 2);

                var arcTween = function(a) {
                    var i = d3.interpolate(this._current, a);
                    this._current = i(0);
                    return function(t) {
                        return arc(i(t));
                    };
                };
                // Interpolate exiting arcs start and end angles to Math.PI * 2
                // so that they 'exit' at the end of the data
                var arcTweenOut = function(a) {
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

                var gWrapper =  container
                    .selectAll('g.topgroup')
                    .data([data]);

                var gWrapperEnter = gWrapper.enter()
                    .append("g")
                    .attr('class', 'topgroup');

                gWrapperEnter.append("g").attr('class', 'arcs-group');
                gWrapperEnter.append("g").attr("class", 'labels-group');

                var arcs = gWrapper.select('g.arcs-group')
                    .attr("transform", "translate(" + (w/2) + "," + (r + m.t) + ")")
                    .selectAll('path')
                    .data(pie(data.values));

                arcs.enter()
                    .append('path')
                    .attr("fill", function (d, i) {
                        return z(d.data.key);
                    })
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1)
                    .each(function (d) {
                        this._current = {
                            data: d.data,
                            value: d.value,
                            startAngle: enterAntiClockwise.startAngle,
                            endAngle: enterAntiClockwise.endAngle
                        };
                    });

                arcs.transition().duration(750).attrTween("d", function(d){
                    if(d.data.disabled) {
                        return arcTweenOut.call(this, d);
                    } 
                    else{
                        return arcTween.call(this, d);
                    }
                });

                arcs.exit()
                    .transition()
                    .duration(750)
                    .attrTween('d', arcTweenOut)
                    .remove(); // now remove the exiting arcs
                    
                gWrapperEnter.append("g").attr('class', 'text-group');
                
                var texts = gWrapper.selectAll('g.text-group')
                    .attr("transform", "translate(" + (w/2) + "," + (r + m.t) + ")")
                    .selectAll('text')
                    .data(pie(data.values));
                    
                
                texts.enter()
                    .append("svg:text");

                var total = 0;

                for(var i = 0; i < data.values.length; i++){
                    if(!data.values[i].disabled) total = total + (+data.values[i].value);
                }
                
                texts
                    .attr("dy", ".35em")
                    .style("text-anchor", "middle")
                    .attr('fill', function(d, i){
                        //return d3.rgb(z(d.data.key)).darker(2).toString();
                        return "#fff";
                    })
                    .text(function(d) { 
                        return d.data.disabled ? '' : Math.round(d.value/total * 100).toFixed(1) + '%';
                    });

                texts.exit().remove();

                texts.transition().duration(750).attr("transform", function(d) {
                    return "translate(" + arc.centroid(d) + ")";
                });

                var labels = drata.models.labels().color(z).width(w).height(h-m.b).align('center').dispatch(dispatch);
                gWrapper
                    .select('g.labels-group')
                    //.attr("transform", "translate(" + (m.l) + "," + (r + r + m.t) + ")")
                    .datum(data.values)
                    .call(labels);
               
            });
            
            return chart;
        };
        return chart;
    };
    root.drata.ns('charts').extend({
        pieChart : PieChart,
        PreviewPieChart: PreviewPieChart
    });
})(this);