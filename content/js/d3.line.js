;(function(root){
	var defaultOptions = {
		margin:{ top: 40, right: 10, bottom: 25, left: 30 },
        graphOptions:{
            resize:true,
            dateFormat : 'timestamp',
            xAxis:{
                orient:'bottom',
                type:'time',
                ticks:5,
                class:'axis x'
            },
            yAxis:{
                orient:'left',
                type:'linear',
                ticks:5,
                class:'axis y',
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
        }

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
            self.x.range([0, self.elemWidth() - self.margin.left - self.margin.right]);
            
            self.y.range([self.elemHeight() - self.margin.top - self.margin.bottom, 0]);
            self.svg = self.graphContainer
                .append("svg")
                .attr("viewBox", "0 0 " + self.elemWidth() + " " + self.elemHeight())
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
        self.getExtent = function(){
            var xExtent = [null,null], yExtent = [null,null];
            
            var labelLength = 2;
            for(var i = 0;i<self.data.length;i++){
                if(self.graphOptions.xAxis.type =='time'){
                    for(var j = 0;j<self.data[i].values.length;j++){
                        self.data[i].values[j].x = self.parseDate(self.data[i].values[j].x);
                    }
                }
                var xRange, yRange;
                xRange = d3.extent(self.data[i].values, function (d) { return d.x; });
                yRange = d3.extent(self.data[i].values, function (d) { return d.y; });
                if(xExtent[0]==null || xRange[0]<xExtent[0])
                    xExtent[0] = xRange[0];
                if(xExtent[1]==null || xRange[1]>xExtent[1])
                    xExtent[1] = xRange[1];
                if(yExtent[0]==null || yRange[0]<yExtent[0])
                    yExtent[0] = yRange[0];
                if(yExtent[1]==null || yRange[1]>yExtent[1])
                    yExtent[1] = yRange[1];
                self.labelPos[self.data[i].name]= labelLength;
                labelLength = labelLength + self.data[i].name.length;
            }
            //yExtent[1] = yExtent[1] + Math.ceil((yExtent[1]-yExtent[0])/10);
            //yExtent[0] = yExtent[0] - Math.ceil((yExtent[1]-yExtent[0])/10);
            return {x:xExtent,y:yExtent};
        };
        self.drawAxes = function(){
            self.graphContainer.select('#gxaxis').remove();
            self.graphContainer.select('#gyaxis').remove();
            self.svg.append("g")
                .attr('id','gxaxis')
                .attr("class", self.graphOptions.xAxis.class)
                .attr("transform", "translate(0," + (self.elemHeight() - self.margin.top - self.margin.bottom) + ")")
                .call(self.xAxis);

            self.svg.append("g")
                .attr('id','gyaxis')
                .attr("class", self.graphOptions.yAxis.class)
                .call(self.yAxis())
                .append("text")
                .attr("transform", self.graphOptions.yAxis.transform)
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text(self.graphOptions.yAxis.label);
        };
        self.drawLabels = function(){
            self.graphContainer.selectAll('.labels-circle').remove();
            self.svg.append("g")
                .attr('class', 'labels-circle')
                .selectAll('circle')
                .data(self.data)
                .enter()
                .append('circle')
                .attr('cx', function(d, i){
                    return ((self.labelPos[d.name]*10) + 40*i)-15;
                })
                .attr('cy', -20)
                .attr('r',6)
                .attr('fill', function(d){
                    return self.color(d.name);
                })
                .attr('stroke', function(d){
                    return self.color(d.name);
                })
                .attr('stroke-width','2')
                .on("mouseover",function(d){
                    self.highlightPath('#'+d.name);
                })
                .on("mouseout",function(d){
                    self.graphContainer.select('.lines-g').selectAll('path')
                        .attr('class', 'line-path');
                })
                .on('click', function(d){
                    d3.select(this).attr('fill', d.disabled?self.color(d.name):'#fff');
                    self.highlightPath('#'+d.name);
                    self.svg.select('#'+d.name)
                    .transition().duration(1000,function(){
                        self.graphContainer.select('.lines-g').selectAll('path')
                        .attr('class', 'line-path');
                    })
                    .delay(200)
                    .attr('d', function(){
                        if(!d.disabled){
                            d.disabled = true;
                            var tempdata = atombomb.utils.clone(d.values);
                            tempdata.forEach(function(v){
                                v.y = self.extent.y[0];
                            });
                            return self.line(tempdata);
                        }else{
                            d.disabled = false;
                            return self.line(d.values);
                        }
                    });
                });
            self.svg.append("g")
                .attr('class', 'labels')
                .selectAll('text')
                .data(self.data)
                .enter()
                .append('text')
                .attr('x', function(d, i){
                    return (self.labelPos[d.name]*10) + 40*i;
                })
                .attr('y', -15)
                .attr('fill', function(d){
                    return self.color(d.name);
                })
                .text(function(d){
                    return d.name;
                })
                .on("mouseover",function(d){
                    self.highlightPath('#'+d.name);
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
        self.draw=function(){
            var extent = self.getExtent();
            self.x.domain(extent.x);
            self.y.domain(extent.y);
            self.drawAxes();
            self.drawLabels();
            self.graphContainer.selectAll('.lines-g').remove();
            self.graphContainer.selectAll('.circles-g').remove();
            self.svg.append("g")
                .attr('class',"lines-g")
                .selectAll("path")
                .data(self.data)
                .enter()
                .append("path")
                .attr('id', function(d){
                    return d.name;
                })
                .attr("class",'line-path')
                .attr("style", function(d){
                    return 'stroke:'+ self.color(d.name);})
                
                .attr("d", function(d){
                    return self.line(d.values);
                });
                
            var circlegroup = self.svg.selectAll("circles-g")
                .data(self.data)
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
                    self.tooltip.style("top", (self.y(d.y)-self.margin.top) + 'px');
                    self.tooltip.style("left", (self.x(d.x)+50) + 'px');
                    self.tooltip.text("Time: " + d.x + "\nValue: " + d.y);
                    self.highlightPath('#'+d.pathId);
                    return ;
                })
                .on("mouseout",function(d){
                    self.graphContainer.select('.lines-g').selectAll('path')
                        .attr('class', 'line-path');
                    d3.select(this).attr('opacity',0);
                    self.tooltip.style("top", '0');
                    self.tooltip.style("left", '0');
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