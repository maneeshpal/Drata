
 ;(function(root) {
    var ToolTip = function(){

        var _dispatch = d3.dispatch();
        
        function tt(selection) {
            selection.each(function(data) {
                var container = d3.select(this);
                var toolTipEnter = container
                    .selectAll('text.tooltip')
                    .data([0])
                    .enter().append('text')
                    .attr('class', 'tooltip');

                var toolTip = container.select('text.tooltip');

                _dispatch.on("showToolTip", function(d, color){
                    toolTip.text('x:' + d.x + ', y:' + d.y)
                        .attr('fill', color);
                });

                _dispatch.on("hideToolTip", function(){
                    toolTip.text('');
                });

            });

            return tt;
        };

        tt.dispatch = function(value){
            if (!arguments.length) return _dispatch;
            _dispatch = value;
            return tt;
        };

        return tt;
    };
    root.drata.ns('models').extend({
        toolTip : ToolTip
    });
})(this);