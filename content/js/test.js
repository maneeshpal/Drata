var data = [];
data.push({
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 30
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 40
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 70
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 80
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 20
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 25
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 27
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 60
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 65
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 90
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 97
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'bbb',
                    timestamp : 91
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 41
                }
            },{
                key : 'homepage',
                val : {
                    selectedCategory : 'aaa',
                    timestamp : 45
                }
            });

var groupeddata = _.groupBy(data, function(item){
    return item.val.selectedCategory;
});

var returnData = [];
var returnDatum = [];
_.each(groupeddata, function(groupedItem, groupKey){
    returnDatum = [];
    var intervalCounts = _.countBy(groupedItem,function(item){
        return Math.floor(+item.val.timestamp/10) * 10;
    });

    _.each(intervalCounts, function(item, key){
        returnDatum.push({x : key, y: item});
    });

    returnData.push({name: groupKey, values : returnDatum});
});


console.log(returnData);