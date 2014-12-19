
 ;(function(root) {
    var Dots = function(){

        var _xScale, _yScale, _colorfull = false, _color = d3.scale.category20(), _dispatch = d3.dispatch(), _xAxisTickFormat;
        var _dotRadius =  2;
        var tip = d3.tip && d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
            return drata.utils.format('<div class="d3-tip-header">{0}</div>{1}: {2}', d.key, _xAxisTickFormat(d.x) , drata.utils.formatNumber(d.y, 0, '.', ','));
        });
        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);
                var dotLineGroup = container
                    .selectAll('g.dot-line-group')
                    .data(function(){
                        return data.filter(function(_){return !_.disabled;});
                    });

                dotLineGroup.enter()
                    .append("g")
                    .attr('class','dot-line-group');

                var dot = dotLineGroup
                    .selectAll('circle.circle-each')
                    .data(function(d){
                        _.each(d.values, function(item){
                            item.key = d.key;
                        });
                        return d.values;
                    });

                dot
                    .enter()
                    .append('circle')
                    .attr('class', 'circle-each');

                dot.call(tip);
                
                dot.attr('r', _dotRadius)
                    .attr('fill', function(d){
                        return _color(d.key);
                        //return _colorfull ? _color(d.key) : 'none';
                    })
                    .attr('stroke', 'transparent')
                    .attr('stroke-width', 5)
                    .on('mouseover', function(d){
                        var color = _color(d.key);
                        +_dotRadius && d3.select(this)
                            .attr('stroke', color)
                            //.attr('stroke-width', 20)
                            .attr('r', 4)
                            .attr('fill', '#fff');
                            tip.show.apply(this, arguments);
                        //_dispatch.showToolTip && _dispatch.showToolTip(d, color,_xScale(d.x), _yScale(d));
                    })
                    .on('mouseout', function(d){
                        _dispatch.hideToolTip && _dispatch.hideToolTip();
                        d3.select(this)
                            .attr('r', _dotRadius)
                            .attr('fill', function(d){
                                return _color(d.key);
                            })
                            .attr('stroke', 'transparent');
                            tip.hide.apply(this, arguments);
                    })
                    .transition().duration(500)
                    .attr('cx', function(d){
                        return _xScale(d.x);
                    })
                    .attr('cy', function(d){
                        return _yScale(d);
                    })
                    //.call(moveleft)
                    ;
                dot.exit().remove();
                dotLineGroup.exit().remove();
            });
            return chart;
        };
        chart.color = function(value){
            if (!arguments.length) return _color;
            _color = value;
            return chart;
        };
        
        chart.xAxisTickFormat = function(value){
            if (!arguments.length) return _xAxisTickFormat;
            _xAxisTickFormat = value;
            return chart;
        };
        
        chart.xScale = function(value){
            if (!arguments.length) return _xScale;
            _xScale = value;
            return chart;
        };

        chart.yScale = function(value){
            if (!arguments.length) return _yScale;
            _yScale = value;
            return chart;
        };
        chart.dispatch = function(value){
            if (!arguments.length) return _dispatch;
            _dispatch = value;
            return chart;
        };
        chart.dotRadius = function(value){
            if (!arguments.length) return _dotRadius;
            _dotRadius = value;
            return chart;
        };
        return chart;
    };
    root.drata.ns('models').extend({
        dots : Dots
    });
})(this);