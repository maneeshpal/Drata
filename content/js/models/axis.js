
 ;(function(root) {
    var Axis = function(){

        var _orient, _scale, _domain, _gl = false, _dims, _axisType, _axisTicType, _ticks, _tickFormat;
        var axis = d3.svg.axis();
        //var _m = {l:30, r:10, t:30, b:30};
        
        
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

        var intervalFormats = {
            month : {format: '%b %Y', b: 30, l: 50},
            year: {format: '%Y', b: 20, l: 30},
            day: {format: '%Y %b %d', b: 40, l: 60},
            hours: {format: '%Y %b %d %H:%M', b: 60,l: 80},
            get: function(range){
                var msDay = 172800000, msMonth = 7776000000, msYear = 31536000000;
                var interval = range[1] - range[0];
                if(interval <= msDay){
                    // 3 days
                    return this.hours;
                }
                if(interval <= msMonth){
                    //3 months
                    return this.day;
                }
                if(interval <= msYear){
                    //1 year
                    return this.month;
                }
                return this.year;
            }
        };

        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);

                var enabledData = data.filter(function(d){
                    return !d.disabled;
                });
                
                var dataLength = enabledData.length;
                var intFormat;
                _domain = [getMin(enabledData, _axisType),getMax(enabledData, _axisType)];
                
                switch(_axisTicType){
                    case 'numeric':
                        _scale = d3.scale.linear();
                        _tickFormat = d3.format('.1f');
                        break;
                    case 'currency':
                        _scale = d3.scale.linear();
                        _tickFormat = function(d) {
                            var f = d3.format('.3s');
                            return '$' + f(d);
                        };
                        break;
                    case 'date':
                        intFormat = intervalFormats.get(_domain);
                        _dims.m.b = intFormat.b;
                        _dims.m.l = intFormat.l;
                        _scale = d3.time.scale();
                        _tickFormat = d3.time.format(intFormat.format);
                        break;
                }

                var tickSize = 0;
                var wm = _dims.w - _dims.m.l - _dims.m.r;
                var hm = _dims.h - _dims.m.t - _dims.m.b;
                if(_axisType === 'y'){
                    _scale.range([hm, 0]);
                    if(_gl) tickSize = -wm;
                }
                else{
                    _scale.range([0, wm]);
                    if(_gl) tickSize = hm;
                }

                _scale.domain(_domain);

                axis
                    .scale(_scale)
                    .tickFormat(_tickFormat)
                    .orient(_orient);
                
                _ticks > 0 && axis.ticks(_ticks);
                
                tickSize !== 0 && axis.tickSize(-wm);
                
                var xis = container.call(axis);
                if(_axisType === 'x' && intFormat){
                    xis.selectAll('text')
                    .style("text-anchor", "end")
                    .attr("dx", "0")
                    .attr("dy", ".50em")
                    .attr("transform", function(d) {
                        return "rotate(-30)"
                    });
                }
                
            });
            return chart;
        };
        
        chart.dims = function(value){
            if (!arguments.length) return _dims;
            _dims = value;
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

        chart.includeGridLines = function(value){
            if (!arguments.length) return _gl;
            _gl = value;
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
            
            return chart;
        };
        return chart;
    };
    root.drata.ns('models').extend({
        axis : Axis
    });
})(this);