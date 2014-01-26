
var tempData = {
    randomData = function(num, numdata){
        num = num || 1;
        numdata  = numdata || 10;
        var data= [];
        for(var i =1;i<=num;i++){
            var d = [];
            var y = 0;
            for(var j = 0; j < numdata; j++){
                y += (Math.random() * 10 - 5);
                d.push({
                  x: j,
                  y: y
                });
            }
            data.push({
                values:plotvalues,
                key:'key'+i});
        };
        return data;
    }
}
