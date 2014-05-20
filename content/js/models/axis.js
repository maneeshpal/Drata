
 ;(function(root) {
    var Axis = function(){

        var _orient, _scale, _domain, _gl = false, _dims, _axisType, _axisTicType,_dateInterval, _ticks = 0, _tickFormat;
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

        
        function chart(selection) {
            selection.each(function(data) {
                var container = d3.select(this);

                var enabledData = data.filter(function(d){
                    return !d.disabled;
                });
                
                var dataLength = enabledData.length;
                var intFormat;
                _domain = [getMin(enabledData, _axisType),getMax(enabledData, _axisType)];
                var ml = 0, mb = 0;
                _tickFormat = drata.utils.getTextFormat({
                    formatType: _axisTicType,
                    formatSubType: _dateInterval,
                    domain: _domain
                });
                switch(_axisTicType){
                    case 'numeric':
                        ml = 50; mb = 50;
                        _scale = d3.scale.linear();
                        break;
                    case 'currency':
                        ml = 30; mb= 30;
                        _scale = d3.scale.linear();
                        break;
                    case 'date':
                        _scale = d3.time.scale();
                        switch(_dateInterval){
                            case 'month':
                                mb = drata.utils.intervalFormats.month.mb;
                                ml = drata.utils.intervalFormats.month.ml;
                                break;
                            case 'quarter':
                                ml = 50; mb = 50;
                                break;
                            case 'year':
                                mb = drata.utils.intervalFormats.year.mb;
                                ml = drata.utils.intervalFormats.year.ml;
                                break;
                            default:
                                intFormat = drata.utils.intervalFormats.get(_domain);
                                mb = intFormat.mb;
                                ml = intFormat.ml;
                        }
                        break;
                }

                var tickSize = 0;
                
                var wm = _dims.w - _dims.m.l - _dims.m.r;
                var hm = _dims.h - _dims.m.t - _dims.m.b;
                
                if(_axisType === 'y'){
                    _scale.range([hm, 0]);
                    if(_gl) tickSize = -wm;
                    axis.ticks(Math.ceil(hm/50));
                }
                else{
                    _scale.range([0, wm]);
                    if(_gl) tickSize = hm;
                    axis.ticks(Math.ceil(wm/50));
                }
                
                if(_ticks > 0){
                    axis.ticks(_ticks);
                }
                
                _scale.domain(_domain);

                tickSize !== 0 && axis.tickSize(-wm);


                var axisLabelLength = 0,c=0,a;
                axis.scale(_scale)
                    .tickFormat(function(d){
                        a = _tickFormat(d);
                        if(_axisType !== 'x') return a;

                         c = drata.utils.textToPixel(a, 'font-size:10px; font-family: arial;');
                         axisLabelLength += c.width;
                        return a;
                    })
                    .orient(_orient);

                var xis = container.call(axis);
                var turnXaxis = axisLabelLength > _dims.w - _dims.m.l - _dims.m.r;
                //maxLabelLength = Math.sin(Math.PI/180 * 30) * (maxLabelLength);
                 
                var angle = (_dims.w < 250)? -60 : -30;
                if(turnXaxis && _axisType === 'x' && _axisTicType === 'date'){
                    xis.selectAll('text')
                    .style("text-anchor", "end")
                    .attr("dx", "0")
                    .attr("dy", ".50em")
                    .attr("transform", function(d) {
                        return "rotate("+ angle +")"
                    });
                    
                _dims.m.b = mb;

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
            //if(_axisTicType) throw "Cant set both AxisTicType and Scale";
            //_scale = value;
            //return _scale;
            throw "scale is readonly property of Axis";
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

        chart.dateInterval = function(value){
            if (!arguments.length) return _dateInterval;
            _dateInterval = value;
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