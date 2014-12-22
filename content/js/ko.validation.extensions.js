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
                // if(!options._required())
                //     return true;
                if(!val)
                    return true;
                
                if(options.intervalType && options.intervalType() === 'date' && ['month', 'year', 'quarter'].indexOf(val) > -1){
                    return true;
                }
                return !!drata.utils.parseTime(val).ms;
                //return !isNaN(+val) && +val > 0;
            },
            message : 'Invalid Interval'
        };
        
    ko.validation.configure({
        registerExtenders: true,
        decorateElement: true,
        decorateInputElement: true,
        errorElementClass: 'error',
        errorClass:'error'
    });
    })(ko, this);
