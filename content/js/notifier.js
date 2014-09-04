; (function(root) {

    var Notifier = function(){
        var self = this;
        var _notifications = ko.observableArray();

        self.notifications = ko.computed({
            read: function(){
                var a = _notifications().slice(0);
                return a.reverse();
            },
            write: function(){
                throw "You cannot add notifications directly. call addNotification()";
            }
        });

        self.addNotification = function(options){
            if(_notifications().length > 4) _notifications.shift(); 
            _notifications.push(new Notification(options));
        };

        self.removeNotification = function(notification){
            _notifications.remove(notification);
        };

        self.notifRendered = function(elem){
            if (elem.nodeType === 1) $(elem).hide().slideDown();
        };
        self.befor = function(elem){
            if (elem.nodeType === 1) $(elem).slideUp(function() { $(elem).remove()});
        };
    };

    var Notification = function(options){
        var self = this;
        self.title = options.title;
        self.message = options.message;
        self.confirmText = options.confirmText || 'confirm';
        self.onConfirm = function(){
            options.onConfirm && options.onConfirm();
        };
        //self.type = options.type;
        self.removeOnConfirm = options.removeOnConfirm;
        self.getClass= function(){
            return options.type;
        }
    };

    drata.ns('nsx').extend({
        notifier : new Notifier()
    });
})(this);