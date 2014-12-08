

window.pr = function(msg){
    var d = $.Deferred();
    setTimeout(function(){
    	if(msg % 5 === 0){
            console.log('internal resolved');
    		d.resolve('internal resolved');
    	}
    	else{
            console.log('internal rejected');
    		d.reject('internal rejected');
    	}
    }, 1000);
    return d.promise();
}


var step1 = function(x){
    var d = $.Deferred();
    setTimeout(function(){
        if(x < 10){
            console.log('step1 resolved');
            d.resolve(x);
        }
        else{
            console.log('step1 rejected');
            d.reject('step1 rejected');
        }
    }, 100);
    return d.promise();
}

var step2 = function(x){
    var d = $.Deferred();
    setTimeout(function(){
        if(x > 4){
            console.log('step2 resolved');
            d.resolve(x);
        }
        else{
            console.log('step2 rejected');
            d.reject('step2 rejected');
        }
    }, 100);
    return d.promise();
}

var step3 = function(x){
    var d = $.Deferred();
    setTimeout(function(){
        if(x < 8){
            console.log('step3 resolved');
            d.resolve(x);
        }
        else{
            console.log('step3 rejected');
            d.reject('step3 rejected');
        }
    }, 100);
    return d.promise();
}

window.cascadingpr =function(x){
    var promise = step1(x).then(function(y){
        return step2(y).then(function(z){
            return step3(z);
        });
    });

    return promise;
};

window.realshit = function(x){
    var step1pr = step1(x);

    var step2pr = step1pr.then(function(y){
        var d = $.Deferred();
        setTimeout(function(){
            if(y % 2 === 0){
                console.log('step2 resolved');
                d.resolve(y);
            }
            else{
                console.log('step2 rejected');
                d.reject('step2 rejected');
            }
        }, 100);
        return d.promise();
    }, function(err){
        console.log('external rejected');
    });
    return step2pr;
}


window.realshit2 = function(x){
    var step1pr = step1(x);

    var step2pr = step1pr.then(function(y){
        var d = $.Deferred();
        setTimeout(function(){
            if(y % 2 === 0){
                console.log('step2 resolved');
                d.resolve(y);
            }
            else{
                console.log('step2 rejected');
                d.reject('step2 rejected');
            }
        }, 100);
        return d.promise();
    });
    return step2pr;
}

window.externalPr = function(msg){
    var d = $.Deferred();
    var promise = pr(msg);
    promise.then(function(val){
        if(msg % 2 === 0){
            console.log('external resolved');
            d.resolve('external resolved');  
        }
        else{
            console.log('external rejected');
            d.reject('external rejected');  
        }
    }, function(err){
        console.log('external rejected coz internal rejected');
        d.reject('external rejected coz internal rejected');
    });
    return d.promise();
}

window.randasync = function(){
    var d = $.Deferred(), to = Math.floor(Math.random() * 1000);
    setTimeout(function(){
        d.resolve(to);
    }, to);
    return d.promise();
}

var promisearr  = [];
for(var i = 1; i< 2; i++){
    promisearr.push(randasync());
}
$.when.apply($, promisearr).then(function(re){
    console.log(arguments);
    console.log(re);
});

