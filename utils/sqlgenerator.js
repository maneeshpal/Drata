
var utils = require('../utils/utils');

function conditionExpression(condition) {
    var val;
    if(condition.isComplex) {
        return conditionsExpression(condition.groups);
    }
    else {
        if (condition.operation === 'exists') {
            val = '';
        }
        else if (condition.valType === 'bool') {
            val = condition.value === 'true' ? 1 : 0;
        }
        else if (condition.valType === 'numeric') {
            val  = condition.value;
        }
        else if (condition.valType === 'date'){
            val = utils.format('\'{0}\'', new Date(condition.value).toISOString());
        }
        else {
            val = utils.format('\'{0}\'', condition.value || '');
        }
        return utils.format('{0} {1} {2}', selectionExpression(condition.selection), utils.symbolMap[condition.operation].sql, val);
    }
};

function conditionsExpression(conditions) {
    var expression = '';
    conditions.forEach(function(gr,index){
        expression = expression + ((index === 0)? conditionExpression(gr) : utils.format(' {0} {1}', gr.logic, conditionExpression(gr)));
    });
    return !expression ? '' : utils.format('({0})', expression);
};

function selectionExpression(selection) {
    var expression = '';
    if(!selection.isComplex) {
        return selection.selectedProp ? selection.selectedProp : '__';
    }
    else {
        return selectionsExpression(selection.groups);
    }    
};

function selectionsExpression(selections, isTopLevel){
    var expression='';
    if(isTopLevel) {
        var expressions = [];
        _.each(selections, function(gr,index) {
            expression = selectionExpression(gr);
            if(gr.groupBy !== 'value'){
                expression = utils.format('{0}({1})', gr.groupBy, expression);
            }
            expressions.push(expression);
        });
        return expressions.join(', ');
    }
    else {
        selections.forEach(function(gr,index) {
            expression = expression + ((index === 0)? selectionExpression(gr) : utils.format(' {0} {1}', gr.logic, selectionExpression(gr)));
        });
        return utils.format('({0})', expression);
    }
};

exports.getSqlQuery = function(dbname, tableName, segment){

    var selectionProperties = utils.getSelectionProperties(segment);
    var condition = conditionsExpression(segment.group);
    
    var returnQuery = utils.format('select {0} from {1}', selectionProperties.join(','), tableName);
    
    if(segment.dataFilter && segment.dataFilter.dateProp) {
        if(segment.dataFilter.from && segment.dataFilter.to) {
            returnQuery = utils.format('{0} where {1} between \'{2}\' and \'{3}\'', returnQuery, segment.dataFilter.dateProp, utils.getDateFromTimeframe(segment.dataFilter.from).toISOString(), utils.getDateFromTimeframe(segment.dataFilter.to).toISOString());
        }
        else if(segment.dataFilter.from && !segment.dataFilter.to) {
            returnQuery = utils.format('{0} where {1} > \'{2}\'', returnQuery, segment.dataFilter.dateProp, utils.getDateFromTimeframe(segment.dataFilter.from).toISOString());
        }
        else if(!segment.dataFilter.from && segment.dataFilter.to) {
            returnQuery = utils.format('{0} where {1} < \'{2}\'', returnQuery, segment.dataFilter.dateProp, utils.getDateFromTimeframe(segment.dataFilter.to).toISOString());
        }
    }
    
    var dataFilterExists = segment.dataFilter && segment.dataFilter.dateProp && (segment.dataFilter.from || segment.dataFilter.to);
    
    if(condition.trim()) {
        returnQuery = utils.format('{0} {1} {2}',returnQuery, (dataFilterExists ? 'and' : 'where'), condition);
    }
    //console.log(returnQuery);
    return returnQuery;
};
