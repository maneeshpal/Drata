
 ;(function(root) {
    var LineChart = function(){
        var x = d3.scale.linear();
        var y = d3.scale.linear();
           
        var xAxis = drata.models.axis()
            .scale(x)
            .orient("bottom")
            .ticks(5);
        var yAxis = drata.models.axis()
            .scale(y)
            .orient("left")
            .ticks(5);
     
        var z = d3.scale.category20();
        var m = {l:30, r:10, t:30, b:30};
    
        var getMin = function(data, prop){
            return d3.min(data, function(d) { 
                return d3.min(d.values, function(v) {
                    return v[prop]; 
                }); 
            });
        };

        var getMax = function(data, prop){
            return d3.max(data, function(d) { 
                return d3.max(d.values, function(v) { 
                    return v[prop]; 
                }); 
            });
        };
        function chart(selection) {
            console.log('line chart drawn');
            selection.each(function(data) {
                var container = d3.select(this);
                // var maxlength = 0;
                // var textLength = 0;
                // _.each(data,function(d) {
                //     textLength = drata.utils.textToPixel(d.key);
                //     maxlength = maxlength > textLength  ? maxlength : textLength;
                // });
                // m.l = Math.max(maxlength, 30);

                z.domain(data.map(function(d){return d.key}));
                
                chart.resize = function() { 
                    container
                    .transition().duration(500)
                    .call(chart);
                };

                chart.change = function(_) { 
                    container
                    .datum(_)
                    .transition().duration(500)
                    .call(chart);
                };

                chart.feed = function(newData) { 
                    if(!newData) throw "no data supplied";
                    for (var i = 0; i < newData.length; i++) {
                        var lv = newData[i].values.length;
                        for (var j = 0; j < lv; j++) {
                            data[i].values.shift();
                            data[i].values.push(newData[i].values[j]);
                        }
                    };
                    container
                    .datum(data)
                    .transition().duration(500)
                    .call(chart);
                };

                var w = $(this.parentNode).width();
                var h = $(this.parentNode).height();
                
                var wm = w - m.l - m.r;
                var hm = h - m.t - m.b;
                
                x.range([0, wm]);
                y.range([hm, 0]);

                var enabledData = data.filter(function(d){
                    return !d.disabled;
                });
                

                var xrange = [getMin(enabledData, 'x'),getMax(enabledData, 'x')];
                var yrange = [getMin(enabledData, 'y'),getMax(enabledData, 'y')];
                x.domain(xrange);
                y.domain(yrange);

                var dispatch = d3.dispatch('togglePath', 'showToolTip', 'hideToolTip');

                dispatch.on("togglePath", function(d){
                    d.disabled = !d.disabled;
                    console.log(d);
                    chart.resize();
                });

                yAxis.tickSize(-wm);

                container.attr('width', w).attr('height', h);
                
                var gWrapper =  container
                    .selectAll('g.topgroup')
                    .data([data]);

                var gWrapperEnter = gWrapper.enter()
                    .append("g")
                    .attr('class', 'topgroup');

                gWrapperEnter.append("g").attr("class", 'x axis');
                
                gWrapperEnter.append("g").attr("class", 'y axis');
                
                gWrapperEnter.append("g").attr("class", "line-group");
                
                gWrapperEnter.append("g").attr("class", "dot-group");

                gWrapperEnter.append("g").attr("class", "labels-group");
                
                gWrapperEnter.append("g").attr("class", "tooltip-group");

                gWrapper.select('g.x.axis')
                    .attr("transform", "translate(" + m.l +"," + (hm + m.t) + ")")
                    //.transition().duration(500)
                    .call(xAxis);

                gWrapper.select('g.y.axis')
                    .attr("transform", "translate(" + m.l +"," + m.t + ")")
                    //.transition().duration(500)
                    .call(yAxis);

                var toolTip = drata.models.toolTip().dispatch(dispatch);

                gWrapper
                    .select('g.tooltip-group')
                    .attr("transform", "translate(" + (w-5) +", " +  (m.t-10) +")")
                    .call(toolTip);

                var lines = drata.models.lines().xScale(x).yScale(y).color(z).interpolate('linear');
                
                gWrapper
                    .select('g.line-group')
                    .attr("transform", "translate(" + m.l +"," + m.t + ")")
                    .call(lines);

                //dots
                var dots = drata.models.dots().xScale(x).yScale(function(d){
                    return y(d.y);
                }).color(z).dispatch(dispatch);
                gWrapper
                    .select('g.dot-group')
                    .attr("transform", "translate(" + m.l +"," + m.t + ")")
                    .datum(data)
                    .call(dots);
                
                //labels
                var labels = drata.models.labels().color(z).dispatch(dispatch);
                gWrapper
                    .select('g.labels-group')
                    .attr("transform", "translate(" + (m.l + 10) +")")
                    .datum(data)
                    .call(labels);

                gWrapper.exit().remove();
            });
            return chart;
        };
        
        return chart;
    };
    root.drata.ns('charts').extend({
        lineChart : LineChart
    });
})(this);