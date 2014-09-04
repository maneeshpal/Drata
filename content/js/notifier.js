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
            var notif = new Notification(options);
            _notifications.push(notif);
            if(options.displayTimeout > 0){
                setTimeout(self.removeNotification.bind(self,notif), options.displayTimeout);
            }
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
        self.onConfirm = options.onConfirm;
        self.removeOnConfirm = options.removeOnConfirm;

        self.getClass= function(){
            return options.type;
        }
    };

    drata.ns('nsx').extend({
        notifier : new Notifier()
    });
})(this);