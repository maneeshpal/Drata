
 ;(function(root) {
    var Area = function(){

        var  _interpolate = 'linear',
            _xScale = d3.scale.linear(),
            _yScale = d3.scale.linear(),
            _color = d3.scale.category20();
        
        var area = d3.svg.area()
            .x(function(d) { return _xScale(d.x); })
            .y(function(d) { return _yScale(d.y); });

        var xdiff;

        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);
                xdiff = _xScale(data[0].values[1].x) - _xScale(data[0].values[0].x);

                var moveleft = function(){
                    this.attr("transform","translate(" + xdiff + ")")
                        .transition()
                        .ease("linear")
                        .attr("transform", "null")
                        ;
                };

                var getFlatLine = function(values){
                    return values.map(function(d){
                        return {
                            x : d.x,
                            y : _yScale.domain()[0]
                        }
                    });
                };


                area.interpolate(_interpolate);
                area.y0(_hm);
                var paths = container
                    .selectAll('.line')
                    .data(data);

                paths.enter()
                    .append("path")
                    .attr("class", "line");
                
                paths
                    // .style("stroke", function(d) { 
                    //     return _color(d.key); 
                    // })
                    .attr('fill', function(d){return _color(d.key);})
                    .transition()
                    .attr('visibility', function(d){
                        return d.disabled ? 'hidden' : '';
                    })
                    .attr("d", function(d) {
                        return (!d.disabled) ? area(d.values) : area(getFlatLine(d.values)); 
                    })
                    //.call(moveleft)
                    ;
                    
                paths.exit().remove();
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

        chart.interpolate = function(value){
            if (!arguments.length) return _interpolate;
            _interpolate = value;
            return chart;
        };

        chart.height = function(value){
            if (!arguments.length) return _hm;
            _hm = value;
            return chart;
        };

        return chart;
    };
    root.drata.ns('models').extend({
        area : Area
    });
})(this);