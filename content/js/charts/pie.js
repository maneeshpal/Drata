
 ;(function(root) {
    var PieChart = function(){
        var arc = d3.svg.arc();
        var outerArc = d3.svg.arc();
        var arc2 = d3.svg.arc();

        var z = d3.scale.category20();
        var dims = {m: {l:10, r:10, t:10, b:30}};
        var pie = d3.layout.pie();

        var _drawOuterLabels = true, _textFillColor = '#fff', _drawDataKey = true, _innerRadius = 0, _keyLabels = false, _rotateArcs = false, _arcExpand = 0, _drawPolyLines = true;
        var enterAntiClockwise = {
                  startAngle: Math.PI * 2,
                  endAngle: Math.PI * 2
                };
        var enterClockwise = {
          startAngle: 0,
          endAngle: 0
        };
        var events = {};
        var dispatch = d3.dispatch('togglePath', 'arcClick');
        var disabledItems = [];
        var _prevEnlarged;
        var raiseEvent = function(eventName, args){
            events.hasOwnProperty(eventName) && events[eventName](args);
        };

        function angle(d) {
            var a = (d.startAngle + d.endAngle) * 90 / Math.PI;
            return a > 90 ? a - 180 : a;
        }
        function midAngle(d){
            return d.startAngle + (d.endAngle - d.startAngle)/2;
        }

        function chart(selection){
            //console.log('pie chart drawn');
            selection.each(function(data) {
                var container = d3.select(this);
                //console.log(data.key);
                var itemCount = data.values.length;
                if(!_drawDataKey){
                    dims.m.b = 10
                }
                chart.resize = function() { 
                    dims = {m: {l:10, r:10, t:10, b:30}};
                    if(!_drawDataKey){
                        dims.m.b = 10
                    }
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

                chart.shuffleArcs = function(){
                    var l = data.values.length;
                    _.each(data.values, function(item, i){
                       item.enlarge = false;
                       item.index = l - item.index + 1;
                    });
                    chart.resize();
                }

                _.each(data.values, function(item, i){
                   if(!item.index || item.enlarge) item.index = item.enlarge ? 0 : i + 1;
                });


                dispatch.on("togglePath", function(d, i) {
                    if(!d.disabled && disabledItems.length === itemCount-1){
                        _.each(data.values, function(item){
                           item.disabled = false;
                        });
                        disabledItems = [];
                    }
                    else{
                        var toggle = d.disabled;
                        d.disabled = !toggle;
                        if(toggle){
                            disabledItems.splice(disabledItems.indexOf(d.key), 1);
                        }else{
                            disabledItems.push(d.key);
                        }
                    }
                    chart.resize();
                });

                dispatch.on("arcClick", function(d, i){
                    _.each(data.values, function(item, i){
                       item.enlarge = false;
                       item.index = i + 1;
                    });
                    d.data.enlarge = d.data.key !== _prevEnlarged;
                    raiseEvent('arcClick', d);
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

                if(_drawOuterLabels){
                    gWrapperEnter.append("g").attr("class", 'labels-group');
                    var labels = drata.models.labels().color(z).dims(dims).align('topcenter').dispatch(dispatch);
                    gWrapper
                        .select('g.labels-group')
                        .datum(data.values)
                        .call(labels);
                }
                
                z.domain(data.values.map(function(d){
                    return d.key;
                }));
                
                var r = Math.min(dims.w - dims.m.l - dims.m.r, dims.h - dims.m.t - dims.m.b)/2;
                
                var r2 = _arcExpand ? r - _arcExpand : r;

                pie.value(function(d) {
                    return d.disabled ? 0 : d.value;
                });

                if(_rotateArcs){
                    pie.sort(function(d){
                        return d.index;
                    });
                } 
                else{
                    pie.sort(null);
                }
                
                arc.outerRadius(r2);
                
                outerArc.outerRadius(r2 + 2);
                outerArc.innerRadius(r2 + 2);

                arc2.outerRadius(r2);
                arc2.innerRadius(r2);

                if(_innerRadius){
                    arc.innerRadius(r2 - _innerRadius);
                }else{
                    arc.innerRadius(r2/2);
                }

                var arcTween = function(a) {
                    var i = d3.interpolate(this._current, a);
                    this._current = i(0);
                    
                    if(a.data.key === _prevEnlarged){
                        var k = d3.interpolate(r , r2);
                        _prevEnlarged = undefined;
                        return function(t) {
                            return arc.outerRadius(k(t))(i(t));
                        };
                    }
                    else if(a.data.enlarge) {
                        var k = d3.interpolate(r2, r);
                        _prevEnlarged = a.data.key;
                        return function(t) {
                            return arc.outerRadius(k(t))(i(t));
                        };
                    }
                    else{
                        return function(t) {
                            return arc.outerRadius(r2)(i(t));
                        };    
                    }
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
                    .attr('class', 'arc')
                    .attr('id', function(d){
                        return d.data.key.replace(' ', '_');
                    })
                    .attr("fill", function (d, i) {
                        return z(d.data.key);
                    })
                    .each(function (d) {
                        this._current = {
                            data: d.data,
                            value: d.value,
                            startAngle: enterAntiClockwise.startAngle,
                            endAngle: enterAntiClockwise.endAngle
                        };
                    });

                
                arcs.transition().ease("poly(4)").duration(400).attrTween("d", function(d){
                    return arcTween.call(this, d);
                });

                arcs.exit()
                    .transition()
                    .duration(750)
                    .attrTween('d', arcTweenOut)
                    .remove(); // now remove the exiting arcs
                    
                
                gWrapperEnter.append("g").attr('class', 'text-group');
                
                var total = 0;

                for(var i = 0; i < data.values.length; i++){
                    if(!data.values[i].disabled) total = total + (+data.values[i].value);
                }

                var texts = gWrapper.selectAll('g.text-group')
                    .attr('transform', 'translate(' + (dims.w/2) + ',' + (r + dims.m.t) + ')')
                    .selectAll('text')
                    .data(pie(data.values));
                    
                var textsEnter = texts.enter()
                    .append('svg:text')
                    .attr('transform', 'translate(0,0)');
                    
                if(_keyLabels){
                    textsEnter
                        .append('svg:textPath')
                        .attr('xlink:href', function(d){
                            return '#' + d.data.key.replace(' ', '_');
                        })
                        .text(function(d) { 
                            return d.data.key;
                        })
                        .attr('letter-spacing', 4);
                    texts.attr('dx', '10px')
                    .attr('dy', '30px');
                    
                }
                else{
                    textsEnter.attr("dy", ".35em");
                    texts
                        .style("text-anchor", "middle")
                        .text(function(d) { 
                            return d.data.disabled ? '' : Math.round(d.value/total * 100).toFixed(1) + '%';
                        });
                    texts.transition().duration(750).attr("transform", function(d) {
                        return "translate(" + arc.centroid(d) + ")";
                    });
                }

                texts.attr('fill', function(d){
                    return d.data.enlarge ? '#fff' : _textFillColor;
                });

                if(_arcExpand){
                    arcs.on('click', dispatch.arcClick);
                    texts.on('click', dispatch.arcClick);
                }


                texts.exit().remove();

                if(_drawDataKey){
                    gWrapperEnter
                        .append('svg:text')
                        .attr('class', 'pie-label')
                        .attr('fill', '#1f77b4')
                        .style('text-anchor', 'middle');

                    var pieLabel = gWrapper.select('text.pie-label')
                        .text(data.key)
                        .attr('transform', 'translate(' +(dims.w/2)+ ',' + (r + r + dims.m.t + 15) + ')');                        
                }
                

                if(_drawPolyLines){
                    gWrapperEnter.append("g").attr('class', 'polyline-group');
                    
                    var polyline = gWrapper.select('g.polyline-group')
                        .attr('transform','translate(' + (dims.w/2) + ',' + (r + dims.m.t) + ')')
                        .selectAll('polyline')
                        .data(pie(data.values));
                    
                    polyline.enter()
                        .append("polyline")
                        .style("opacity", 0)
                        .each(function(d) {
                            this._current = d;
                        });

                    polyline.transition().duration(1000)
                        .style("opacity", function(d) {
                            return d.data.value == 0 || d.data.disabled ? 0 : .5;
                        })
                        .attrTween("points", function(d){
                            this._current = this._current;
                            var interpolate = d3.interpolate(this._current, d);
                            var _this = this;
                            return function(t) {
                                var d2 = interpolate(t);
                                _this._current = d2;
                                var pos = outerArc.centroid(d2);
                                pos[0] = (r2 * 0.95 * (midAngle(d2) < Math.PI ? 1.1 : -1.1));
                                return [arc2.centroid(d2), outerArc.centroid(d2), pos];
                            };          
                        });

                    polyline
                        .exit().transition().delay(1000)
                        .remove();

                    gWrapperEnter.append("g").attr('class', 'polytext-group');
                    
                    var polytext = gWrapper.select('g.polytext-group')
                        .attr('transform','translate(' + (dims.w/2) + ',' + (r + dims.m.t) + ')')
                        .selectAll('text')
                        .data(pie(data.values));

                    polytext.enter()
                        .append("text")
                        .style("opacity", 0)
                        .attr("dy", ".35em")
                        .each(function(d) {
                            this._current = d;
                        });

                    polytext.transition().duration(1000)
                        .style("opacity", function(d) {
                            return d.data.value == 0 || d.data.disabled ? 0 : 1;
                        })
                        .text(function(d) {
                            return drata.utils.format('{0}: {1}', d.data.key, drata.utils.formatNumber(d.value, 0, '.', ','));
                        })
                        .attrTween("transform", function(d) {
                            var interpolate = d3.interpolate(this._current, d);
                            var _this = this;
                            return function(t) {
                                var d2 = interpolate(t);
                                _this._current = d2;
                                var pos = outerArc.centroid(d2);
                                pos[0] = r2 * (midAngle(d2) < Math.PI ? 1.1 : -1.1);
                                return "translate("+ pos +")";
                            };
                        })
                        .styleTween("text-anchor", function(d){
                            var interpolate = d3.interpolate(this._current, d);
                            return function(t) {
                                var d2 = interpolate(t);
                                return midAngle(d2) < Math.PI ? "start":"end";
                            };
                        });
                    polytext
                        .exit().transition().delay(1000)
                        .remove();
                }
            });
            
            return chart;
        };

        chart.drawOuterLabels = function(value){
            if (!arguments.length) return _drawOuterLabels;
            _drawOuterLabels = value;
            return chart;
        };

        chart.drawDataKey = function(value){
            if (!arguments.length) return _drawDataKey;
            _drawDataKey = value;
            return chart;
        };

        chart.rotateArcs = function(value){
            if (!arguments.length) return _rotateArcs;
            _rotateArcs = value;
            return chart;
        };

        chart.arcExpand = function(value){
            if (!arguments.length) return _arcExpand;
            _arcExpand = value;
            return chart;
        };
        
        chart.keyLabels = function(value){
            if (!arguments.length) return _keyLabels;
            _keyLabels = value;
            return chart;
        };
        chart.innerRadius = function(value){
            if (!arguments.length) return _innerRadius;
            _innerRadius = value;
            return chart;
        };

        chart.onEvent = function(eventName, callback){
            events[eventName] = callback;
            return chart;
        };

        chart.textFillColor = function(value){
            if (!arguments.length) return _textFillColor;
            _textFillColor = value;
            return chart;
        };

        chart.drawPolyLines = function(value){
            if (!arguments.length) return _drawPolyLines;
            _drawPolyLines = value;
            return chart;
        };
        

        return chart;
    };
    root.drata.ns('charts').extend({
        pieChart : PieChart
    });
})(this);