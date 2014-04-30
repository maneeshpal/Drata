"use strict";

var DashboardManager = function(){
    this.dashboards = ko.observableArray();
    this.tagsList = ko.observableArray();
    this.closeDashboardManager = function(){
        $('#dashboardManager').removeClass('showme');
    };
    this.newName = ko.observable();
    this.chosenTags = ko.observableArray();
    
    this.addNewDashboard = function(){
        var dashboardModel = {
            name: this.newName()
        };
        drata.apiClient.upsertDashboard(dashboardModel, function(response){
            this.dashboards.push(new DashboardItem(response, this.tagsList));
        }.bind(this));
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
    this.populateDashboards();
    this.viewDetails = function(dashboardItem){
        dashboardItem.bindWidgets();
    }.bind(this);

    this.toggleAllTags = function(select){
        if(!select){
            this.chosenTags([]);  
        }
        else{
            this.chosenTags(this.availableTags());   
        }
    }
};

var DashboardItem = function(model, allTags){
    this.name = ko.observable(model.name);
    this.dateCreated = drata.utils.formatDate(new Date(model.dateCreated));
    this.dateUpdated = drata.utils.formatDate(new Date(model.dateUpdated));
    this.url = '/dashboard/' + model._id;
    this.widgetList = ko.observableArray();
    this.tagList = ko.observableArray();
    this.newTag = ko.observable();
    this.addingTag = ko.observable(false);
    this.addTag = function(){
        if(!this.newTag()) return;
        var newTagModel ={tagName: this.newTag(), dashboardId: model._id};
        drata.apiClient.addTag(newTagModel, function(resp){
            this.tagList.push(newTagModel);
            this.newTag(undefined);
            this.addingTag(false);
        }.bind(this));
    }.bind(this);
    this.bindWidgets = function(){
        drata.apiClient.getWidgetsOfDashboard(model._id, function(widgets){
            this.widgetList(ko.utils.arrayMap(
                widgets,
                function(widgetModel) {
                    return new WidgetItem(widgetModel); 
                }
            )); 
        }.bind(this));
    };
    this.toggleTagInput = function(show){
        this.addingTag(show);
    };
    this.availableTags = ko.computed(function(){
        var tags = this.tagList();
        var allAvailableTags = allTags().filter(function(item){
            return !tags.some(function(x){
                return x.tagName === item.tagName;
            })
        }).map(function(y){
            return y.tagName;
        });

        return _.uniq(allAvailableTags, function(item){
            return item;
        });
    }, this);
    this.toggleExtendedDetails = ko.observable(false);
    this.viewDetails = function(){
        this.toggleExtendedDetails(!this.toggleExtendedDetails());
        this.bindWidgets();
    };
    //just prepop the tags
    drata.apiClient.getAllTagsOfDashboard(model._id, function(tags){
        this.tagList(tags); 
    }.bind(this));
};

var WidgetItem = function(model){
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