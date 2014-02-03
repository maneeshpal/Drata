
 ;(function(root) {
    var Labels = function(){

        var _xScale, _yScale, _color = d3.scale.category20(), _dispatch = d3.dispatch();
        
        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);
                var labelsWrapper = container
                    .selectAll('g.label-group')
                    .data(data);

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
                        return _color(d.key);
                    })
                    .text(function(d){
                        return d.key;
                    })
                    .on('click', _dispatch.togglePath);

                labelsWrapper
                    .select('circle.label-circle')
                    .attr('r',4)
                    .attr('fill', function(d){
                        return (d.disabled)? '#fff' : _color(d.key);
                    })
                    .attr('stroke', function(d){
                        return _color(d.key);
                    })
                    .attr('stroke-width',2)
                    .attr('cy', function(d){
                        return 20;
                    })
                    .on('click', _dispatch.togglePath);

                labelsWrapper.exit().remove();
            });
            return chart;
        };

        chart.color = function(value){
            if (!arguments.length) return _color;
            _color = value;
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
        labels : Labels
    });
})(this);