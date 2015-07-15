(function(root){
    var WidgetEditor = function(){
        var self = this;
        self.addUpdateBtnText = ko.observable('Save');
        self.processSegment = true;
        self.dataKeys = ko.observableArray();
        
        self.selectedDataKey = ko.observable();
        self.dataSource = ko.observable();
        self.dataSourceNames = ko.observableArray();
        self.databaseNames = ko.observableArray();
        self.database = ko.observable();
        self.previewWidget = ko.observable();
        self.segment = new Segmentor();
        self.showTabular = ko.observable();

        self.tabularModel = ko.observable();

        var cloneModel = {}, previewWidgetLoadedToken;
        
        self.name = ko.observable();
        
        var clearTabular = function() {
            drata.pubsub.unsubscribe(previewWidgetLoadedToken);
            self.tabularModel(undefined);
        }

        var setPreviewWidgetLoadedToken = function() {
            previewWidgetLoadedToken = drata.pubsub.subscribe('previewWidgetLoaded', function(eventName, model) {
                self.tabularModel(model && {
                    segment: model.segment,
                    data: model.data
                })
            });
        }

        self.dataSource.subscribe(function(newValue){
            if(!newValue){
                self.databaseNames([]);
                self.database(undefined);
            }
            else{
                if(cloneModel.dataSource !== newValue ){
                    cloneModel.dataSource = newValue;
                    cloneModel.database = undefined;
                }
                drata.apiClient.getDatabaseNames(newValue).then(function(resp){
                    self.databaseNames(resp);
                    self.database(cloneModel.database);
                });
            }
        });

        self.database.subscribe(function(newValue){
            if(!newValue || !self.dataSource()){
                self.dataKeys([]);
                self.selectedDataKey(undefined);
            }
            else{
                if(cloneModel.database !== newValue ){
                    cloneModel.database = newValue;
                    cloneModel.selectedDataKey = undefined;
                }
                drata.apiClient.getDataKeys({dataSource: self.dataSource(),database: newValue}).then(function(resp){
                    self.dataKeys(resp);
                    self.selectedDataKey(cloneModel.selectedDataKey);
                });
            }
        });

        self.selectedDataKey.subscribe(function(newValue){
            if(!newValue || !self.dataSource() || !self.database()){
                drata.dashboard.propertyManager.resetProperties();
            }
            else {
                if(cloneModel.selectedDataKey !== newValue){
                    cloneModel.segmentModel = undefined;
                    cloneModel.selectedDataKey = newValue;
                }
                drata.apiClient.getUniqueProperties({dataSource: self.dataSource(), database: self.database(), collectionName: newValue}).then(function(response){
                    drata.dashboard.propertyManager.setPropertyTypes(response);
                    self.segment.initialize(cloneModel.segmentModel);
                });
            }
        });

        drata.apiClient.getDataSourceNames().then(function(resp){
            self.dataSourceNames(resp);
        });

        var validateWidgetEditor = function () {
            var errors = ko.validation.group(self, {deep:false});
            if(errors().length > 0){
                errors.showAllMessages();
            }

            drata.pubsub.publish('formErrors', {
                keepExistingErrors: true,
                errors: errors()
            });
            return errors().length === 0;
        }

        self.notifyWidget = function () {
            if(!validateWidgetEditor()) return;
            cloneModel.segmentModel = self.segment.getModel();
            
            if(!cloneModel.segmentModel)
                return;
            cloneModel.dataSource = self.dataSource();
            cloneModel.database = self.database();
            cloneModel.selectedDataKey  = self.selectedDataKey();
            //placing sizex,name, sizey here doest set those in clone
            //model for some reason
            var previewW = self.previewWidget();
            if(previewW){
                var x = previewW.getModel();
                if(x.contentModel){
                    cloneModel.contentModel = x.contentModel;
                }
                previewW.clearTimeouts();
            }
            var isNew = !cloneModel._id;

            //im just setting them here.
            cloneModel.name = self.name() || 'New widget';

            if(isNew) {
                cloneModel.sizex = '4';
                cloneModel.sizey = '2';
                drata.pubsub.publish('widgetcreate', cloneModel);
            }
            else {
                drata.pubsub.publish('widgetupdate', cloneModel);   
            }

            //no point of closing widget, when there is no dashboard
            //loaded on page.
            if(drata.cPanel.currentDashboard()) {
                cloneModel = {};
                self.onWidgetUpdate = undefined;
                self.onWidgetCancel = undefined;
                self.addUpdateBtnText('Save');
                self.dataSource(undefined);
                self.name(undefined);
                self.previewWidget(undefined);
                location.hash = '';
            }
        };

        self.attach = function (event,options) {
            self.dataSource(undefined);
            clearTabular();
            cloneModel = drata.utils.clone(options.widgetModel);
            self.dataSource(cloneModel.dataSource);
            self.name(cloneModel.name);
            self.addUpdateBtnText('Update');

            setPreviewWidgetLoadedToken();
            self.previewWidget(new drata.dashboard.widget(cloneModel, 100, true));
        };

        self.widgetCancel = function() {
            self.onWidgetUpdate = undefined;
            self.onWidgetCancel = undefined;
            self.addUpdateBtnText('Add Widget');

            self.dataSource(undefined);
            location.hash = '';
            var w = self.previewWidget();
            if(w) w.clearTimeouts();
            self.previewWidget(undefined);
            cloneModel = {};
            clearTabular();
        };

        self.preview = function() {
            if(!validateWidgetEditor()) return;
            var model = self.segment.getModel();
            if(!model) return;

            setPreviewWidgetLoadedToken();
            
            self.previewWidget(new drata.dashboard.widget({
                name: self.name(),
                dataSource: self.dataSource(),
                database: self.database(),
                segmentModel: model,
                selectedDataKey: self.selectedDataKey()
            }, 100, true));
        };
        
        //this is for widget preview. since, its parent is widgeteditor, we need
        //this method here.
        self.loadWidget = function(elem,widget){
            widget && widget.loadWidget();
            $(document).foundation();
        };

        drata.pubsub.subscribe('widgetedit', self.attach);
        self.dataSource.extend({
            required: { 
                message : 'Select a DataSource'
            }
        });

        self.database.extend({
            required: { 
                message : 'Select Database',
                onlyIf : function(){
                    return self.dataSource.isValid();
                }
            }
        });

        self.selectedDataKey.extend({
            required: { 
                message : 'Select Collection Name',
                onlyIf : function(){
                    return self.dataSource.isValid() && self.database.isValid();
                }
            }
        });
    };
    root.drata.ns('dashboard').extend({
        widgetEditor: new WidgetEditor()
    });
})(this);
