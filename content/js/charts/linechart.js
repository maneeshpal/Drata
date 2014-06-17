
 ;(function(root) {
    var LineChart = function(){
        var _xAxisType = 'numeric', _drawXAxis = true, _drawYAxis = true, _yticks, _drawLabels = true, _dateInterval, _dataMarkers = false;
        var xAxis = drata.models.axis()
            .orient("bottom")
            .axisType('x')
            .ticks(8);
        var yAxis = drata.models.axis()
            .orient("left")
            .axisType('y')
            .ticks(5);
     
        var z = d3.scale.category20();
        var dims = {m: {l:30, r:10, t:10, b:30}};
        
        function chart(selection) {
            console.log('line chart drawn');
            selection.each(function(data) {
                var container = d3.select(this);
                _yticks > 0 && yAxis.ticks(_yticks);
                if(_xAxisType === 'date'){
                    _.each(data, function(item){
                        _.each(item.values, function(dataPoint){
                            dataPoint.x = new Date(dataPoint.x);
                        });
                    });
                }
                z.domain(data.map(function(d){return d.key}));
                
                chart.resize = function() { 
                    dims = {m: {l:30, r:10, t:30, b:30}};
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

                dims.w = $(this.parentNode).width();
                dims.h = $(this.parentNode).height();
                
                xAxis.axisTicType(_xAxisType).dateInterval(_dateInterval).dims(dims).includeGridLines(false);
                yAxis.axisTicType('numeric').dims(dims).includeGridLines(true);
                
                var dispatch = d3.dispatch('togglePath', 'showToolTip', 'hideToolTip');

                dispatch.on("togglePath", function(d){
                    d.disabled = !d.disabled;
                    chart.resize();
                });

                container.attr('width', dims.w).attr('height', dims.h);
                
                var gWrapper =  container
                    .selectAll('g.topgroup')
                    .data([data]);

                var gWrapperEnter = gWrapper.enter()
                    .append("g")
                    .attr('class', 'topgroup');

                gWrapperEnter.append("g").attr("class", 'x axis');
                
                gWrapperEnter.append("g").attr("class", 'y axis');
                
                gWrapperEnter.append("g").attr("class", "line-group");
                
                //labels
                if(_drawLabels){
                    gWrapperEnter.append("g").attr("class", "labels-group");
                
                    var labels = drata.models.labels().color(z).dispatch(dispatch).dims(dims);
                
                    var labelContainer = gWrapper.select('g.labels-group');
                    
                    labelContainer.datum(data).call(labels);    
                }
                
                
                    
                var xAxisContainer = gWrapper.select('g.x.axis');
                
                xAxisContainer.call(xAxis);
                
                xAxisContainer.attr("transform", "translate(" + dims.m.l +"," + (dims.h - dims.m.b) + ")");
                if(_drawLabels){
                    labelContainer.attr("transform", "translate(" + (dims.m.l + 10) +")");
                }

                gWrapper.select('g.y.axis')
                    .attr("transform", "translate(" + dims.m.l +"," + dims.m.t + ")")
                    //.transition().duration(500)
                    .call(yAxis);

                var xScale = xAxis.scale(), yScale = yAxis.scale();
                
                var lines = drata.models.lines().xScale(xScale).yScale(yScale).color(z).interpolate('linear');
                
                gWrapper
                    .select('g.line-group')
                    .attr("transform", "translate(" + dims.m.l +"," + dims.m.t + ")")
                    .call(lines);

                

                if(_dataMarkers){
                    gWrapperEnter.append("g").attr("class", "dot-group");
                    var dots = drata.models.dots().xScale(xScale).yScale(function(d){
                        return yScale(d.y);
                    }).color(z).dispatch(dispatch);
                    gWrapper
                        .select('g.dot-group')
                        .attr("transform", "translate(" + dims.m.l +"," + dims.m.t + ")")
                        .datum(data)
                        .call(dots);

                    gWrapperEnter.append("g").attr("class", "tooltip-group");
                    var toolTip = drata.models.toolTip().dispatch(dispatch);
                    gWrapper
                        .select('g.tooltip-group')
                        .attr("transform", "translate(" + (dims.w-5) +", " +  (dims.m.t-10) +")")
                        .call(toolTip);                        
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

        chart.yticks = function(value){
            if (!arguments.length) return _yticks;
            _yticks = value;
            return chart;
        };

        chart.dateInterval = function(value){
            if (!arguments.length) return _dateInterval;
            _dateInterval = value;
            return chart;
        };

        chart.drawLabels = function(value){
            if (!arguments.length) return _drawLabels;
            _drawLabels = value;
            return chart;
        };

        chart.drawYAxis = function(value){
            if (!arguments.length) return _drawYAxis;
            _drawYAxis = value;
            return chart;
        };
        chart.drawXAxis = function(value){
            if (!arguments.length) return _drawXAxis;
            _drawXAxis = value;
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
        lineChart : LineChart
    });
})(this);