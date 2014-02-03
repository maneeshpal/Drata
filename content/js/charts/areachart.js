
 ;(function(root) {
    var AreaChart = function(){
        var x = d3.scale.linear();
        var y = d3.scale.linear();
           
        var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(5);
        var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);
     
        var z = d3.scale.category20();
        var m = {l:30, r:10, t:30, b:30};
    
        var line = d3.svg.area()
            .interpolate("linear")
            .x(function(d) { return x(d.x); })
            .y1(function(d) { return y(d.y); });
        
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

        var xdiff ;

        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);
                z.domain(data.map(function(d){return d.key}));
                chart.resize = function() { 
                    container
                    .transition().duration(500)
                    .call(chart);
                };

                chart.redraw = function(_) { 
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
                
                line.y0(hm);

                x.range([0, wm]);
                y.range([hm, 0]);

                var enabledData = data.filter(function(d){
                    return !d.disabled;
                });
                
                var xrange = [getMin(enabledData, 'x'),getMax(enabledData, 'x')];
                var yrange = [getMin(enabledData, 'y'),getMax(enabledData, 'y')];
                x.domain(xrange);
                y.domain(yrange);

                var getFlatLine = function(values){
                    return values.map(function(d){
                        return {
                            x : d.x,
                            y : yrange[0]
                        }
                    });
                };
                xdiff = x(data[0].values[1].x) - x(data[0].values[0].x);
                xAxis.tickSize(0);
                yAxis.tickSize(-wm);

                container.attr('width', w).attr('height', h);
                
                var moveleft = function(){
                    this
                        .attr("transform","translate(" + xdiff + ")")
                        .transition()
                        .ease("linear")
                        .attr("transform", "null")
                        ;
                };
                var gWrapper =  container
                    .selectAll('g.topgroup')
                    .data([data]);

                var gWrapperEnter = gWrapper.enter()
                    .append("g")
                    .attr('class', 'topgroup');

                gWrapperEnter.append("g").attr("class", 'x axis')
                    .attr("transform", "translate(" + m.l +"," + (hm + m.t) + ")");
                
                gWrapperEnter.append("g").attr("class", 'y axis')
                    .attr("transform", "translate(" + m.l +"," + m.t + ")");
                
                gWrapperEnter.append("g").attr("class", "area-group")
                    .attr("transform", "translate(" + m.l +"," + m.t + ")");
                
                gWrapperEnter.append("g").attr("class", "dot-group")
                    .attr("transform", "translate(" + m.l +"," + m.t + ")");

                gWrapperEnter.append("g").attr("class", "labels-group")
                    .attr("transform", "translate(" + (m.l + 10) +")");
                
                gWrapper.select('g.x.axis')
                    //.transition().duration(500)
                    .call(xAxis);

                gWrapper.select('g.y.axis')
                    //.transition().duration(500)
                    .call(yAxis);

                var tooltip = gWrapper.append('text')
                    .attr('class', 'tooltip')
                    .attr('x', w-5)
                    .attr('y', m.t-10);

                var paths = gWrapper
                    .select('g.area-group')
                    .selectAll('.line')
                    .data(function(d){
                        return d;
                    });

                paths.enter()
                    .append("path")
                    .attr("class", "line");
                
                paths
                    
                    .attr("fill", function(d) { 
                        return '#1f77b4'; 
                    })
                    .transition()
                    .attr('visibility', function(d){
                        return d.disabled ? 'hidden' : '';
                    })
                    .attr("d", function(d) {
                        return (!d.disabled) ? line(d.values) : line(getFlatLine(d.values)); 
                    })
                    //.call(moveleft)
                    ;
                    
                paths.exit().remove();

                var disablePathOnClick = function(){
                    this.on('click', function(d){
                        d.disabled = !d.disabled;
                        console.log(d);
                        chart.resize();
                    })
                };
                
                var dotLineGroup = gWrapper
                    .select('g.dot-group')
                    .selectAll('g.dot-line-group')
                    .data(function(d){
                        return d.filter(function(_){return !_.disabled;});
                    });

                dotLineGroup.enter()
                    .append("g")
                    .attr('class','dot-line-group');

                var dot = dotLineGroup
                    .selectAll('circle.circle-each')
                    .data(function(d){
                        return d.values;
                    });

                dot
                    .enter()
                    .append('circle')
                    .attr('class', 'circle-each');

                dot.attr('r',2)
                    .attr('fill', 'none')
                    .attr('stroke', function(d){
                        //d3.select(this.parentNode).
                        return '#fff';
                    })
                    .attr('stroke-width', 2)
                    .on('mouseover', function(d){
                        var color = z(d3.select(this.parentNode).data()[0].key);
                        d3.select(this)
                            .attr('stroke', color)
                            .attr('stroke-width', 4)
                            .attr('r', 4)
                            .attr('fill', '#fff');
                        tooltip.text('x:' + d.x + ', y:' + d.y)
                            .attr('fill', color);
                    })
                    .on('mouseout', function(d){
                        tooltip.text('');
                        d3.select(this)
                            .attr('stroke', '#fff')
                            .attr('stroke-width', 2)
                            .attr('r', 2)
                            .attr('fill', 'none');
                        
                    })
                    .transition().duration(500)
                    .attr('cx', function(d){
                        return x(d.x);
                    })
                    .attr('cy', function(d){
                        return y(d.y);
                    })
                    //.call(moveleft)
                    ;

                var labelsWrapper = gWrapper
                    .select('g.labels-group')
                    .selectAll('g.label-group')
                    .data(function(d){
                        return d;
                    });

                var temp = 0;
                var exl = data.map(function(d){
                    temp = temp + (d.key.length * 10) + 15;
                    return temp;
                });
                exl.splice(0, 0 , 0);

                var labelWrapper = labelsWrapper.enter()
                    .append('g')
                    .attr('class','label-group')
                    .attr('transform', function(d, i){
                        return 'translate('+ exl[i] +')';
                    });
                
                labelWrapper.append('text').attr('class', 'label-text');
                labelWrapper.append('circle').attr('class', 'label-circle');
                labelsWrapper
                    .select('text.label-text')
                    .attr('x', function(d, i){
                        return 10;
                    })
                    .attr('y', 24)
                    .attr('fill', function(d){
                        return z(d.key);
                    })
                    .text(function(d){
                        return d.key;
                    })
                    .call(disablePathOnClick);

                labelsWrapper
                    .select('circle.label-circle')
                    .attr('r',4)
                    .attr('fill', function(d){
                        return (d.disabled)? '#fff' : z(d.key);
                    })
                    .attr('stroke', function(d){
                        return z(d.key);
                    })
                    .attr('stroke-width',2)
                    .attr('cy', function(d){
                        return 20;
                    })
                    .call(disablePathOnClick)
                    ;

                labelsWrapper.exit().remove();
                dot.exit().remove();
                dotLineGroup.exit().remove();
                gWrapper.exit().remove();
            });
            return chart;
        };
        
        return chart;
    };
    root.drata.ns('charts').extend({
        areaChart : AreaChart
    });
})(this);