
 ;(function(root) {
    var ToolTip = function(){

        var _dispatch = d3.dispatch();
        
        function tt(selection) {
            selection.each(function(data) {
                var container = d3.select(this);
                
                var txt = container.select('#tt');
                if(!txt[0][0]){
                    txt = container.append('div')
                    .attr('id', 'tt').attr('class', 'd3-tip');
                }
                
                //txt.style('display', 'none');
                _dispatch.on("showToolTip", function(d, color, xPos, yPos){
                    txt.html('x:' + d.x + ', y:' + d.y)
                    .attr('style', 'display: \'\', left: ' + xPos + ';top: ' + yPos);
                    //txt.offset({left: xPos,top: yPos });
                });

                _dispatch.on("hideToolTip", function(){
                    //toolTip.text('');
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