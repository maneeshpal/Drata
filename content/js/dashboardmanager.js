"use strict";

var DashboardManager = function(){
    this.dashboards = ko.observableArray();
    this.tagsList = ko.observableArray();
    this.closeDashboardManager = function(){
        $('#dashboardManager').removeClass('showme');
    };
    this.chosenTags = ko.observableArray();

    this.dashboardHolder = ko.observable();

    this.addingDashboard = ko.observable(false);
    
    this.showAddDashboard = function(){
        this.dashboardHolder(new DashboardItem({}, this.tagsList, true));
        this.addingDashboard(true);
    };

    this.closePopup = function(){
        this.addingDashboard(false);
    };
    
    this.availableTags = ko.computed(function(){
        var allAvailableTags = this.tagsList().map(function(y){
            return y.tagName;
        });
        return _.uniq(allAvailableTags);
    }, this);

    this.filteredDashboards = ko.computed(function(){
        var chosenTags = this.chosenTags();
        var tags = [];
        if(chosenTags.length === 0) return this.dashboards();
        return this.dashboards().filter(function(d){
            tags = d.tagList().map(function(i){return i.tagName});
            return _.intersection(tags, chosenTags).length > 0;
        });
    }, this).extend({ rateLimit: 500 });

    this.populateDashboards = function(){
        drata.apiClient.getAllTags(function(tags){
            this.tagsList(tags);
            drata.apiClient.getAllDashboards(function(dashs){
                this.dashboards(ko.utils.arrayMap(
                    dashs,
                    function(model) {
                        return new DashboardItem(model, this.tagsList); 
                    }.bind(this)
                ));
            }.bind(this));
        }.bind(this));
    };
    var selectAll = false;
    this.toggleAllTags = function(){
        selectAll = !selectAll;
        if(!selectAll){
            this.chosenTags([]);  
        }
        else{
            this.chosenTags(this.availableTags());   
        }
        return true;
    }
    this.populateDashboards();

    // this.widgetList = ko.computed(function(){
    //    var l = [];
    //    _.each(this.dashboards(), function(d){
    //      l = l.concat(d.widgetList());
    //    });
    //    return l;
    // }.bind(this));
    //this.chosenWidgets = ko.observableArray();
};

var DashboardItem = function(model, allTags, isNew){
    this.name = ko.observable(model.name);
    this._id = model._id;
    this.dateCreated = drata.utils.formatDate(new Date(model.dateCreated));
    this.dateUpdated = drata.utils.formatDate(new Date(model.dateUpdated));
    this.url = '/dashboard/' + this._id;
    this.widgetList = ko.observableArray();
    this.tagList = ko.observableArray();
    this.newTag = ko.observable();
    this.addingTag = ko.observable(false);
    this.pendingTags = ko.observableArray();
    this.addTag = function(){
        if(!this.newTag()) return;
        if(!this._id){
            //since the dashboard does not have id, just save it.
            this.pendingTags.push(this.newTag());
            this.newTag(undefined);
            this.addingTag(false);
            return;
        }
        var newTagModel ={
            tagName: this.newTag(), 
            dashboardId: this._id
        };
        drata.apiClient.addTag(newTagModel, function(resp){
            this.tagList.push(newTagModel);
            allTags().indexOf(newTagModel.tagName) < 0 && allTags.push(newTagModel);
            this.newTag(undefined);
            this.addingTag(false);
        }.bind(this));
    }.bind(this);

    this.upsertDashboard = function(){
        var dashboardModel = {
            name: this.name()
        };
        if(!isNew){
            dashboardModel._id = this._id;
        }
        drata.apiClient.upsertDashboard(dashboardModel, function(response){
            this._id = response._id;
            var tagList = this.pendingTags().map(function(t){
                return {tagName: t, dashboardId: response._id}
            });
            tagList.length > 0 && _.each(tagList, function(t){
                drata.apiClient.addTag(t);
            });
        }.bind(this));
    };

    this.bindWidgets = function(){
        drata.apiClient.getWidgetsOfDashboard(this._id, function(widgets){
            this.widgetList(ko.utils.arrayMap(
                widgets,
                function(widgetModel) {
                    return new WidgetItem(widgetModel, 'dash'); 
                }
            ));
        }.bind(this));
    };

    this.toggleTagInput = function(x){
        this.addingTag(x);
    };

    this.availableTags = ko.computed(function(){
        var tags = this.tagList();
        var tempTags = this.pendingTags();
        var allAvailableTags = allTags().filter(function(item){
            return !tags.some(function(x){
                return x.tagName === item.tagName;
            })
        }).map(function(y){
            return y.tagName;
        });

        allAvailableTags = allAvailableTags.filter(function(item){
                return tempTags.indexOf(item) === -1;
        });
        
        return _.uniq(allAvailableTags, function(item){
            return item;
        });
    }, this);

    this.toggleExtendedDetails = ko.observable(false);

    this.viewDetails = function(){
        if(event.target.href) return true;
        this.toggleExtendedDetails(!this.toggleExtendedDetails());
    };

    this.removeTag = function(tag){
        drata.apiClient.removeTag(tag._id, function(){
            this.tagList.remove(tag); 
        }.bind(this));
    }.bind(this);

    this.removePendingTag = function(tag){
        this.pendingTags.remove(tag);
    }.bind(this);

    if(!isNew){
        drata.apiClient.getAllTagsOfDashboard(this._id, function(tags){
            this.tagList(tags); 
        }.bind(this));

        this.bindWidgets();
    }else{
        model && delete model._id;
    }
    //just prepop the tags
};

var WidgetItem = function(model, renderType){
    this.renderType = 
    this.name = ko.observable(model.name);
    this.chartType = model.segmentModel.chartType;
    this.selectedDataKey = model.selectedDataKey;
    this.dateUpdated = drata.utils.formatDate(new Date(model.dateUpdated));
    this.viewDetails = ko.observable(false);
    this.toggleExtendedDetails = function(){
        this.viewDetails(!this.viewDetails());
    }
    this.selectionsExpression = drata.utils.selectionsExpression(model.segmentModel.selection, true);
    this.conditionsExpression = drata.utils.conditionsExpression(model.segmentModel.group) || 'none';
    this.dataFilterExpression = '';

    if(model.segmentModel.dataFilter.intervalType === 'dynamic'){
        this.dataFilterExpression = drata.utils.format('{0} {1}s from current time until {2} {1}s from current time',model.segmentModel.dataFilter.max,model.segmentModel.dataFilter.intervalKind, model.segmentModel.dataFilter.min);
    }
    else{
        this.dataFilterExpression = drata.utils.format('{0} to {1}', model.segmentModel.dataFilter.min, model.segmentModel.dataFilter.max)
    }
    this.model = model;
};

var TopBar = function(){
    var self = this;
    self.addWidget = function(){
        $('#graphBuilder').toggleClass('showme');
    };
    self.manageDashboards = function(){
        $('#dashboardManager').toggleClass('showme');
    }

}