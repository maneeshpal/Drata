

(function($){
    var tracker = function(combination, callback){
        var s,n, counter = [], log = false;
        $(document).keydown(function(e){ 
            log && console.log('key code ' + e.which);
            if(combination.indexOf(e.keyCode) > -1 && counter.indexOf(e.keyCode) === -1){
                if(!s) {
                    s = +new Date();
                    counter = [];
                    counter.push(e.keyCode);
                    log && console.log('first')
                }
                else{
                    n = +new Date();
                    if(n - s < 500){
                        counter.push(e.keyCode);
                        s = +new Date();
                        log && console.log('listening');
                    }
                    else{
                        log && console.log('too late');
                        counter = [];
                        counter.push(e.keyCode);
                        s = +new Date();
                        log && console.log('first');
                    }
                    if(counter.length === combination.length){
                        counter = [];
                        s = undefined;
                        callback && callback();
                    }
                }
            }
            else{
                log && console.log('lost ' , counter.join(','));
                counter = [];
                s = undefined;
                
            }
        });
    };

    tracker([91,16,39], function(){
        $('body').addClass('campfire');
    });
    tracker([91,16,37], function(){
        $('body').removeClass('campfire');
    });
})(jQuery);