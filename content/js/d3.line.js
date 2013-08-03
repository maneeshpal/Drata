;(function(root, $){
	var defaultOptions = {
		margin:{ top: 10, right: 10, bottom: 25, left: 20 },
        graphOptions:{
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
            interpolate:'basis',
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
    var data = [{
        plot : [{
            x : 1375484299352,
            y : 2,
        },
        {
            x : 1375484354217,
            y : 6,
        }],
        class:'line',
        stroke:'#FF0000'
    },{
        plot : [{
            x : 1375484316742,
            y : 4,
        },
        {
            x : 1375484368956,
            y : 4,
        }],
        class:'line',
        stroke:'#FFFF00'
    }];
	var LineGraph = function(elementId, options,graphData){
		var self = this;
        $.extend(self,defaultOptions,options);
        self.data = graphData || data;
        self.elem = document.getElementById(elementId);
        self.width = self.elem.clientWidth,
        self.height = self.elem.clientHeight;
        self.parseDate = self.graphOptions.dateFormat =='timestamp'? function(timestamp){
                return new Date(timestamp);
            } : d3.time.format(self.graphOptions.dateFormat).parse;
        // if(self.graphOptions.dateFormat =='timestamp'){
        //     self.parseDate = function(timestamp){
        //         return new Date(timestamp);
        //     }
        // }
        // else{
        //     self.parseDate = d3.time.format(self.graphOptions.dateFormat).parse;
        // }
        if(self.graphOptions.xAxis.type =='time'){
            self.x = d3.time.scale()
            .range([0, self.width - self.margin.left - self.margin.right]);
        }
        else{
             self.x = d3.scale.linear()
            .range([0, self.width - self.margin.left - self.margin.right]);
        }
        self.y = d3.scale.linear().range([self.height - self.margin.top - self.margin.bottom, 0]);
        
        self.xAxis = d3.svg.axis()
            .scale(self.x)
            .orient(self.graphOptions.xAxis.orient)
            .ticks(self.graphOptions.xAxis.ticks);

        self.yAxis = d3.svg.axis()
            .scale(self.y)
            .ticks(self.graphOptions.yAxis.ticks)
            .orient(self.graphOptions.yAxis.orient);

        self.line = d3.svg.line();
        self.graphOptions.interpolate && self.line.interpolate(self.graphOptions.interpolate);
        self.line
            .x(function (d) { return self.x(d.x); })
            .y(function (d) { return self.y(d.y); });
        
        var xExtent = [null,null], yExtent = [null,null];

        for(var i = 0;i<self.data.length;i++){
            if(self.graphOptions.xAxis.type =='time'){
                for(var j = 0;j<self.data[i].plot.length;j++){
                    self.data[i].plot[j].x = self.parseDate(self.data[i].plot[j].x);
                }
            }
            var xRange, yRange;
            xRange = d3.extent(self.data[i].plot, function (d) { return d.x; });
            yRange = d3.extent(self.data[i].plot, function (d) { return d.y; });
            if(!xExtent[0] || xRange[0]<xExtent[0])
                xExtent[0] = xRange[0];
            if(!xExtent[1] || xRange[1]>xExtent[1])
                xExtent[1] = xRange[1];
            if(!yExtent[0] || yRange[0]<yExtent[0])
                yExtent[0] = yRange[0];
            if(!yExtent[1] || yRange[1]>yExtent[1])
                yExtent[1] = yRange[1];
        }

        self.x.domain(xExtent);
        self.y.domain(yExtent);
        var svg = d3.select('#' + elementId)
            .append("svg")
            .attr("viewBox", "0 0 " + self.width + " " + self.height)
            .attr("preserveAspectRatio", self.graphOptions.preserveAspectRatio)
            .append("g")
            .attr("transform", "translate(" + self.margin.left + "," + self.margin.top + ")");

        if(self.graphOptions.linearGradient){
            svg.append("linearGradient")
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
        
        svg.append("g")
            .attr("class", self.graphOptions.xAxis.class)
            .attr("transform", "translate(0," + (self.height - self.margin.top - self.margin.bottom) + ")")
            .call(self.xAxis);

        svg.append("g")
            .attr("class", self.graphOptions.yAxis.class)
            .call(self.yAxis)
            .append("text")
            .attr("transform", self.graphOptions.yAxis.transform)
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text(self.graphOptions.yAxis.label);
        var color = d3.scale.category10();
        for(var i = 0;i<self.data.length;i++){
            svg.append("path")
            .datum(self.data[i].plot)
            .attr("class",self.data[i].class)
            //.attr("style", 'stroke:'+ (self.data[i].stroke || color(i)))
            .attr("d", self.line);
        }
	};
	root.atombomb.namespace('d3').extend({
	    LineGraph: LineGraph
	});
})(this, jQuery);