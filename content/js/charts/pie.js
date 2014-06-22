
 ;(function(root) {
    var PieChart = function(){
        var arc = d3.svg.arc();
        var z = d3.scale.category20();
        var dims = {m: {l:10, r:10, t:10, b:30}};
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
                //console.log(data.key);
                var itemCount = data.values.length;
                chart.resize = function() { 
                    dims = {m: {l:10, r:10, t:10, b:30}};
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

                gWrapperEnter.append("g").attr('class', 'arcs-group');
                gWrapperEnter.append("g").attr("class", 'labels-group');
                
                var labels = drata.models.labels().color(z).dims(dims).align('topcenter').dispatch(dispatch);
                gWrapper
                    .select('g.labels-group')
                    .datum(data.values)
                    .call(labels);
                
                z.domain(data.values.map(function(d){
                    return d.key;
                }));
                
                var r = Math.min(dims.w - dims.m.l - dims.m.r, dims.h - dims.m.t - dims.m.b)/2;

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

                var arcs = gWrapper.select('g.arcs-group')
                    .attr('transform','translate(' + (dims.w/2) + ',' + (r + dims.m.t) + ')') 
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
                    .attr('transform', 'translate(' + (dims.w/2) + ',' + (r + dims.m.t) + ')')
                    .selectAll('text')
                    .data(pie(data.values));
                    
                
                texts.enter()
                    .append('svg:text')
                    .attr('transform', 'translate(0,0)');

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

                gWrapperEnter
                    .append('svg:text')
                    .attr('class', 'pie-label')
                    .attr('fill', '#1f77b4')
                    .style('text-anchor', 'middle');

                var pieLabel = gWrapper.select('text.pie-label')
                    .text(data.key)
                    .attr('transform', 'translate(' +(dims.w/2)+ ',' + (r + r + dims.m.t + 15) + ')');
                
            });
            
            return chart;
        };
        return chart;
    };
    root.drata.ns('charts').extend({
        pieChart : PieChart
    });
})(this);