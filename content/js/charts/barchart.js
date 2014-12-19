
"use strict";

 ;(function(root) {
    
    var BarChart = function(){
        var z = d3.scale.category10();
        var dims = {m: {t:60, r:10, b:30, l:40}};
        var _dims = dims;
        var dispatch = d3.dispatch('togglePath');
        var disabledItems = 0;
        var _showBarLabels = false, _drawLabels = true, _drawYAxis = true, _drawXAxis = true, _showToolTips = true;
        var x0 = d3.scale.ordinal();
        var x1 = d3.scale.ordinal();
        var y = d3.scale.linear();
        
        var tip = d3.tip && d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
            return drata.utils.format('<div class="d3-tip-header">{0}</div>{1}: {2}',d.topLevelKey, d.key , drata.utils.formatNumber(d.value, 0,'.', ','));
        });

        var yAxis = d3.svg.axis()
            .scale(y)
            .tickFormat(d3.format('.2s'))
            .orient("left")
            .ticks(10);

        var xAxis = d3.svg.axis()
            .scale(x0)
            .orient("bottom");

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
        var disabledKeys = [];

        function chart(selection){
            selection.each(function(data) {
                console.log('bar chart drawn');
                var container = d3.select(this);
                chart.resize = function() {
                    dims = _dims;
                    container
                    .transition()
                    .duration(1000)
                    .call(chart);
                };

                chart.change = function(newData) { 
                    disabledKeys = [];
                    container
                    .datum(newData)
                    .transition()
                    .duration(1000)
                    .call(chart);
                };

                var duplKeys = [];

                _.each(data, function(item){
                     _.each(item.values, function(val){
                        val.disabled = disabledKeys.indexOf(val.key) > -1;
                        val.topLevelKey = item.key; //todo: figure out a better way
                        if(duplKeys.indexOf(val.key) === -1){
                            duplKeys.push(val.key);   
                        }
                    });
                });

                z.domain(duplKeys);

                var labelKeys = duplKeys.map(function(key){
                    return {key: key, disabled : disabledKeys.indexOf(key) > -1};
                });

                dispatch.on("togglePath", function(d, i){
                    var toggle;
                    
                    if(labelKeys.length - 1 === disabledKeys.length && disabledKeys.indexOf(d.key) === -1) return;
                    var keyIndex = disabledKeys.indexOf(d.key);
                    if(keyIndex === -1){
                        disabledKeys.push(d.key);
                    }else{
                        disabledKeys.splice(keyIndex,1);
                    }
                    
                    chart.resize();
                });

                dims.w = $(this.parentNode).width();
                dims.h = $(this.parentNode).height();

                container.attr('width', dims.w).attr('height', dims.h);
                
                var gWrapper =  container
                    .selectAll('g.topgroup')
                    .data([data]);

                

                var gWrapperEnter = gWrapper.enter()
                    .append("g")
                    .attr('class', 'topgroup');

                gWrapperEnter.append("g").attr('class', 'bars-group');
                gWrapperEnter.append("g").attr("class", 'y axis');
                gWrapperEnter.append("g").attr("class", 'x axis');
                gWrapperEnter.append("g").attr("class", 'labels-group');
                
                var yrange;
                function setYaxis(){
                    y.range([dims.h - dims.m.t - dims.m.b, 0]);
                    var minDataVal = getMin(data, 'value');
                    var min = Math.min(minDataVal, 0), max = getMax(data, 'value');
                    yrange = [min ,max];
                    y.domain(yrange);
                    if(_drawYAxis){
                        gWrapper.select('g.y.axis')
                            .attr("transform", "translate(" + dims.m.l +"," + dims.m.t + ")")
                            .call(yAxis);
                    }
                }

                function setXaxis(){
                    x0.rangeRoundBands([0, dims.w - dims.m.l - dims.m.r], .1);
                    x0.domain(data.map(function(d) { 
                        return d.key; 
                    }));
                    x1.domain(duplKeys).rangeRoundBands([0, x0.rangeBand()]);
                    if(_drawXAxis){
                        gWrapper.select('g.x.axis')
                            .attr("transform", "translate(" + dims.m.l +"," + (dims.h - dims.m.b) + ")")
                            .call(xAxis);
                    }
                }

                function setLabels(){
                    var labels = drata.models.labels().color(function(d,i){
                        return z(d);
                    }).dims(dims).align('topcenter').dispatch(dispatch);
                    gWrapper.select('g.labels-group')
                    .datum(labelKeys)
                    .call(labels);
                }
                
                function drawBars(){
                    var barGroup = gWrapper
                        .select("g.bars-group")
                        .attr("transform", "translate(" + dims.m.l +"," + dims.m.t + ")")
                        .selectAll('g.bar-group')
                        .data(function(d){
                            return d;
                        });

                    barGroup
                        .enter()
                        .append("g")
                        .attr("class", "bar-group");

                    barGroup
                        .attr("transform", function(d) { return "translate(" + x0(d.key) + ",0)"; });
                        
                    var rects = barGroup.selectAll('rect')
                        .data(function(d){
                            return d.values;
                        });

                    rects.enter()
                        .append('rect').attr("height", 0)
                        .attr("y", y(yrange[0]))
                        .attr("class", "rect-bar");

                    if(_showToolTips && tip){
                        rects
                        .on('mouseover', tip.show)
                        .on('mouseout', tip.hide)
                        .call(tip);
                    }

                    rects
                        .style("fill", function(d) { 
                            return z(d.key); 
                        })
                        .attr("stroke", '#fff')
                        .attr("stroke-width", 1)
                        .transition().duration(300)
                        .attr("x", function(d) { return x1(d.key); })
                        .attr("y", function(d) {  
                            return d.disabled ?  y(yrange[0]) : y(d.value); 
                        })
                        .attr("width", x1.rangeBand())
                        .attr("height", function(d) {  
                            //console.log('bar value: ' + d.value + '; y: ' + ((dims.h - dims.m.t - dims.m.b) - y(d.value)));
                            return d.disabled ? 0 : (dims.h - dims.m.t - dims.m.b) - y(d.value); 
                        });
                        

                    rects.exit().transition().duration(300).attr("height", 0)
                        .attr("y", y(yrange[0]))
                        .remove();

                    if(_showBarLabels){
                        var rectLabels = barGroup.selectAll('text')
                            .data(function(d){
                                return d.values;
                            });

                        rectLabels.enter()
                            .append('text')
                            .attr("y", y(yrange[0]));

                        var labelFormat = d3.format('.2s');
                        rectLabels
                            .style("fill", "#ccc")
                            .text(function(d){
                                return labelFormat(d.value);
                            })
                            .style('text-anchor', 'middle')
                            .style("width", x1.rangeBand())
                            .transition().duration(300)
                            .attr("x", function(d) { return x1(d.key) + x1.rangeBand()/2; })
                            .attr("y", function(d) {  
                                return d.disabled ?  y(yrange[0]) : y(d.value) + 12; 
                            });

                        rectLabels.exit().remove();                
                    }
                    barGroup.exit().remove();
                }
                _drawLabels && setLabels();
                setXaxis();
                setYaxis();
                drawBars();
                gWrapper.exit().remove();
            });
            
            return chart;
        };
        chart.showBarLabels = function(value){
            if (!arguments.length) return _showBarLabels;
            _showBarLabels = value;
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
        chart.drawLabels = function(value){
            if (!arguments.length) return _drawLabels;
            _drawLabels = value;
            return chart;
        };
        chart.dims = function(value){
            if (!arguments.length) return dims;
            dims = value;
            _dims = value;
            return chart;
        };
        chart.showToolTips = function(value){
            if (!arguments.length) return _showToolTips;
            _showToolTips = value;
            return chart;
        };
        return chart;
    };
    root.drata.ns('charts').extend({
        barChart : BarChart
    });
})(this);