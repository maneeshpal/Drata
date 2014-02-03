
var tempData = {
    randomData : function(numgraphs, minnumdata, maxnumdata){
        numgraphs = numgraphs || 1;

        minnumdata  = minnumdata || 1;
        maxnumdata  = maxnumdata || 1;
        var data= [];
        for(var i = 1;i<=numgraphs;i++){
            var d = [];
            var y = 0;
            for(var j = minnumdata; j <= maxnumdata; j++){
                y += (Math.random() * 10 - 5);
                d.push({
                  x: j,
                  y: +y.toFixed(0)
                });
            }
            data.push({
                values:d,
                key:'key'+i});
        };
        return data;
    },
    randomxy : function(num, xLast, yLast){
        var values = [];
        for(var i = 0; i < num; i++){
            values.push({
                x: i,
                y: yLast + (Math.random() * 10 - 5)
            });
        }
        return values;
    }
}
