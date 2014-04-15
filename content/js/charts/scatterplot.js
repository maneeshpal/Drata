
 ;(function(root) {
    var ScatterPlot = function(){
        //var x = d3.scale.linear();
        var y = d3.scale.ordinal();
        var rs = d3.scale.linear();
        var _xAxisType = 'date';
        var xAxis = drata.models.axis()
            .axisType('x')
            .orient("bottom")
            .ticks(5);

        var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

        var z = d3.scale.category10();
        var dims = {
                    m: {l:0, r:30, t:30, b:30}
                };
        
        var getMin = function(data, prop){
            return d3.min(data, function(d) { 
                return d3.min(d.values.filter(function(i){return !i.disabled}), function(v) {
                    return v[prop]; 
                }); 
            });
        };

        var getMax = function(data, prop){
            return d3.max(data, function(d) { 
                return d3.max(d.values.filter(function(i){return !i.disabled}), function(v) { 
                    return v[prop]; 
                }); 
            });
        };

        function chart(selection) {
            console.log('scatter chart drawn');
            selection.each(function(data) {
                var container = d3.select(this);
                
                if(_xAxisType === 'date'){
                    _.each(data, function(item){
                        _.each(item.values, function(dataPoint){
                            dataPoint.x = new Date(dataPoint.x);
                        });
                    });
                }

                
                var enabledData = data.filter(function(d){
                    return !d.disabled;
                });

                var textLength = 0, maxlength = 0;
                var keys = enabledData.map(function(d) {
                    textLength = drata.utils.textToPixel(d.key);
                    maxlength = Math.max(maxlength, textLength);
                    return d.key;
                });
                
                dims.m.l = Math.max(maxlength, 30);
                
                console.log('m left' + dims.m.l);
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

                var dispatch = d3.dispatch('togglePath', 'showToolTip', 'hideToolTip');

                dispatch.on('togglePath', function(d){
                    d.disabled = !d.disabled;
                    chart.resize();
                });

                
                dims.w = $(this.parentNode).width();
                dims.h = $(this.parentNode).height();
                
                xAxis.axisTicType(_xAxisType).dims(dims).includeGridLines(false);
                
                
                //var xrange = [getMin(enabledData, 'x'),getMax(enabledData, 'x')];
                var yrange = [getMin(enabledData, 'y'),getMax(enabledData, 'y')];

                                
                //x.domain(xrange);
                y.domain(keys);
                rs.domain(yrange);

                //yAxis.tickSize(-wm);

                container.attr('width', dims.w).attr('height', dims.h);
                
                var gWrapper =  container
                    .selectAll('g.topgroup')
                    .data([data]);

                var gWrapperEnter = gWrapper.enter()
                    .append("g")
                    .attr('class', 'topgroup');

                gWrapperEnter.append("g").attr("class", 'x axis');
                
                gWrapperEnter.append("g").attr("class", 'y axis');
                
                gWrapperEnter.append("g").attr("class", "dot-group");

                gWrapperEnter.append("g").attr("class", "labels-group");
                
                var xAxisContainer = gWrapper.select('g.x.axis');
                    //.transition().duration(500)
                xAxisContainer.call(xAxis);
                xAxisContainer.attr("transform", "translate(" + dims.m.l +"," + (dims.h - dims.m.b) + ")");
                console.log('m left after x axis' + dims.m.l);

                var labels = drata.models.labels().color(z).dispatch(dispatch).dims(dims);
                var labelContainer = gWrapper.select('g.labels-group');
                labelContainer.datum(data).call(labels);

                console.log('m left after labels' + dims.m.l);

                labelContainer.attr("transform", "translate(" + (dims.m.l + 10) +")");
                
                var totalPoints = d3.max(data, function(d) { 
                    return d.values.length; 
                });

                var wm = dims.w - dims.m.l - dims.m.r;
                var hm = dims.h - dims.m.t - dims.m.b;
                
                var maxRadius = Math.min(Math.floor(( wm / totalPoints ) - 5)/2, Math.floor(( hm / keys.length ) - 5)/2) ;
                rs.range([0.2, maxRadius]);
                y.rangeRoundBands([hm, 0], 1);

                gWrapper.select('g.y.axis')
                    .attr("transform", "translate(" + dims.m.l +"," + dims.m.t + ")")
                    //.transition().duration(500)
                    .call(yAxis);
                
                var xScale = xAxis.scale();

                //dots
                var dots = drata.models.dots().xScale(xScale).yScale(function(d){
                   return y(d.key);
                }).color(z)
                .colorfull(true)
                .dotRadius(function(d){
                    return rs(d.y);
                });
                gWrapper
                    .select('g.dot-group')
                    .attr("transform", "translate(" + dims.m.l +"," + dims.m.t + ")")
                    .datum(data)
                    .call(dots);
                
                gWrapper.exit().remove();
            });
            return chart;
        };
        
        chart.xAxisType = function(value){
            if (!arguments.length) return _xAxisType;
            _xAxisType = value;
            return chart;
        };

        return chart;
    };
    root.drata.ns('charts').extend({
        scatterPlot : ScatterPlot
    });
})(this);