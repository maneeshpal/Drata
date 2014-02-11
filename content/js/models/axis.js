
 ;(function(root) {
    var Axis = function(){

        var _orient, _w, _h, _m, _scale, _ticks, _tickSize = 0, _tickFormat;
        var axis = d3.svg.axis();
        var _m = {l:30, r:10, t:30, b:30};
        
        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);
                axis
                    .scale(_scale)
                    .orient(_orient);
                _ticks > 0 && axis.ticks(_ticks);
                _tickSize!==0 && axis.tickSize(_tickSize);
                
                _tickFormat && axis.tickFormat(_tickFormat);

                container
                    .call(axis);
            });
            return chart;
        };
        
        chart.width = function(value){
            if (!arguments.length) return _w;
            _w = value;
            return chart;
        };

        chart.height = function(value){
            if (!arguments.length) return _h;
            _h = value;
            return chart;
        };

        chart.margin = function(value){
            if (!arguments.length) return _m;
            _m = value;
            return chart;
        };

        chart.scale = function(value){
            if (!arguments.length) return _scale;
            _scale = value;
            return chart;
        };

        chart.orient = function(value){
            if (!arguments.length) return _orient;
            _orient = value;
            return chart;
        };

        chart.tickSize = function(value){
            if (!arguments.length) return _tickSize;
            _tickSize = value;
            return chart;
        };
        chart.ticks = function(value){
            if (!arguments.length) return _ticks;
            _ticks = value;
            return chart;
        };
        chart.tickFormat = function(value){
            if (!arguments.length) return _tickFormat;
            _tickFormat = value;
            return chart;
        };
        return chart;
    };
    root.drata.ns('models').extend({
        axis : Axis
    });
})(this);