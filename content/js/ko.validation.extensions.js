    ;(function(ko, root){ 
        ko.validation.rules['validDataFilterDate'] = {
            validator: function (val, options) {
                if(!val)
                    return true;
                var formattedDate = drata.utils.getValidDate(val, true);
                if(!formattedDate || (formattedDate.setHours(0,0,0,0) > new Date().setHours(0,0,0,0)))
                    return false;
                return true;
            },
            message: 'Invalid Date'
        };
        
        ko.validation.rules['groupingInterval'] = {
            validator: function (val, options) {
                if(!val)
                    return true;

                if(options.onlyIf2 && typeof options.onlyIf2 === 'function' && !options.onlyIf2() ) {
                    return true;
                }
                
                if(options.intervalType() === 'date'){
                    if(['month', 'year', 'quarter', 'week'].indexOf(val) > -1){
                        return true;
                    }
                    return !!drata.utils.parseTime(val).ms;

                } 
                else if(options.intervalType() === 'numeric') {
                    return !isNaN(+val) && +val > 0;    
                }
                else {
                    return false;
                }
                
            },
            message : 'Invalid Interval'
        };

        ko.validation.rules['dynamicInterval'] = {
            validator: function (val, options) {
                if(!val) {
                    return true;
                }
                
                if(options.onlyIf && typeof options.onlyIf === 'function' && !options.onlyIf() ) {
                    return true;
                }

                return !!drata.utils.parseTime(val).ms;
            },
            message : 'Invalid Interval'
        };


        ko.validation.rules['numeric'] = {
            validator: function (val, options) {
                if(!val) {
                    return true;
                }
                return !isNaN(+val);
            },
            message : 'Invalid Number'
        };
        
    ko.validation.configure({
        registerExtenders: true,
        decorateElement: true,
        decorateInputElement: true,
        errorElementClass: 'error',
        errorClass:'error'
    });
    })(ko, this);
