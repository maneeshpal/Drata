;(function(root) {
	root._tdata = [{x:40, y:10, r: 10, c:'#00f'},{x:40, y:40, r: 20, c:'#00f'}];
	root._tdata2 = [{x:10, y:10, r: 10, c:'#ff0000'},{x:10, y:40, r: 20, c:'#ff0'}];
	root._largedata = [];
	_largedata.push(_tdata);
	_largedata.push(_tdata2);

	var CircleChart = function(){
		var _data, _container;
		var chart = function(){
			if(!_data)
				throw 'Data needed';
			if(!_container)
				throw 'container needed';
			var self = this;
			function drawCircle(dataitem){
				if(drata.utils.isArray(dataitem)){
					drata.utils.forEach(dataitem, function(item){
						drawCircle(item);
					});
				}
				else {
				    _container
				        .append('circle')
				        .datum(dataitem)
				        .attr('cx', function (d) { return d.x; })
				        .attr('cy', function (d) { return d.y; })
				        .attr('r', function (d) { return d.r; })
				        .attr('fill', function (d) { return d.c; })
				        .attr('opacity', .5);
				}
			};
			drawCircle(_data);
			return this;
		};
		chart.data = function(value){
			if (!arguments.length) return _data;
			_data = value;
			return this;
		};
		chart.container = function(value){
			if (!arguments.length) return _container;
			_container = value;
			return this;
		};
		return chart;
	};
	var Circle = {
		removeAll : function(selector){
			if (!arguments.length)
				selector = '.circles';
			this._svg.selectAll(selector).remove();
			return this;
		},
		height : function(value) {
			if (!arguments.length) return this._height;
			this._height = value;
			return this;
		},
		drawSeries: function(mysvg, data) {
			var self = this;
			mysvg.selectAll('g')
			.data(function(){
				return data;
			})
			.enter()
			.append('g')
			.call(self.drawMany);

		},
		drawMany: function(container){
			container
			.selectAll('circle')
			.data(function(d){
				return d; /*pass your data here*/
			})
			.enter()
			.append('circle')
			.attr('cx', function(d){return d.x})
			.attr('cy', function(d){return d.y})
			.attr('r', function(d){return d.r})
			.attr('fill',function(d){return d.c})
			.attr('opacity', .5);
		},
		draw : function(){

		}
	};
    drata.models = {};
    drata.models.circle = Circle;
    drata.models.circleChart = CircleChart;
})(this);