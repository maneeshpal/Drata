
 ;(function(root) {
    var Axis = function(){

        var _orient, _scale, _w, _h, _domain, _m, _axisType, _axisTicType, _ticks, _tickSize = 0, _tickFormat;
        var axis = d3.svg.axis();
        var _m = {l:30, r:10, t:30, b:30};
        
        
        var getMin = function(data, prop){
            return d3.min(data, function(d) { 
                return d3.min(d.values.filter(function(i){return !i.disabled}), function(v) {
                    return v[prop]; 
                }); 
            });
        };

        var getMax = function(data, prop){
            return d3.max(data, function(d) { 
                return d3.max(d.values.filter(function(i){return !i.disabled}), function(v) { 
                    return v[prop]; 
                }); 
            });
        };
        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);

                var enabledData = data.filter(function(d){
                    return !d.disabled;
                });

                _scale.range(_axisType === 'y' ? [_h, 0] : [0, _w]);
                
                _domain = [getMin(enabledData, _axisType),getMax(enabledData, _axisType)];
                _scale.domain(_domain);

                axis
                    .scale(_scale)
                    .tickFormat(_tickFormat)
                    .orient(_orient);
                _ticks > 0 && axis.ticks(_ticks);
                _tickSize!==0 && axis.tickSize(_tickSize);
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
            if(_axisTicType) throw "Cant set both AxisTicType and Scale";
            _scale = value;
            return _scale;
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

        chart.axisType = function(value){
            if (!arguments.length) return _axisType;
            _axisType = value;
            return chart;
        };

        chart.domain = function(value){
            if (!arguments.length) return _domain;
            _domain = value;
            return chart;
        };

        chart.axisTicType = function(value){
            if (!arguments.length) return _axisTicType;
            _axisTicType = value;
            switch(_axisTicType){
                case 'numeric':
                    _scale = d3.scale.linear();
                    _tickFormat = d3.format('.3s');
                    break;
                case 'currency':
                    _scale = d3.scale.linear();
                    _tickFormat = function(d) {
                        var f = d3.format('.3s');
                        return '$' + f(d);
                    };
                    break;
                case 'date':
                    _scale = d3.time.scale();
                    _tickFormat = d3.time.format("%Y %b %d %H:%M");
                    break;
            }
            return chart;
        };
        return chart;
    };
    root.drata.ns('models').extend({
        axis : Axis
    });
})(this);