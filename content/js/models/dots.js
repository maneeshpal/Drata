
 ;(function(root) {
    var Dots = function(){

        var _xScale, _yScale, _color = d3.scale.category20(), _dispatch = d3.dispatch();
        
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
                        return d.values;
                    });

                dot
                    .enter()
                    .append('circle')
                    .attr('class', 'circle-each');

                dot.attr('r',2)
                    .attr('fill', 'none')
                    .attr('stroke', function(d){
                        return '#fff';
                    })
                    .attr('stroke-width', 2)
                    .on('mouseover', function(d){
                        var color = _color(d3.select(this.parentNode).data()[0].key);
                        d3.select(this)
                            .attr('stroke', color)
                            .attr('stroke-width', 4)
                            .attr('r', 4)
                            .attr('fill', '#fff');
                        _dispatch.showToolTip(d, color);
                    })
                    .on('mouseout', function(d){
                        _dispatch.hideToolTip();
                        d3.select(this)
                            .attr('stroke', '#fff')
                            .attr('stroke-width', 2)
                            .attr('r', 2)
                            .attr('fill', 'none');
                        
                    })
                    .transition().duration(500)
                    .attr('cx', function(d){
                        return _xScale(d.x);
                    })
                    .attr('cy', function(d){
                        return _yScale(d.y);
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
        return chart;
    };
    root.drata.ns('models').extend({
        dots : Dots
    });
})(this);