"use strict";

var DashboardManager = function(){
    this.dashboards = ko.observableArray();
    
    this.chosenTags = ko.observableArray();

    this.dashboardHolder = ko.observable();

    this.addingDashboard = ko.observable(false);
    
    this.closeDashboardManager = function(){
        $('#dashboardManager').removeClass('showme');
    };

    this.showAddDashboard = function(){
        var di = new DashboardItem({}, {isNew:true});
        this.dashboardHolder(di);
        this.addingDashboard(true);
    };
    
    this.cloneDashboard = function(dashboardItem){
        dashboardItem.isNew = true;
        dashboardItem.toggleExtendedDetails(false);
        dashboardItem.chosenWidgets(dashboardItem.widgetList());
        this.dashboardHolder(dashboardItem);
        this.addingDashboard(true);
    };

    this.closePopup = function(){
        var di = this.dashboardHolder();
        di.isNew = false;
        di.chosenWidgets([]);
        this.addingDashboard(false);
    };

    this.filteredDashboards = ko.computed(function(){
        var chosenTags = this.chosenTags();
        var tags = [];
        var includeUntagged = chosenTags.indexOf('untagged') > -1;
        if(chosenTags.length === 0) return this.dashboards();
        return this.dashboards().filter(function(d){
            tags = d.tagList().map(function(i){return i.tagName});
            return (tags.length === 0 && includeUntagged) || _.intersection(tags, chosenTags).length > 0;
        });
    }, this).extend({ rateLimit: 500 });

    this.deleteDashboard = function(dashboardItem){
        if(confirm("Deleting Dashboard will delete all the widgets and tags associated. Do you wish to Continue?")){
            drata.apiClient.deleteDashboard(dashboardItem._id,function(resp){
                this.dashboards.remove(dashboardItem);
            }.bind(this));

            drata.apiClient.deleteAllTagsDashboard(dashboardItem._id,function(resp){
                console.log('tags deleted');
            }.bind(this));

            drata.apiClient.deleteAllWidgetsDashboard(dashboardItem._id,function(resp){
                console.log('widgets deleted');
            }.bind(this));
        }
        
    };

    this.populateDashboards = function(){
        drata.apiClient.getAllDashboards(function(response){
            this.dashboards(ko.utils.arrayMap(
                response.result,
                function(model) {
                    return new DashboardItem(model, {bindWidgets: true, bindTags: true});
                }.bind(this)
            ));
        }.bind(this));
    };

    var selectAll = false;
    this.toggleAllTags = function(){
        selectAll = !selectAll;
        if(!selectAll){
            this.chosenTags([]);  
        }
        else{
            this.chosenTags(this.tagsList());   
        }
        return true;
    };

    this.tagsList = ko.computed(function(){
        var a = [];
        _.each(this.dashboards(),function(d){
            _.each(d.tagList(),function(t){
                a.indexOf(t.tagName) === -1 && a.push(t.tagName);
            });
        });
        return a;
    }, this);
    
    //this.populateDashboards();
};

var DashboardItem = function(model, options){
    options = options || {};
    model = model || {};
    this.name = ko.observable(model.name);
    this.cloneName = ko.observable();
    this.isNew = options.isNew;
    this._id = model._id;
    this.dateCreated = drata.utils.formatDate(new Date(model.dateCreated));
    this.dateUpdated = drata.utils.formatDate(new Date(model.dateUpdated));
    this.url = '/dashboard/' + this._id;
    this.widgetList = ko.observableArray();
    this.tagList = ko.observableArray();
    this.newTag = ko.observable();
    this.addingTag = ko.observable(false);
    this.addTag = function(){
        if(!this.newTag()) return;
        if(this.isNew){
            //since the dashboard does not have id, just save it.
            this.tagList.push({tagName: this.newTag()});
            this.newTag(undefined);
            this.addingTag(false);
            return;
        }
        var newTagModel = {
            tagName: this.newTag(), 
            dashboardId: this._id
        };
        drata.apiClient.addTag(newTagModel, function(resp){
            this.tagList.push(newTagModel);
            //allTags().indexOf(newTagModel.tagName) < 0 && allTags.push(newTagModel);
            this.newTag(undefined);
            this.addingTag(false);
        }.bind(this));
    }.bind(this);

    this.upsertDashboard = function(){
        var dashboardModel = {
            name: this.cloneName()
        };

        if(!this.isNew){
            dashboardModel._id = this._id;
        }

        drata.apiClient.upsertDashboard(dashboardModel, function(response){
            this._id = response.result._id;
            var tagList = this.tagList(), chosenWidgets = this.chosenWidgets();
            var i = 0, c = tagList.length + chosenWidgets.length;
            if(c === 0 && this.isNew){
                window.location.href = '/dashboard/'+ this._id;
            }
            else{
                var respCounter = function(){
                    i++;
                    if(i === c) window.location.href = '/dashboard/'+ this._id;
                }.bind(this);

                _.each(tagList, function(t){
                    t.dashboardId = response.result._id;
                    delete t.dateCreated;
                    drata.apiClient.addTag(t, respCounter);
                });
                
                _.each(chosenWidgets, function(w){
                    var widgetModel = w.getModel();
                    widgetModel.dashboardId = response.result._id;
                    delete widgetModel.dateCreated;
                    delete widgetModel.dateUpdated;
                    delete widgetModel._id;
                    drata.apiClient.upsertWidget(widgetModel, respCounter);
                });    
            }
            
        }.bind(this));
    };

    this.bindWidgets = function(){
        drata.apiClient.getWidgetsOfDashboard(this._id, function(response){
            this.widgetList(ko.utils.arrayMap(
                response.result,
                function(widgetModel) {
                    return new WidgetItem(widgetModel); 
                }
            ));
        }.bind(this));
    };

    this.bindTags = function(){
        drata.apiClient.getAllTagsOfDashboard(this._id, function(response){
            this.tagList(response.result); 
        }.bind(this));
    };

    this.toggleTagInput = function(x){
        this.addingTag(x);
    };

    this.availableTags = ko.computed(function(){
        var tags = this.tagList();
        var allAvailableTags = dashboardManager.tagsList().filter(function(item){
            return !tags.some(function(x){
                return x.tagName === item;
            })
        });
        return allAvailableTags;
    }, this);

    this.toggleExtendedDetails = ko.observable(false);

    this.viewDetails = function(item, event){
        if(event.target.href) return true;
        this.toggleExtendedDetails(!this.toggleExtendedDetails());
    };

    this.removeTag = function(tag){
        if(!tag._id){
            this.tagList.remove(tag);
            return;
        }
        drata.apiClient.removeTag(tag._id, function(){
            this.tagList.remove(tag); 
        }.bind(this));
    }.bind(this);
    
    this.name.subscribe(function(newValue){
        model.name = newValue;
        drata.apiClient.upsertDashboard(model);
    });

    this.chosenWidgets = ko.observableArray();
    options.bindTags && this.bindTags();
    options.bindWidgets && this.bindWidgets();
};


var WidgetManager = function(model, options){
    this.widgetList = ko.observableArray();
    this.bindWidgets = function(model){
        drata.apiClient.getWidgets(model, function(response){
            this.widgetList(ko.utils.arrayMap(
                response.result,
                function(widgetModel) {
                    return new WidgetItem(widgetModel, {chooseWidgets: true}); 
                }
            ));
        }.bind(this));
    };
    
    this.chosenChartTypes = ko.observableArray();
    
    this.chosenWidgets = ko.observableArray();

    this.closeWidgetManager = function(){
        $('#widgetManager').removeClass('showme');
    };

    this.addWidgets= function(){
        this.closeWidgetManager();
        _.each(this.chosenWidgets(), function(w){
            var model = w.getModel();
            dashboard.addWidget(model);
        }, this);
    };

    var chooseAllWidgets = false;
    this.toggleAllChosenWidgets = function(){
        chooseAllWidgets = !chooseAllWidgets;
        if(!chooseAllWidgets){
            this.chosenWidgets([]);  
        }
        else{
            this.chosenWidgets(this.widgetList());   
        }
        return true;
    };

    var filterModel = ko.computed(function(){
        var cw = this.chosenChartTypes();
        if(!cw || cw.length === 0) return;
        var model = [{
            property: 'segmentModel.chartType',
            operator: '$in',
            value: cw
        }];
        return model;
    },this).extend({throttle: 500});

    filterModel.subscribe(this.bindWidgets.bind(this), this);
    this.bindWidgets();
};

var WidgetItem = function(model, options){
    options = options || {};
    this.chooseWidgets = options.chooseWidgets;
    this.name = ko.observable(model.name);
    this._id = model._id;
    this.chartType = model.segmentModel.chartType;
    this.selectedDataKey = model.selectedDataKey;
    this.dateUpdated = drata.utils.formatDate(new Date(model.dateUpdated));
    this.viewDetails = ko.observable(false);
    this.toggleExtendedDetails = function(){
        this.viewDetails(!this.viewDetails());
    };
    this.selectionsExpression = drata.utils.selectionsExpression(model.segmentModel.selection, true);
    this.conditionsExpression = drata.utils.conditionsExpression(model.segmentModel.group) || 'none';
    this.dataFilterExpression = '';

    if(model.segmentModel.dataFilter.intervalType === 'dynamic'){
        this.dataFilterExpression = drata.utils.format('{0} {1}s from current time until {2} {1}s from current time',model.segmentModel.dataFilter.max,model.segmentModel.dataFilter.intervalKind, model.segmentModel.dataFilter.min);
    }
    else{
        this.dataFilterExpression = drata.utils.format('{0} to {1}', model.segmentModel.dataFilter.min, model.segmentModel.dataFilter.max)
    }

    this.getModel = function(){
        return model;
    }
};