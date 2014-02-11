
 ;(function(root) {
    var Labels = function(){

        var _w, _h, _color, _align, _dispatch = d3.dispatch();
        
        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);
                var temp = 0;

                var exl = data.map(function(d){
                    temp = temp + drata.utils.textToPixel(d.key) + 20;
                    return temp;
                });

                var labelsWrapper = container
                    .selectAll('g.label-group')
                    .data(data);

                if(_align === 'center') {
                    container.attr('transform', 'translate('+ (_w-temp)/2 + ',' + _h +')');
                }
                
                exl.splice(0, 0 , 0);

                var labelWrapper = labelsWrapper.enter()
                    .append('g')
                    .attr('class','label-group');
                    
                container.selectAll('g.label-group')
                    .attr('transform', function(d, i){
                        return 'translate('+ exl[i] +')';
                });
                labelWrapper.append('text').attr('class', 'label-text');
                labelWrapper.append('circle').attr('class', 'label-circle');

                labelsWrapper
                    .select('text.label-text')
                    .attr('x', function(){
                        return 10;
                    })
                    .attr('y', 24)
                    .attr('fill', function(d,i){
                        return _color(d.key,i);
                    })
                    .text(function(d){
                        return d.key;
                    })
                    .on('click', _dispatch.togglePath);

                labelsWrapper
                    .select('circle.label-circle')
                    .attr('r',4)
                    .attr('fill', function(d, i){
                        return (d.disabled)? '#fff' : _color(d.key, i);
                    })
                    .attr('stroke', function(d, i){
                        return _color(d.key, i);
                    })
                    .attr('stroke-width',2)
                    .attr('cy', function(){
                        return 20;
                    })
                    .on('click', _dispatch.togglePath);

                labelsWrapper.exit().remove();
            });
            return chart;
        }

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

        chart.width= function(value){
            if (!arguments.length) return _w;
            _w = value;
            return chart;
        };
        chart.height= function(value){
            if (!arguments.length) return _h;
            _h = value;
            return chart;
        };
        chart.align= function(value){
            if (!arguments.length) return _align;
            _align = value;
            return chart;
        };
        return chart;
    };
    root.drata.ns('models').extend({
        labels : Labels
    });
})(this);