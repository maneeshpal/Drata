
 ;(function(root) {
    var AreaChart = function(){
        var _xAxisType = 'numeric', _dataMarkers = false;
        var xAxis = drata.models.axis()
            .orient("bottom")
            .axisType('x')
            .ticks(5);
        var yAxis = drata.models.axis()
            .orient("left")
            .axisType('y')
            .ticks(5);
     
        var z = d3.scale.category20();
        var m = {l:30, r:10, t:30, b:30};
        
        function chart(selection) {
            selection.each(function(data) {
                console.log('area chart drawn');
                var container = d3.select(this);

                if(_xAxisType === 'date'){
                    _.each(data, function(item){
                        _.each(item.values, function(dataPoint){
                            dataPoint.x = new Date(dataPoint.x);
                        });
                    });
                }

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
                
                xAxis.axisTicType(_xAxisType).width(wm).height(hm);
                yAxis.axisTicType('numeric').width(wm).height(hm).tickSize(-wm);
                                
                var dispatch = d3.dispatch('togglePath', 'showToolTip', 'hideToolTip');

                dispatch.on("togglePath", function(d){
                    d.disabled = !d.disabled;
                    if(drata.js.logmsg) console.log(d);
                    chart.resize();
                });

                container.attr('width', w).attr('height', h);
                
                var gWrapper =  container
                    .selectAll('g.topgroup')
                    .data([data]);

                var gWrapperEnter = gWrapper.enter()
                    .append("g")
                    .attr('class', 'topgroup');

                gWrapperEnter.append("g").attr("class", 'x axis');
                
                gWrapperEnter.append("g").attr("class", 'y axis');
                
                gWrapperEnter.append("g").attr("class", "area-group");
                
                gWrapperEnter.append("g").attr("class", "line-group");
                
                gWrapper.select('g.x.axis')
                    .attr("transform", "translate(" + m.l +"," + (hm + m.t) + ")")
                    //.transition().duration(500)
                    .call(xAxis);

                var xScale = xAxis.scale(), yScale = yAxis.scale();
                //var toolTip = drata.models.toolTip().dispatch(dispatch);

                gWrapper.select('g.y.axis')
                    .attr("transform", "translate(" + m.l +"," + m.t + ")")
                    //.transition().duration(500)
                    .call(yAxis);
                
                var lines = drata.models.lines().xScale(xScale).yScale(yScale).color(function(){return '#fff'}).interpolate('monotone');
                
                gWrapper
                    .select('g.line-group')
                    .attr("transform", "translate(" + m.l +"," + m.t + ")")
                    .call(lines);

                var area = drata.models.area().xScale(xScale).yScale(yScale).color(z).interpolate('monotone').height(hm);
                gWrapper
                    .select('g.area-group')
                    .attr("transform", "translate(" + m.l +"," + m.t + ")")
                    .call(area);

                //labels
                gWrapperEnter.append("g").attr("class", "labels-group");
                var labels = drata.models.labels().color(z).dispatch(dispatch);
                gWrapper
                    .select('g.labels-group')
                    .attr("transform", "translate(" + (m.l + 10) +")")
                    .datum(data)
                    .call(labels);
                
                if(_dataMarkers){
                    gWrapperEnter.append("g").attr("class", "tooltip-group");
                    var toolTip = drata.models.toolTip().dispatch(dispatch);
                    gWrapper
                        .select('g.tooltip-group')
                        .attr("transform", "translate(" + (w-5) +", " +  (m.t-10) +")")
                        .call(toolTip);

                    gWrapperEnter.append("g").attr("class", "dot-group");

                    var dots = drata.models.dots().xScale(xScale).yScale(function(d){
                        return yScale(d.y);
                    }).color(z).dispatch(dispatch);
                    gWrapper
                        .select('g.dot-group')
                        .attr("transform", "translate(" + m.l +"," + m.t + ")")
                        .datum(data)
                        .call(dots);   
                }

                gWrapper.exit().remove();
            });
            return chart;
        };
        
        chart.xAxisType = function(value){
            if (!arguments.length) return _xAxisType;
            _xAxisType = value;
            return chart;
        };
        chart.includeDataMarkers = function(value){
            if (!arguments.length) return _dataMarkers;
            _dataMarkers = value;
            return chart;
        };

        return chart;
    };
    root.drata.ns('charts').extend({
        areaChart : AreaChart
    });
})(this);