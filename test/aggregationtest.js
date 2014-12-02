//var mongo = require('mongodb');
var utils = require('../utils/utils');
var aggregator = require('../utils/aggregator');
var config = require('../routes/config.json');
var Q = require('q');
var _ = require('underscore');

var assert = require('assert');

describe('#utils', function(){
	it('#getType should return correct datatype', function(){
	  assert.strictEqual('string', utils.getType('abcd'));
	  assert.strictEqual('numeric', utils.getType(2));
	  assert.strictEqual('bool', utils.getType(false));
	});

	it('#getUniqueProperties should return unique properties of a collection', function(){
	  
	  var input = [{a:1,b:2}, {b:1,c:4}, {d:{a:1,b:2}, a:2}];
	  var result = Object.keys(utils.getUniqueProperties(input));
	  //console.log(result);
	  var expected = ['a', 'b', 'c', 'd.a', 'd.b'];
	  for(var i=0;i<expected.length;i++){
	  	assert.notStrictEqual(-1, result.indexOf(expected[i]));
	  }
	});
	
});


var linechartjson = require('./testjson/linechart_1selection_interval_splitby_staticinterval.json');
var barchartjson = require('./testjson/barchart_2selection_2groupby_dynamic_interval.json');
describe('#aggregator getGraphData', function(){
	it(linechartjson.description, function(){
		var output = aggregator.getGraphData(linechartjson.segment, linechartjson.inputData);
		assert.strictEqual(true, _.isEqual(output, linechartjson.expected));
	});
	it(barchartjson.description, function(){
		var output = aggregator.getGraphData(barchartjson.segment, barchartjson.inputData);
		//console.log(JSON.stringify(output, null, '\t'));
		assert.strictEqual(true, _.isEqual(output, barchartjson.expected));
	});
});


var input = [{
	a : 1,
	b : 2
},{
	a : 2,
	b : 3,
}];
var simpleSelection = {
	isComplex : false,
	groupBy : 'min',
	selectedProp : 'a',
	groupType: 'selection',
	logic: '+'
};
var complexSelection = {
	groupType: "selection",
	groups: [
		{
			groupType: "selection",
			groups: [],
			logic: "+",
			selectedProp: "a",
			isComplex: false
		},
		{
			groupType: "selection",
			groups: [],
			logic: "+",
			selectedProp: "b",
			isComplex: false,
			perc: false
		}
	],
	logic: "+",
	aliasName: "pricedisc",
	groupBy: "sum",
	selectedProp: "pricedisc",
	isComplex: true
};

describe('#aggregator reduceData', function(){

	it('should process min value', function(){
		var output = aggregator.reduceData(input, simpleSelection);
		//console.log(JSON.stringify(output, null, '\t'));
		assert.strictEqual(1, output);
	});
	it('should process max value', function(){
		var selection = utils.clone(simpleSelection);
		selection.groupBy = 'max';
		var output = aggregator.reduceData(input, selection);
		//console.log(JSON.stringify(output, null, '\t'));
		assert.strictEqual(2, output);
	});

	it('should derive count of a property in an array', function(){
		var selection = utils.clone(simpleSelection);
		selection.groupBy = 'count';
		var output = aggregator.reduceData(input, selection);
		//console.log(JSON.stringify(output, null, '\t'));
		assert.strictEqual(2, output);
	});

	it('should derive sum of a property in an array', function(){
		var selection = utils.clone(simpleSelection);
		selection.groupBy = 'sum';
		var output = aggregator.reduceData(input, selection);
		//console.log(JSON.stringify(output, null, '\t'));
		assert.strictEqual(3, output);
	});

	it('should derive average of a property in an array', function(){
		var selection = utils.clone(simpleSelection);
		selection.groupBy = 'avg';
		var output = aggregator.reduceData(input, selection);
		//console.log(JSON.stringify(output, null, '\t'));
		assert.strictEqual(1.5, output);
	});

	it('should throw error if selecting count of complex selection', function(){
		var selection = utils.clone(simpleSelection);
		selection.groupBy = 'count';
		selection.isComplex = true;
		assert.throws(aggregator.reduceData.bind(this,input, selection), Error);
	});

	it('should throw error if groupBy is not valid', function(){
		var selection = utils.clone(simpleSelection);
		selection.groupBy = 'something';
		assert.throws(aggregator.reduceData.bind(this,input, selection), Error);
	});

	it('should calculate sum of a complex selection', function(){
		//console.log(JSON.stringify(selection, null, '\t'));
		var output = aggregator.reduceData(input, complexSelection);
		assert.strictEqual(8,output);
	});
});

describe('#aggregator processSimple', function(){
	it('should return the value of property and logic of simple selection', function(){
		var output = aggregator.processSimple(input[0], simpleSelection);
		var expected = {
			value: input[0].a,
			logic: simpleSelection.logic
		}
		assert.strictEqual(true, _.isEqual(expected, output));
	});

	it('should return the calculated value of complex selection and logic of complex selection', function(){
		var output = aggregator.processGroup(input[0], complexSelection);
		//console.log(output);
		var expected = {
			value: 3,
			logic: complexSelection.logic
		}
		assert.strictEqual(true, _.isEqual(expected, output));
	});
});

















