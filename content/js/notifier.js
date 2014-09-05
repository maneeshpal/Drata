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

        //helper methods
        self.notifyWidgetAdded = function(options){
            self.addNotification({
                title: 'widget added',
                message: 'A new widget has been added. Please update your view.',
                type: 'info',
                onConfirm: options.onConfirm,
                removeOnConfirm: true
            });
        };

        self.notifyWidgetUpdated = function(options){
            self.addNotification({
                title: 'widget updated',
                message: 'widget: <strong> <em>' + options.name  + '</em></strong> has been updated. Please update your view.',
                type: 'info',
                onConfirm: options.onConfirm,
                removeOnConfirm: true
            });
        };

        self.notifyWidgetRemoved = function(options){
            self.addNotification({
                title: 'widget removed',
                message: 'widget: <strong> <em>' + options.name  + '</em></strong> has been removed. None of your changes to that widget will be saved.',
                type: 'info',
                confirmText: 'remove',
                onConfirm: options.onConfirm,
                removeOnConfirm: true
            });
        };
    };

    var Notification = function(options){
        var self = this;
        self.title = options.title;
        self.message = options.message;
        self.confirmText = options.confirmText || 'confirm';
        self.onConfirm = options.onConfirm;
        self.removeOnConfirm = options.removeOnConfirm;

        self.getClass = function(){
            return options.type;
        }
    };

    drata.ns('nsx').extend({
        notifier : new Notifier()
    });
})(this);