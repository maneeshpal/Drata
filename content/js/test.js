

window.pr = function(msg){
    var d = $.Deferred();
    setTimeout(function(){
        msg ? d.resolve('resolved'): d.reject('failed');
    }, 3000);
    return d.promise();
}
var promisearr  = [];
for(var i = 1; i< 5; i++){
    promisearr.push(pr(i));
}
$.when.apply($, promisearr).then(function(re){
    console.log(arguments);
});