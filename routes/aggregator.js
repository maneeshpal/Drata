
var _ = require('underscore');

var utils = require('./utils');

var numericOperations = ['>', '<', '<=', '>=', '+', '-', '*', '/'];
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/*copy from utils frontend*/
/*end copy from utils frontend*/
var parseTime = function(input){
    if(!input || !isNaN(+input)) return null;

    var hmsConv = {
        h: 60 * 60 * 1000,
        m: 60 * 1000,
        s: 1000,
        d: 60 * 60 * 1000 * 24,
        y: 60 * 60 * 1000 * 24 * 365,
        w: 60 * 60 * 1000 * 24 * 7
    };
    var hms = input.split(/[^a-z]/gi).filter(function(j){return !!j && hmsConv.hasOwnProperty(j)});
    var num = input.split(/\D/g).map(function(i){return +i}).filter(function(j){return !!j});
    if(hms.length <= 0 || hms.length !== num.length) return null;
    var output = 0;
    
    for(var i=0;i<hms.length;i++){
        output = output + hmsConv[hms[i]] * num[i];
    }
    return output;
};

var calc = function(left, operation, right){
    var result;
    switch (operation){
        case '>':
            result = left > right;
            break;
        case '<':
            result = left < right;
            break;
        case '<=':
            result = left <= right;
            break;
        case '=':
            result = (left === right);
            break;
        case '!=':
            result = (left !== right);
            break;
        case '>=':
            result = left >= right;
            break;
        case 'exists':
            result = left !== undefined;
            break;
        case 'and':
            result = left && right;
            break;
        case 'or':
            result = left || right;
            break;
        case '+':
            result = (+left) + (+right);
            break;
        case '-':
            result = (+left) - (+right);
            break;
        case '*':
            result = (+left) * (+right);
            break;
        case 'like':
            result = left.indexOf(right) > -1;
            break;
        case 'not like':
                result = left.indexOf(right) === -1;
                break;
        case '/':
            result = (+left) / (+right);
    }

    return result;
};
    
var divideDataByInterval = function(params){
    var val, groupBy;
    var intervalGroup = _.groupBy(params.data, function(item){
        val = item[params.property];
        //TODO: Clean this 
        switch(params.intervalType){
            case 'date':
                var dateVal = new Date(val);
                switch(params.interval){
                    case 'month':
                        groupBy = new Date(dateVal.getFullYear(), dateVal.getMonth(), 1);
                        break;
                    case 'quarter':
                        groupBy = new Date(dateVal.getFullYear(), Math.floor(dateVal.getMonth()/ 3) * 3, 1);
                        break;
                    case 'year':
                        groupBy = new Date(dateVal.getFullYear(), 0, 1);
                        break;
                    default :
                        var parsedInterval = parseTime(params.interval);
                        groupBy = Math.floor(+dateVal/ parsedInterval) * parsedInterval;
                }
                groupBy = +groupBy;
            break;
            case 'numeric':
            case 'currency':
                groupBy = Math.floor(+val/ +params.interval) * (+params.interval);
                break;
            default :
                groupBy = val;
        }
        return groupBy;
    });
    return intervalGroup;
};

/*** Graph data ****/
var Aggregator = {
    calc : function(left, operation, right, type){
        if(left === undefined) return right;
        if(right === undefined && operation !== 'exists') return left;

        if(type === 'numeric') right = +right;
        if(type === 'bool') right = right == 'true';

        
        var hasError = (numericOperations.indexOf(operation) > -1 && (isNaN(+left) || isNaN(+right)));
        var result;
        
        if(!hasError){
            result = utils.calc(left, operation, right);
        }

        if(hasError || isNaN(result)){
            if(numericOperations.indexOf(operation) > -1){
                throw 'Invalid arithmetic operation: <strong>( '  + left + ' ' + operation + ' ' + right + ' )</strong>';
            }
            else{
                throw "There seems to be issue with your data. Please check your Selections."
            }
        }
        return result;
    },
    applyOperations : function(boolValues){
        var result = boolValues[0].value;
        for (var i = 0; i <= boolValues.length-2; i++) {
            var boolValue = boolValues[i];
            var nextValue = boolValues[i+1];
            result = this.calc(result, nextValue.logic, nextValue.value);
        };
        return {
            value : result,
            logic : boolValues[0].logic
        };
    },
    hasProperty: function(name){
        return this.propertyTypes[name];
    },
    processSimple : function(obj, group){
        var complexValue, complexType;
        if(group.groupType === 'selection'){
            //perform arithmetic operation on selections
            complexValue = isNaN(+group.selectedProp) ? obj[group.selectedProp] : +group.selectedProp;
        }
        else{
            if(group.selection.isComplex){
                complexType = this.processGroup(obj, group.selection);
                complexValue = this.calc(complexType.value, group.operation, group.value, group.valType);
            }
            else{
                complexValue = this.calc(obj[group.selection.selectedProp], group.operation, group.value, group.valType);
            }
        }
        
        if(isNaN(+complexValue)){
            throw "Non numeric value detected: " + complexValue;
        }

        return {
            value : complexValue,
            logic : group.logic
        };
    },
    processGroups : function(obj, groups){
        var boolValues = [], boolValue;
        _.each(groups, function(group){
            boolValue = this.processGroup(obj,group);
            boolValues.push(boolValue);
        }.bind(this));

        var returnValue = this.applyOperations(boolValues);
        
        return returnValue;
    },
    processGroup : function(obj, group){
        var boolValue;
        if(group.isComplex){
            boolValue = this.processGroups(obj,group.groups);
        }
        else{
            boolValue = this.processSimple(obj, group);
        }
        return boolValue;
    },
    processDataGroups : function(groupedData, dataGroup, selection){
        var returnGroups = [];
        _.each(groupedData, function(dataItem, groupName){
            var ret = this.groupByInterval(dataItem, dataGroup, selection);
            returnGroups.push({
                key: groupName,
                values : ret
            });
        }.bind(this));
        return returnGroups;
    },
    groupByInterval : function(data, dataGroup, selection){
        var ret = [], yValue;
        if(selection.isComplex && selection.groupBy === 'count')
            throw "count not allowed for complex selections.";

        if(dataGroup.timeseries){
            var intervalGroup = divideDataByInterval({
                data: data,
                intervalType: dataGroup.xAxisType,
                interval: dataGroup.timeseriesInterval,
                property: dataGroup.xAxisProp
            });
            
            _.each(intervalGroup, function(gi, time){
                ret.push({
                    x:  +time, //fix numeric. This can be month/quarter etc, not just numeric
                    y:  this.reduceData(gi,selection)
                });
            }.bind(this));
        }
        else {
            _.each(data, function(item){
                yValue = this.processGroup(item,selection).value;

                if(item.hasOwnProperty(selection.selectedProp) || selection.isComplex) {
                    ret.push({
                        x: (dataGroup.xAxisType === 'date') ? +new Date(item[dataGroup.xAxisProp]) : item[dataGroup.xAxisProp],
                        y: yValue
                    });
                }
            }.bind(this));
        }
        return ret;
    },
    filterData : function(data, segment){
        var range = utils.getDateRange(segment.dataFilter);
        
        if(!data || !data.length || !segment.dataFilter) return data;
        if (!segment.group || segment.group.length === 0) return data;
        return data.filter(function(item, index){
            if(item.timestamp < range.min || item.timestamp > range.max) return false;
            return this.processGroups(item, segment.group).value;
        }.bind(this));
    },
    getGraphData: function(segmentModel, inputData){
        if(segmentModel.selection.length === 0)
            throw "Selections required";
        this.propertyTypes = segmentModel.propertyTypes;
        var returnData;
        switch (segmentModel.chartType){
            case 'line':
            case 'area':
            case 'scatter':
            case 'numeric':
                returnData = this.getLineCharData(segmentModel, inputData);
                break;
            case 'pie':
            case 'bar':
                returnData = this.getPieData(segmentModel, inputData);
                break;
        }
        //window.debug.chartdata = returnData;
        return returnData;
    },
    getLineCharData: function(segmentModel, inputData){
        var result = [];
        var groupCounter = 0;
        var groupedData;
        
        if(segmentModel.dataGroup.hasGrouping){
            groupedData = _.groupBy(inputData, function(item){return item[segmentModel.dataGroup.groupByProp]});
        }
        _.each(segmentModel.selection, function(sel){
           var values;
            if(segmentModel.dataGroup.hasGrouping){
                values = this.processDataGroups(groupedData, segmentModel.dataGroup, sel);
            }
            else{
                values = this.groupByInterval(inputData, segmentModel.dataGroup, sel);
            }
            //here sort the values by x
            if(segmentModel.dataGroup.xAxisType === 'currency' || segmentModel.dataGroup.xAxisType === 'numeric'){
                values.sort(function(x,y){
                    return x.x - y.x;
                });
            }
            result.push({
                key: sel.isComplex ? sel.aliasName || 'selection' : sel.selectedProp,
                values: values
            });
        }.bind(this));
        

        if(!segmentModel.dataGroup.hasGrouping){
            return [{
                key : 'xxx',
                values : result
            }]
        }
        else{
            return result;    
        }
        
    },
    reduceData : function(objArray, selection){
        //var isComplex = selection.groupType !== undefined;
        if(selection.isComplex && selection.groupBy === 'count')
            throw "Count Not allowed for complex selections.";

        var ret = _.reduce(objArray, function(memo, num){ 
            var numval;
            if(selection.isComplex){ //complex selection. so we need to process it.
                var temp = Aggregator.processGroup(num,selection);
                numval = temp.value;
            }
            else if(selection.groupBy === 'min'){
                return previous[selection.selectedProp] < current[selection.selectedProp] ? previous[selection.selectedProp] : current[selection.selectedProp];
            }
            else if(selection.groupBy === 'max'){
                return previous[selection.selectedProp] < current[selection.selectedProp] ? current[selection.selectedProp] : previous[selection.selectedProp];
            }
            else if(selection.groupBy === 'count'){
                numval = num[selection.selectedProp]? 1 : 0;
            }
            else if(selection.groupBy === 'sum' || selection.groupBy === 'avg'){ // sumby
                if(isNaN(+num[selection.selectedProp]))
                    throw 'Attempt to calculate <em>' +selection.groupBy+ '</em> of property: <strong>' + selection.selectedProp + '</strong> with non-numeric value "' + num[selection.selectedProp] + '" detected';
                numval = +num[selection.selectedProp] || 0;
            }
            else{
                throw 'For this visualization, you need Your selections should have <em>sum</em>,<em>count</em> or <em>avg</em>';
            }
            return memo + numval; 
        }, 0);

        return selection.groupBy === 'avg' ? ret/objArray.length : ret;
    },
    getPieData: function(segmentModel, inputData){
        var response = [];
        var groupCounter = 0;
        var result = [];
        var topLevelResponse = [];
        
        var formattingTypes = {
            date: function(name, interval){
                var timeFormat;
                switch(interval){
                    case 'month':
                        timeFormat = function(d){
                            return utils.fomat('{0} {1}', months[d.getMonth()], d.getFullYear());
                        } //d3.time.format('%b %Y');
                        break;
                    case 'quarter':
                        timeFormat = function(d){
                            return d.getFullYear() + ' Q ' + (Math.floor(d.getMonth() / 3) + 1);
                        }
                        break;
                    case 'year':
                        timeFormat = function(d){
                            return '' + d.getFullYear();
                        }
                        //d3.time.format('%Y');
                        break;
                    default:
                        timeFormat = function(d){
                            return utils.fomat('{0}.{1}.{2} {3}:{4}', d.getDate(), months[d.getMonth()], d.getFullYear(), d.getHours(), d.getMinutes());
                        }
                        // d3.time.format('%d.%b.%y %H:%M');
                }
                return timeFormat(new Date(+name));
            },
            numeric: function(name){
                name = +name;
                if(name <= 999) return name;
                if(name <=999999) return (name/1000).toFixed(2) + 'k';
                return (name/1000000).toFixed(2) + 'M';
            },
            string: function(name){
                return name;
            }
        };

        if(segmentModel.dataGroup.hasGrouping){
            var groupedData = divideDataByInterval({
                data: inputData,
                property: segmentModel.dataGroup.groupByProp,
                interval: segmentModel.dataGroup.groupByInterval,
                intervalType: segmentModel.dataGroup.groupByIntervalType
            });
            
            if(!segmentModel.dataGroup.hasDivideBy){
                response = [];
                _.each(segmentModel.selection, function(sel){
                    result = [];
                    _.each(groupedData, function(groupedDataItem, groupName){
                        var val = this.reduceData(groupedDataItem,sel);
                        groupName = formattingTypes[segmentModel.dataGroup.groupByIntervalType](groupName, segmentModel.dataGroup.groupByInterval);
                        
                        val >= 0 && result.push({
                            key: groupName,
                            value: val
                        });
                    }.bind(this));
                    
                    response.push({
                        key : sel.isComplex? sel.aliasName : sel.selectedProp|| 'Selection',
                        groupLevel: 'B',
                        values: result
                    });
                }.bind(this));

                topLevelResponse.push({
                    key : 'xxx',
                    groupLevel: 'A',
                    values: response
                });
            }
            else{
                topLevelResponse = [];
                _.each(segmentModel.selection, function(sel){
                    response = [];
                    _.each(groupedData, function(groupedDataItem, groupName){
                        var propCounts;
                        result = [];
                        if(sel.groupBy === 'value'){
                            throw "When using <em>GroupBy</em>, you should specify <em>sum</em>, <em>count</em> or <em>avg</em> on selection. Selecting value is not permitted";
                        }

                        if(sel.isComplex && sel.groupBy === 'count'){
                            throw '<em>Count</em> not allowed for Complex Selection : ' + sel.aliasName ;
                        }

                        var divData = divideDataByInterval({
                            data: groupedDataItem,
                            property: segmentModel.dataGroup.divideByProp,
                            interval: segmentModel.dataGroup.divideByInterval,
                            intervalType: segmentModel.dataGroup.divideByIntervalType
                        });

                        _.each(divData, function(value, name){
                            name = formattingTypes[segmentModel.dataGroup.divideByIntervalType](name, segmentModel.dataGroup.divideByInterval);
                            result.push({
                                key: name,
                                value: this.reduceData(value, sel)
                            });
                        }.bind(this));

                        response.push({
                            key : formattingTypes[segmentModel.dataGroup.groupByIntervalType](groupName, segmentModel.dataGroup.groupByInterval),
                            groupLevel: 'B',
                            values: result
                        });
                    }.bind(this));

                    topLevelResponse.push({
                        key : (sel.isComplex ? sel.aliasName : sel.selectedProp || 'selection') + '-' + sel.groupBy + ' -Group',
                        groupLevel : 'A',
                        values: response
                    });
                }.bind(this));
            }
        }
        else{
            var toplevelkey = 'xxxx';
            result = [];
            
            _.each(segmentModel.selection, function(sel){
                var val = this.reduceData(inputData, sel);
                result.push({
                    key: sel.isComplex? sel.aliasName : sel.selectedProp || 'selection',
                    value: val
                });
            }.bind(this));

            response.push({
                key : toplevelkey,
                groupLevel : 'B',
                values: result
            });

            topLevelResponse.push({
                key : toplevelkey,
                groupLevel : 'A',
                values: response
            });
        }
        return topLevelResponse;
    }
}
/*** End Graph data ****/
exports.aggregator = Aggregator;

