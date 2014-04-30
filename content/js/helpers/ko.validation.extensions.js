    ;(function(ko, root){ 
        ko.validation.rules['validDataFilterDate'] = {
            validator: function (val, options) {
                if(!val)
                    return false;
                var formattedDate = drata.utils.getValidDate(val, true);
                if(!formattedDate || (formattedDate.setHours(0,0,0,0) > new Date().setHours(0,0,0,0)))
                    return false;
                return true;
            }
        };
        
    ko.validation.configure({
        registerExtenders: true,
        decorateElement: true,
        decorateInputElement: true,
        errorElementClass: 'error',
        errorClass:'error'
    });
    })(ko, this);
