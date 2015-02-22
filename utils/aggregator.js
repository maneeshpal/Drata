
var _ = require('underscore');

var utils = require('./utils');

var numericOperations = ['>', '<', '<=', '>=', '+', '-', '*', '/'];
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/*copy from utils frontend*/
/*end copy from utils frontend*/
    
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
                    case 'week':
                        groupBy = utils.firstDayOfWeek(dateVal);
                        break;
                    default :
                        var parsedInterval = utils.parseTime(params.interval).ms;
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
var calc = function(left, operation, right, type){
    if(left === undefined) return right;
    if(right === undefined && operation !== 'exists') return left;

    if(type === 'numeric') right = +right;
    if(type === 'bool') right = right == 'true';

    
    var hasError = (numericOperations.indexOf(operation) > -1 && (isNaN(+left) || isNaN(+right)));
    var result;
    
    if(!hasError){
        result = utils.applyOperation(left, operation, right);
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
};
var applyOperations = function(boolValues){
        var result = boolValues[0].value;
        for (var i = 0; i <= boolValues.length-2; i++) {
            var boolValue = boolValues[i];
            var nextValue = boolValues[i+1];
            result = calc(result, nextValue.logic, nextValue.value);
        };
        return {
            value : result,
            logic : boolValues[0].logic
        };
    };
    
var processSimple = function(obj, group){
    var complexValue, complexType;
    if(group.groupType === 'selection'){
        //perform arithmetic operation on selections
        complexValue = isNaN(+group.selectedProp) ? obj[group.selectedProp] : +group.selectedProp;
    }
    else{
        if(group.selection.isComplex){
            complexType = processGroup(obj, group.selection);
            complexValue = calc(complexType.value, group.operation, group.value, group.valType);
        }
        else{
            complexValue = calc(obj[group.selection.selectedProp], group.operation, group.value, group.valType);
        }
    }
    
    if(isNaN(+complexValue)){
        throw "Non numeric value detected: " + complexValue;
    }

    return {
        value : complexValue,
        logic : group.logic
    };
};
    
var processGroups = function(obj, groups){
    var boolValues = [], boolValue;
    _.each(groups, function(group){
        boolValue = processGroup(obj,group);
        boolValues.push(boolValue);
    });
    return applyOperations(boolValues);
};

var processGroup = function(obj, group){
    var boolValue;
    if(group.isComplex){
        boolValue = processGroups(obj,group.groups);
    }
    else{
        boolValue = processSimple(obj, group);
    }
    return boolValue;
};
var processDataGroups = function(groupedData, dataGroup, selection){
    var returnGroups = [];
    _.each(groupedData, function(dataItem, groupName){
        var ret = groupByInterval(dataItem, dataGroup, selection);
        returnGroups.push({
            key: groupName,
            values : ret
        });
    });
    return returnGroups;
};

var filterGroupByConditions = function(data, groupByConditions, selection, propertyName){
    if(!groupByConditions) return data;

    var selectionKey = getSelectionKeyName(selection);
    //console.log('selection keyname: ',selectionKey);
    var groupByCondition = groupByConditions.filter(function(cond){
        return cond.selection.selectedProp === selectionKey;
    });
    
    if(!groupByCondition) {
        //console.log('no groupByCondition');
        return data;
    }
    var cloneCondition = utils.clone(groupByCondition);
    cloneCondition.forEach(function(c){
        c.selection.selectedProp = propertyName;
    });
    
    var fi = data.filter(function(item){
        return processGroups(item, cloneCondition).value;   
    });
    
    //console.log('filtered :', fi);
    return fi;
};

var groupByInterval = function(data, dataGroup, selection){
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
                y:  reduceData(gi,selection)
            });
        });
        //log this shit
        //console.log('original: ', ret);
        //console.log('selection: ', selection);
        return filterGroupByConditions(ret, dataGroup.groupByConditions, selection, 'y');
        //if trackchart, then real grouping happens if it is timeseries.
    }
    else {
        _.each(data, function(item){
            yValue = processGroup(item,selection).value;

            if(item.hasOwnProperty(selection.selectedProp) || selection.isComplex) {
                ret.push({
                    x: (dataGroup.xAxisType === 'date') ? +new Date(item[dataGroup.xAxisProp]) : item[dataGroup.xAxisProp],
                    y: yValue
                });
            }
        });
    }
    //here sort the values by x
    //if(dataGroup.xAxisType === 'currency' || dataGroup.xAxisType === 'numeric'){
        ret.sort(function(a, b){
            return a.x - b.x;
        });
    //}
    if(selection.perc){
        ret = utils.getPercentageChange(ret, 'y');
    }

    return ret;
};
var filterData = function(data, segment){
    var range = utils.getDateRange(segment.dataFilter);
    
    if(!data || !data.length || !segment.dataFilter) return data;
    if (!segment.group || segment.group.length === 0) return data;
    return data.filter(function(item) {
        if(item.timestamp < range.min || item.timestamp > range.max) return false;
        return processGroups(item, segment.group).value;
    });
};

var getGraphData = function(segmentModel, inputData){
    if(segmentModel.selection.length === 0)
        throw "Selections required";
    //this.propertyTypes = segmentModel.propertyTypes;
    var returnData;
    switch (segmentModel.chartType){
        case 'line':
        case 'area':
        case 'scatter':
        case 'numeric':
            returnData = getTrackCharData(segmentModel, inputData);
            break;
        case 'pie':
        case 'bar':
            returnData = getComparisonChartData(segmentModel, inputData);
            break;
    }
    return returnData;
};

var getTrackCharData = function(segmentModel, inputData){
    var result = [];
    var groupCounter = 0;
    var groupedData;
    if(segmentModel.dataGroup.hasGrouping){
        groupedData = _.groupBy(inputData, function(item){return item[segmentModel.dataGroup.groupByProp]});
    }
    //console.log('data length: '+ inputData.length);
    //console.log('first item in data:' + JSON.stringify(inputData[0], null, '\t'));
    _.each(segmentModel.selection, function(sel) {
       var values;
        if(segmentModel.dataGroup.hasGrouping){
            values = processDataGroups(groupedData, segmentModel.dataGroup, sel);
        }
        else {
            values = groupByInterval(inputData, segmentModel.dataGroup, sel);
        }
        values.length > 0 && result.push({
            key: getSelectionKeyName(sel),
            values: values
        });
    });
    
    if(!segmentModel.dataGroup.hasGrouping){
        return [{
            key : 'xxx',
            values : result
        }]
    }
    else{
        return result;    
    }
    
};
var reduceData = function(objArray, selection){
    //var isComplex = selection.groupType !== undefined;
    if(selection.isComplex && selection.groupBy === 'count')
        throw new Error("Count Not allowed for complex selections");

    var ret = _.reduce(objArray, function(previous, current){ 
        var numval;
        if(selection.isComplex){ //complex selection. so we need to process it.
            var temp = processGroup(current,selection);
            numval = temp.value;
        }
        else if(selection.groupBy === 'min'){
            return previous < current[selection.selectedProp] ? previous : current[selection.selectedProp];
        }
        else if(selection.groupBy === 'max'){
            return previous < current[selection.selectedProp] ? current[selection.selectedProp] : previous;
        }
        else if(selection.groupBy === 'count'){
            numval = current[selection.selectedProp]? 1 : 0;
        }
        else if(selection.groupBy === 'sum' || selection.groupBy === 'avg'){ // sumby
            if(isNaN(+current[selection.selectedProp]))
                throw new Error('Attempt to calculate <em>' +selection.groupBy+ '</em> of property: <strong>' + selection.selectedProp + '</strong> with non-numeric value "' + current[selection.selectedProp] + '" detected');
            numval = +current[selection.selectedProp] || 0;
        }
        else{
            throw new Error('For this visualization, you need Your selections should have <em>sum</em>,<em>count</em> or <em>avg</em>');
        }
        return previous + numval; 
    }, (!selection.isComplex && objArray.length > 0 && (selection.groupBy === 'min' || selection.groupBy === 'max'))? +objArray[0][selection.selectedProp] : 0);

    return selection.groupBy === 'avg' ? ret/objArray.length : ret;
};

var getSelectionKeyName = function(sel){
    return utils.format('{0}{1}_{2}', sel.perc ? '%_' : '', sel.groupBy, sel.isComplex ? sel.aliasName : sel.selectedProp);
};

var formattingTypes = {
    date: function(name, interval){
        var timeFormat;
        switch(interval){
            case 'month':
                timeFormat = function(d){
                    return utils.format('{0} {1}', months[d.getMonth()], d.getFullYear());
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
                    return utils.format('{0}.{1}.{2} {3}:{4}', d.getDate(), months[d.getMonth()], d.getFullYear(), d.getHours(), d.getMinutes());
                }
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
    },
    bool: function(name){
        return name;
    }
};

var getComparisonChartData = function(segmentModel, inputData){
    var response = [];
    var groupCounter = 0;
    var result = [];
    var topLevelResponse = [];
    
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
                    var val = reduceData(groupedDataItem,sel);
                    groupName = formattingTypes[segmentModel.dataGroup.groupByIntervalType](groupName, segmentModel.dataGroup.groupByInterval);
                    
                    //val >= 0 && 
                    result.push({
                        key: groupName,
                        value: val
                    });
                });
                
                result = filterGroupByConditions(result, segmentModel.dataGroup.groupByConditions, sel, 'value');
                
                if(result.length > 0) {
                    if(sel.perc){
                       result = utils.getPercentageChange(result, 'value');
                    }

                    response.push({
                        key : getSelectionKeyName(sel),
                        groupLevel: 'B',
                        values: result
                    });
                }
            });

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
                            value: reduceData(value, sel)
                        });
                    });

                    result = filterGroupByConditions(result, segmentModel.dataGroup.groupByConditions, sel, 'value');
                    if(result.length > 0){
                        if(sel.perc) {
                            result = utils.getPercentageChange(result, 'value');
                        }
                        
                        response.push({
                            key : formattingTypes[segmentModel.dataGroup.groupByIntervalType](groupName, segmentModel.dataGroup.groupByInterval),
                            groupLevel: 'B',
                            values: result
                        });
                    }
                });

                topLevelResponse.push({
                    key : getSelectionKeyName(sel),
                    groupLevel : 'A',
                    values: response
                });
            });
        }
    }
    else{
        var toplevelkey = 'xxxx';
        result = [];
        
        _.each(segmentModel.selection, function(sel){
            var val = reduceData(inputData, sel);
            result.push({
                key: getSelectionKeyName(sel),
                value: val
            });
            if(sel.perc){
                result = utils.getPercentageChange(result, 'value');
            }
        });

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
/*** End Graph data ****/
exports.getGraphData = getGraphData;
exports.reduceData = reduceData;
exports.processSimple = processSimple;
exports.processGroup = processGroup;
