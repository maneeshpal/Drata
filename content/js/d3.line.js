;(function(root){
	var defaultOptions = {
		margin:{ top: 10, right: 10, bottom: 25, left: 30 },
        graphOptions:{
            resize:true,
            dateFormat : 'timestamp',
            xAxis:{
                orient:'bottom',
                type:'time',
                ticks:5,
                class:'x axis'
            },
            yAxis:{
                orient:'left',
                type:'linear',
                ticks:5,
                class:'y axis',
                transform: 'rotate(-90)',
                label:'this is my y'
            },
            interpolate:'cardinal',
            preserveAspectRatio: 'xMidYMid',
            linearGradient :{
                id:'my-gradient',
                offsetColors:[
                    { offset: "0%", color: "steelblue" },
                    { offset: "50%", color: "green" },
                    { offset: "100%", color: "red" }
                ],
                clippings:{
                    y1: 2,
                    y2: 8
                }
            }
        }
	};
	var LineGraph = function(elementId, options,graphData){
		var self = this;

        $.extend(self,defaultOptions,options);
        self.data = graphData;
        self.elem = document.getElementById(elementId);
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

        self.yAxis = d3.svg.axis()
            .scale(self.y)
            .ticks(self.graphOptions.yAxis.ticks)
            .orient(self.graphOptions.yAxis.orient);

        self.line = d3.svg.line()
                        .x(function (d) { 
                            return self.x(d.x);
                            })
                        .y(function (d) { 
                            return self.y(d.y); 
                        });
        self.graphOptions.interpolate && self.line.interpolate(self.graphOptions.interpolate);
        self.graphContainer = d3.select( '#' + self.elem.id);
        self.color = d3.scale.category10()
                        .domain(self.data.map(function(d){
                            return d.name;
                    }));
        self.tooltip = self.graphContainer.append('div')
            .attr('class','tooltip');

        self.renderGraph = function(){
            self.graphContainer.select('svg').remove();
            self.width = self.elem.clientWidth,
            self.height = self.elem.clientHeight;
            self.x.range([0, self.width - self.margin.left - self.margin.right]);
            
            self.y.range([self.height - self.margin.top - self.margin.bottom, 0]);
            self.svg = self.graphContainer
                .append("svg")
                .attr("viewBox", "0 0 " + self.width + " " + self.height)
                .attr("preserveAspectRatio", self.graphOptions.preserveAspectRatio)
                .append("g")
                .attr("transform", "translate(" + self.margin.left + "," + self.margin.top + ")");

            if(0 && self.graphOptions.linearGradient){
                self.svg.append("linearGradient")
                    .attr("id", self.graphOptions.linearGradient.id)
                    .attr("gradientUnits", "userSpaceOnUse")
                    .attr("x1", 0).attr("y1", self.y(self.graphOptions.linearGradient.clippings.y1))
                    .attr("x2", 0).attr("y2", self.y(self.graphOptions.linearGradient.clippings.y2))
                    .selectAll("stop")
                    .data(self.graphOptions.linearGradient.offsetColors)
                    .enter().append("stop")
                    .attr("offset", function (d) { return d.offset; })
                    .attr("stop-color", function (d) { return d.color; });
            }
            //self.svg= svg;
            self.draw(self.data);
        };
        self.getExtent = function(data){
            var xExtent = [null,null], yExtent = [null,null];

            for(var i = 0;i<data.length;i++){
                if(self.graphOptions.xAxis.type =='time'){
                    for(var j = 0;j<data[i].values.length;j++){
                        data[i].values[j].x = self.parseDate(data[i].values[j].x);
                    }
                }
                var xRange, yRange;
                xRange = d3.extent(data[i].values, function (d) { return d.x; });
                yRange = d3.extent(data[i].values, function (d) { return d.y; });
                if(xExtent[0]==null || xRange[0]<xExtent[0])
                    xExtent[0] = xRange[0];
                if(xExtent[1]==null || xRange[1]>xExtent[1])
                    xExtent[1] = xRange[1];
                if(yExtent[0]==null || yRange[0]<yExtent[0])
                    yExtent[0] = yRange[0];
                if(yExtent[1]==null || yRange[1]>yExtent[1])
                    yExtent[1] = yRange[1];
            }
            return {x:xExtent,y:yExtent};
        };
        self.drawAxes = function(){
            self.graphContainer.select('#gxaxis').remove();
            self.graphContainer.select('#gyaxis').remove();
            self.svg.append("g")
                .attr('id','gxaxis')
                .attr("class", self.graphOptions.xAxis.class)
                .attr("transform", "translate(0," + (self.height - self.margin.top - self.margin.bottom) + ")")
                .call(self.xAxis);

            self.svg.append("g")
                .attr('id','gyaxis')
                .attr("class", self.graphOptions.yAxis.class)
                .call(self.yAxis)
                .append("text")
                .attr("transform", self.graphOptions.yAxis.transform)
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text(self.graphOptions.yAxis.label);
        };
        self.highlightPath = function(path){
            self.graphContainer.select('.lines-g').selectAll('path')
                .attr('class', 'line-path unselected-line-path');
            d3.select(path).attr('class','line-path selected-line-path');
        };
        self.draw=function(data){
            var extent = self.getExtent(data);
            self.x.domain(extent.x);
            self.y.domain(extent.y);
            self.drawAxes();
            var pathIndex=0;
            self.graphContainer.selectAll('.lines-g').remove();
            self.graphContainer.selectAll('.circles-g').remove();
            self.svg.append("g")
                .attr('class',"lines-g")
                .selectAll("path")
                .data(data)
                .enter()
                .append("path")
                .attr('id', function(d){
                    return d.name;
                })
                .attr("class",'line-path')
                .attr("style", function(d){
                    return 'stroke:'+ self.color(d.name);})
                
                .attr("d", function(d){
                    return self.line(d.values)
                })
                .on("mouseover",function(d){
                    self.highlightPath(this);
                })
                .on("mouseout",function(d){
                   self.graphContainer.select('.lines-g').selectAll('path')
                        .attr('class', 'line-path'); 
                });
                
            var circlegroup = self.svg.selectAll("circles-g")
                .data(data)
                .enter()
                .append("g")
                .attr("class", "circles-g");

            var circles = circlegroup
                .selectAll("circle")
                .data(function(d) {
                    var pathId = d.name;
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
                    return self.y(d.y);
                })
                .attr("r", 10)
                .attr("stroke", function(d){
                    return d.color;
                })
                .attr('stroke-width','4')
                .attr('fill','white')
                .attr("opacity", 0)
                .on("mouseover",function(d){
                    d3.select(this).attr('opacity',1);
                    self.tooltip.style("visibility", "visible");
                    self.tooltip.style("top", (self.y(d.y)-35) + 'px');
                    self.tooltip.style("left", (self.x(d.x)+50) + 'px');
                    self.tooltip.text("Time: " + d.x + "\nValue: " + d.y);
                    self.highlightPath('#'+d.pathId);
                    return ;
                })
                .on("mouseout",function(d){
                    self.graphContainer.select('.lines-g').selectAll('path')
                        .attr('class', 'line-path');
                    d3.select(this).attr('opacity',0);
                    return self.tooltip.style("visibility","hidden");
                });

            self.extent = extent;
            //self.svg.exit().remove();
        };
        self.renderGraph();
        if(self.graphOptions.resize){
            $(window).on('resize', function(){
                self._t && clearTimeout(self._t);
                self._t = setTimeout(self.renderGraph.bind(self), 2000);    
            });
        }
	};
	root.atombomb.namespace('d3').extend({
	    LineGraph: LineGraph
	});
})(this);