(function(root){
    var tempData = {
        randomData : function(numgraphs, minnumdata, maxnumdata, miny){
            numgraphs = numgraphs || 1;
            miny = miny || 0;
            minnumdata  = minnumdata || 1;
            maxnumdata  = maxnumdata || 1;
            var data= [];
            for(var i = 1;i<=numgraphs;i++){
                var d = [];
                var y = miny;
                for(var j = minnumdata; j <= maxnumdata; j++){
                    y += (Math.random() * 10 - j%10);
                    d.push({
                      key: j,
                      value: +y.toFixed(0)
                    });
                }
                data.push({
                    values:d,
                    key:'key '+i});
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
        },
        radomPieData: function(n, d){
            var returnData = [];
            for(var i = 0; i < n; i++){
                var dataitem = [];
                for(var j = 0; j < d; j++){
                    dataitem.push({
                        key: 'key-' + i + '.' + j,
                        value: Math.floor(Math.random() * 100)+20
                    });
                }   
                returnData.push({
                    key: 'key-' + i,
                    values: dataitem
                });
            }
            return returnData;
        },
        _randomProps : undefined,
        randomProps: function(maxProps){
            if(this._randomProps) return this._randomProps;
            maxProps  = maxProps || 10;
            var data= [];
            var y = [0,0,0,0,0,0,0];
            var ordernumber = 1;
            var geos = ['texas', 'Alabama', 'Misissipi', 'Arizona', 'Minnesota'];
            var items = ['jeans', 'T Shirt', 'Under wear', 'Skirt', 'Pajama', 'Dress Shirt', 'Scarf', 'Women\'s Jacket'];
            var colors = ['blue', 'gray', 'black', 'white', 'purple'];
            var ageGroups = ['adult', 'baby', 'teen', 'Senior Citizen', 'Mid 40\'s'];
            var startDate = new Date();
            for(var j = 0; j <= maxProps; j++){
                for(var yy = 0; yy < y.length; yy++){
                    y[yy] += Math.floor((Math.random() * 10 - j%10));
                }
                //y += (Math.random() * 10 - j%10);
                ordernumber = 10 + (Math.floor(j/ 3) * (3)); // 3 items per order
                data.push({
                    //ordernumber : ordernumber,
                    //item : items[Math.floor(Math.random() * items.length)],
                    price : Math.abs(y[0]) * 100,
                    geography : geos[Math.floor(Math.random() * geos.length)],
                    timestamp : startDate.setHours(startDate.getHours() + j),
                    //timestamp : j * 100,
                    sex : Math.random() * 10 > 5 ? 'female': 'male',
                    //itemsex :  Math.random() * 10 > 6 ? 'female': 'male',
                    //hasCoupon :  Math.random() * 10 > 7,
                    //discount: Math.abs(Math.floor(y[1])),
                    color : colors[Math.abs(Math.floor(y[1]%5))],
                    errorCount: Math.abs(Math.floor(y[2]% 10)),
                    //pageLoadTime : Math.abs(Math.floor(y[3])) * 500,
                    tax : Math.abs(y[0]) * 8,
                    shippingPrice: Math.abs(y[0]) * 12,
                    //itemAgeGroup : ageGroups[Math.abs(y[4] %5)],
                    //totalItems : Math.floor(Math.abs(y[5]) % 10)
                });
            }
            
            this._randomProps = data;
            return this._randomProps;
        }
    };
    root.drata.ns('utils').extend({
        tempdata : tempData
    });
})(this);
