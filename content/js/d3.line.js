;(function(root) {
    var defaultLineOptions = {
        drawPathCircles : false,
        margin: { top: 40, right: 10, bottom: 25, left: 30 },
        resize: true,
        dateFormat: 'timestamp',
        xAxis: {
            orient: 'bottom',
            type: 'linear',
            ticks: 5,
            class: 'axis x'
        },
        yAxis: {
            orient: 'left',
            type: 'linear',
            ticks: 5,
            class: 'axis y',
            transform: 'rotate(-90)',
            label: 'this is my y'
        },
        interpolate: 'linear', /*monotone*/
        preserveAspectRatio: 'xMidYMid',
        linearGradient: {
            id: 'my-gradient',
            offsetColors: [
                { offset: "0%", color: "steelblue" },
                { offset: "50%", color: "green" },
                { offset: "100%", color: "red" }
            ],
            clippings: {
                y1: 2,
                y2: 8
            }
        }
    };
    
	var LineChart = function(elementId, options, graphData){
		var self = this;
        self.graphOptions = {};
		$.extend(self.graphOptions, defaultLineOptions, options);
        self.data = graphData;
        self.elem = document.getElementById(elementId);
        self.labelPos = {};
        self.elemHeight = function(){
            return self.elem.clientHeight;
        };
        self.elemWidth = function(){
            return self.elem.clientWidth;
        };
        self.parseDate = self.graphOptions.dateFormat =='timestamp'? function(timestamp){
                    return new Date(timestamp);
                } : d3.time.format(self.graphOptions.dateFormat).parse;
        
        if(self.graphOptions.xAxis.type =='time'){
                self.x = d3.time.scale(); 
        }
        else{
             self.x = d3.scale.linear();
        }
        self.y = d3.scale.linear();
        self.xAxis = d3.svg.axis()
                .scale(self.x)
                .orient(self.graphOptions.xAxis.orient)
                .ticks(self.graphOptions.xAxis.ticks);
                //.tickSize(-self.elemHeight(), 0, 0);


        self.yAxis = function(){
            return d3.svg.axis()
                    .scale(self.y)
                    .ticks(self.graphOptions.yAxis.ticks)
                    .orient(self.graphOptions.yAxis.orient)
                    .tickSize(-self.elemWidth(), 0, 0);
        };

        self.line = d3.svg.line()
            .x(function (d) {
                return self.x(d.x);})
            .y(function (d) {
                return self.y(d.y); 
        });
        self.graphOptions.interpolate && self.line.interpolate(self.graphOptions.interpolate);
        self.graphContainer = d3.select( '#' + self.elem.id);
        self.color = d3.scale.category10()
                        .domain(self.data.map(function(d){
                            return d.key; 
                    }));
        self.toolTip = new ToolTip({
            graphContainer:self.graphContainer,
            scale :{
                x: self.x,
                y: self.y
            },
            position : 'fixed'
        });
        
        self.drawContainer = function(){
            self.graphContainer.select('svg').remove();
            self.x.range([0, self.elemWidth() - self.graphOptions.margin.left - self.graphOptions.margin.right]);
            
            self.y.range([self.elemHeight() - self.graphOptions.margin.top - self.graphOptions.margin.bottom, 0]);
            self.svg = self.graphContainer
                .append("svg")
                .attr("viewBox", "0 0 " + self.elemWidth() + " " + self.elemHeight())
                .attr("preserveAspectRatio", self.graphOptions.preserveAspectRatio)
                .append("g")
                .attr("transform", "translate(" + self.graphOptions.margin.left + "," + self.graphOptions.margin.top + ")");

            
            var dd = new Date();
            var aa = new Date(dd);
            dd.setHours(dd.getHours()+1);

            self.xdiff = self.x(aa) - self.x(dd);
        };
        self.processData = function(){
            var xExtent = [null,null], yExtent = [null,null];
            
            var labelLength = 2;
            _.each(self.data, function(item){
                if(self.graphOptions.xAxis.type =='time'){
                    _.each(item.values,function(datapoint){
                        datapoint.x = self.parseDate(datapoint.x);
                    });
                };
                var xRange, yRange;
                
                xRange = d3.extent(item.values, function (d) { 
                    return d.x; 
                });
                if(!item.disabled) {
                    yRange = d3.extent(item.values, function (d) { 
                        return d.y; 
                    });
                }
                else if(self.extent){
                    yRange = [self.extent.y[0], self.extent.y[0]];
                }
                
                if(xExtent[0]==null || xRange[0]<xExtent[0])
                    xExtent[0] = xRange[0];
                if(xExtent[1]==null || xRange[1]>xExtent[1])
                    xExtent[1] = xRange[1];
                if(yExtent[0]==null || yRange[0]<yExtent[0])
                    yExtent[0] = yRange[0];
                if(yExtent[1]==null || yRange[1]>yExtent[1])
                    yExtent[1] = yRange[1];
                self.labelPos[item.key]= labelLength;
                labelLength = labelLength + item.key.length;
            });
            self.x.domain(xExtent);
            self.y.domain(yExtent);
            self.extent = {x:xExtent,y:yExtent};
        };
        self.drawAxes = function(){
            root.logmsg && console.log('drawing axes');
            var xaxis = self.svg.select('#gxaxis');
            var yaxis = self.svg.select('#gyaxis');
            if(!self.elementExists(xaxis)){
                xaxis = self.svg.append("g").attr('id','gxaxis')
                        .attr("class", self.graphOptions.xAxis.class)
                        .attr("transform", "translate(0," + (self.elemHeight() - self.graphOptions.margin.top - self.graphOptions.margin.bottom) + ")");
                        
            }
            xaxis.transition().duration(1000).call(self.xAxis);
            root.logmsg && console.log('x axis drawn');

            if(!self.elementExists(yaxis)){
                yaxis = self.svg.append("g")
                .attr('id','gyaxis')
                .attr("class", self.graphOptions.yAxis.class);
                yaxis
                .append("text")
                .attr("transform", self.graphOptions.yAxis.transform)
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text(self.graphOptions.yAxis.label);
            }
            
            yaxis.transition().duration(1000)
            .call(self.yAxis());
                
            root.logmsg && console.log('y axis drawn');
        };
        self.drawLegendCircles = function(){
            self.graphContainer.selectAll('.legend-circles').remove();
            self.svg.append("g")
                .attr('class', 'legend-circles')
                .selectAll('circle')
                .data(self.data)
                .enter()
                .append('circle')
                .attr('cx', function(d, i){
                    return ((self.labelPos[d.key]*10) + 40*i)-15;
                })
                .attr('cy', -20)
                .attr('r',6)
                .attr('fill', function(d){
                    return self.color(d.key);
                })
                .attr('stroke', function(d){
                    return self.color(d.key);
                })
                .attr('stroke-width','2')
                .on("mouseover",function(d){
                    self.highlightPath('#'+d.key);
                })
                .on("mouseout",function(d){
                    self.graphContainer.select('.lines-g').selectAll('path')
                        .attr('class', 'line-path');
                })
                .on('click', function(d){
                    d3.select(this).attr('fill', d.disabled?self.color(d.key):'#fff');
                    self.highlightPath('#'+d.key);
                    self.svg.select('#'+d.key)
                    .transition().duration(1000)
                    .delay(200)
                    .attr('d', function(){
                        d.disabled = !d.disabled;
                    });
                    self.processData();
                    self.drawAxes();
                    self.drawPaths(true);
                    self.drawCircles();
                });
        };
        self.drawLegendLabels = function(){
            self.graphContainer.selectAll('.legend-labels').remove();
            self.svg.append("g")
                .attr('class', 'legend-labels')
                .selectAll('text')
                .data(self.data)
                .enter()
                .append('text')
                .attr('x', function(d, i){
                    return (self.labelPos[d.key]*10) + 40*i;
                })
                .attr('y', -15)
                .attr('fill', function(d){
                    return self.color(d.key);
                })
                .text(function(d){
                    return d.key;
                })
                .on("mouseover",function(d){
                    self.highlightPath('#'+d.key);
                })
                .on("mouseout",function(d){
                    self.graphContainer.select('.lines-g').selectAll('path')
                        .attr('class', 'line-path');
                });
        };
        self.highlightPath = function(path){
            self.graphContainer.select('.lines-g').selectAll('path')
                .attr('class', 'line-path unselected-line-path');
            self.graphContainer.select(path).attr('class','line-path selected-line-path');
        };
        self.drawCircles = function(){
            if(!self.drawPathCircles)
                return;
            self.graphContainer.selectAll(".circles-g").remove();
            var circlegroup = self.svg.selectAll(".circles-g")
                .data(self.data)
                .enter()
                .append("g")
                .attr("class", function(d){
                    return 'circles-g path-' + d.key;
                });

            var circles = circlegroup
                .selectAll("circle")
                .data(function(d) {
                    var pathId = d.key;
                    return d.values.map(function(d){
                        d.pathId = pathId; 
                        d.color = self.color(pathId);
                        return d;
                    });
                });
            colorIndex = 0;
            var mycircle = circles
                .enter()
                .append("circle")
                .attr("cx", function(d) {
                    return self.x(d.x);
                })
                .attr("cy", function(d) { 
                    return self.y(d.disabled? self.extent.y[0]:d.y);
                })
                .attr("r", 10)
                .attr("stroke", function(d){
                    return d.color;
                })
                .attr('stroke-width','4')
                .attr('fill','white')
                .attr("opacity", 0)
                .on("mouseover",function(d){
                    //if(!d.disabled) return; 
                    d3.select(this).attr('opacity',1);
                    self.highlightPath('#'+d.pathId);
                    self.toolTip.open(d, self.graphOptions.margin.top, 50);
                    return ;
                })
                .on("mouseout",function(d){
                    //if(!d.disabled) return; 
                    self.graphContainer.select('.lines-g').selectAll('path')
                        .attr('class', 'line-path');
                    d3.select(this).attr('opacity',0);
                    self.toolTip.close();
                    return ;
                });
        };
        self._getLine = function(d){
            if(d.disabled){
                var tempdata = drata.utils.clone(d.values);
                tempdata.forEach(function(v){
                    v.y = self.extent.y[0];
                });
                 return self.line(tempdata);
            }
            else{
                return self.line(d.values);
            }
        };
        self.elementExists = function(el){
            return !!el[0][0];
        };
        self.drawPath = function(pathContainer, tr, item){
            var path = pathContainer.select('#' + item.key);
            if(!self.elementExists(path)){
                pathContainer.append("path")
                    .datum(item)
                    .attr('id', function(d){
                        return d.key;
                    })
                    .attr("class",'line-path')
                    .attr("style", function(d){
                        return 'stroke:'+ self.color(d.key);
                    })
                    .attr('transform',null)
                    .attr("d", self._getLine.bind(self))
                    .attr('transform', 'translate(' + self.xdiff + ')');
            }
            else{
                if(!tr){
                    path.attr('transform',null)
                    .attr("d", self._getLine.bind(self))
                    .transition().duration(1000)
                    .attr('transform', 'translate(' + self.xdiff + ')');
                }
                else{
                    path.transition().duration(1000)
                    .attr("d", self._getLine.bind(self));
                }
                    
            }
            root.logmsg && console.log('path drawn : ' + item.key);
                
        };
        self.drawPaths=function(tr){
            root.logmsg && console.log('drawing paths');
            var pathContainer = self.svg.select('.lines-g');
            if(!self.elementExists(pathContainer)){
                pathContainer = self.svg
                .append("g")
                .attr('class',"lines-g")
                .attr('transform', 'translate(' + (-self.xdiff) + ')');
            }
            _.each(self.data, self.drawPath.bind(self, pathContainer, tr));
        };
        self.drawContent = function(){
            self.drawAxes();
            var aa = new Date();
            self.drawPaths();
            root.logmsg && console.log('draw path: '+ (new Date() - aa));
            aa = new Date();
            self.drawCircles();
            root.logmsg && console.log('draw circle: '+ (new Date() - aa));
            aa = new Date();
            self.drawLegendLabels();
            root.logmsg && console.log('draw legend labels: '+ (new Date() - aa));
            aa = new Date();
            self.drawLegendCircles();
            root.logmsg && console.log('draw legend circles: '+ (new Date() - aa));
        };
        self.redrawResize = function(){
            self.drawContainer();
            self.drawContent();
        };
        self.redraw = function(){
            self.processData();
            self.drawContent();
        };
        self.drawStream = function(){
            var pd = new Date();
            self.processData();
            root.logmsg && console.log('process data:' + (new Date() - pd));
            pd = new Date();
            self.drawAxes();
            root.logmsg && console.log('draw axes:' + (new Date() - pd));
            self.drawPaths();
            self.drawCircles();
        };
	    self.removeChart = function() {
	        self.svg.remove();
            self._t && clearTimeout(self._t);
	    };
        self.init = function(){
            var pd = new Date();
            self.processData();
            root.logmsg && console.log('process data:' + (new Date() - pd));
            self.drawContainer();
            self.drawContent();
            // self.graphOptions.resize &&  $(window).on('resize', function(){
                
            // });
        };

        self.onResize = function(){
            self._t && clearTimeout(self._t);
            self._t = setTimeout(self.redrawResize.bind(self), 2000);
        };

        var st = new Date();
        root.logmsg && console.log(new Date());
        self.init();
        root.logmsg && console.log('time it took :' + (new Date() - st));
	};
    var ToolTip = function(params){
        var self = this;
        $.extend(self, params);
        self._tip = null;
        self._create = function(){
            self._tip = self.graphContainer.append('div')
            .attr('class','tooltip');
            self.close();
        };
        self.open = function(data,top,left){
            if(self.position === 'relative'){
                self._tip.style("top", (self.scale.y(data.y)+top) + 'px');
                self._tip.style("left", (self.scale.x(data.x) +left) + 'px');
            }
            self._tip.style('background-color', data.color);
            self._tip.style("visibility", "visible");
            self._tip.text("Time: " + data.x + "\nValue: " + data.y);
        };
        self.close = function(){
            if(self.position === 'relative'){
                self._tip.style('top', 0);
                self._tip.style('left', 0);
            }
            self._tip.style('visibility','hidden');
        };
        self._create();
    };
    root.logmsg = false;
    root.drata.ns('charts').extend({
        LineChart : LineChart
    });
})(this);