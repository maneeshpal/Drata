
(function(root, ko){
	
	var tagList = ko.observableArray(), dashboardList = ko.observableArray();
	
	drata.apiClient.getAllDashboards().done(function(response){
		dashboardList(response);
	});

	drata.apiClient.getAllTags().done(function(response){
		tagList(response);
	});

	var tagNameList = ko.computed(function(){
		return _.uniq(tagList().map(function(t){
    		return t.tagName;
    	})).filter(function(t){
			return t !== '__';
    	});
	});

	
	var DashboardSyncService = function(){
		var self = this, io = root.io;
		function getWidgetFromDashboard(widgetId, dashboardId){
			var currentDashboard = drata.cPanel.currentDashboard();
		    if(!currentDashboard || (dashboardId && currentDashboard.getId() !== dashboardId)){
            	return;
        	}

        	//use _.find
        	var widget = currentDashboard.widgets().filter(function(w){
        		return w.getId() === widgetId;
        	});

        	return widget.length > 0 ? widget[0] : undefined;
		}
		var socket = io && io.connect();
		self.listenWidgetUpdated = function(widgetId){
			socket && socket.on('widgetupdated' + widgetId, function (data) {
	            var widget = getWidgetFromDashboard(data.widgetId, data.dashboardId);
	            if(widget){
	            	drata.nsx.notifier.notifyWidgetUpdated({
	            		name:widget.name(),
	            		onConfirm : function(){
	            			drata.apiClient.getWidget(data.widgetId).then(function(response){
			            		widget.loadWidget(response);
			            	});
	            		}
	            	});
	            }
	        });
		};

		self.listenWidgetCreated = function(dashboardId){
			socket && socket.on('widgetcreated' + dashboardId, function (data) {
	            var currentDashboard = drata.cPanel.currentDashboard();
	            if(currentDashboard.getId() === data.dashboardId){
	            	drata.nsx.notifier.notifyWidgetAdded({
	            		onConfirm : function(){
	            			drata.apiClient.getWidget(data.widgetId).then(function(response){
			            		currentDashboard.addWidget(response);
			            	});
	            		}
	            	});
	            }
	        });
		};
		
		self.listenWidgetRemoved = function(widgetId){
			socket.on('widgetremoved'+widgetId, function (data) {
	            var widget = getWidgetFromDashboard(data.widgetId);
	            if(widget){
	            	drata.nsx.notifier.notifyWidgetRemoved({
	            		name: widget.name(),
	            		onConfirm : function(){
	            			widget.clearTimeouts();
	            			drata.cPanel.currentDashboard().widgets.remove(widget);
	            			widget = undefined;
	            		}
	            	});
	            }
	        });
		};
		
		drata.pubsub.subscribe('widgetupdate', function(eventName, widgetModel){
			if(!widgetModel._id) return;
			
	        drata.apiClient.updateWidget(widgetModel).then(function(response){
            	var widget = getWidgetFromDashboard(widgetModel._id, widgetModel.dashboardId);
            	widget && widget.loadWidget(widgetModel);
            	drata.nsx.notifier.addNotification({
        			message: 'widget: ' + widgetModel.name  + ' updated successfully',
        			type: 'success',
        			displayTimeout: 3000
        		});
	        });
		});

		drata.pubsub.subscribe('widgetcreate', function(eventName, widgetModel){
			var currentDashboard = drata.cPanel.currentDashboard();
			if(!currentDashboard) return;

			widgetModel.dashboardId = currentDashboard.getId();
	        delete widgetModel.dateCreated;
	        delete widgetModel._id;
	        widgetModel.displayIndex = currentDashboard.widgets().length + 1;
			drata.apiClient.addWidget(widgetModel).then(function(response){
                console.log('widget created in db');
                // if(response && response._id) {
                // 	widgetModel = response;
                // }else{
                // 	widgetModel._id = 'demo';
                // }
	            currentDashboard.addWidget(response);
	        });
		});

		//return self;
	};
	
	var ControlPanel = function(){
		var self = this, _t, resized = false;
		self.currentDashboard = ko.observable();
		self.topBar = new TopBar();
		self.dashboardManager = new DashboardManager();
		//self.widgetEditor = new WidgetEditor();
		self.widgetManager = new WidgetManager();
		self.dashboardCreator = new DashboardCreator();
		
		self.theme = ko.observable('default');

		self.theme.subscribe(function(newValue){
			drata.pubsub.publish('themechanged', newValue);
		});

        self.removeTag = function(tag){
        	var tagToRemove = drata.models.tagList().filter(function(t){
        		return t.tagName === tag.tagName && t.dashboardId === tag.dashboardId;
        	});

        	if(tagToRemove.length === 1){
        		drata.models.tagList.remove(tagToRemove[0]);

        		if(!tagToRemove[0]._id){
		            return;
		        }
        		drata.apiClient.removeTag(tagToRemove[0]._id);
        	}
        };

        
		var _c = ko.observable();

		var currentView = ko.computed({
			read: function(){
				return _c();
			},
			write: function(newValue){
				_c(newValue.replace('#', ''));
			}
		});

		var displayModes = {
			manage: {name: 'manage', hash: 'manage', displayText: 'Manage Dashboard'},
			editwidget: {name: 'editwidget', hash: 'editwidget', displayText: 'Widget Editor'},
			managewidgets: {name: 'managewidgets', hash: 'managewidgets', displayText: 'Manage Widgets'},
			create: {name: 'create', hash: 'create', displayText: 'Create Dashboard'},
			dashboardview: {name: 'dashboardview', hash: '', displayText: ''},
			defaultview: {name: 'defaultview', hash: '', displayText: 'Create or Manage Dashboards'}
		};

    	var currentDashboardId = window.location.pathname.split('/')[2];
		
		if(currentDashboardId){
			var d = new drata.dashboard.dashboard(currentDashboardId);
			self.currentDashboard(d);
		}
		self.displayMode = ko.computed(function(){
			var c = currentView() ? currentView().split('/'): [''];
	    	var mode;
	    	switch(c[0]){
	    		case displayModes.manage.hash:
	    			mode = displayModes.manage;
	    		break;
	    		case displayModes.editwidget.hash:
	    			mode = displayModes.editwidget;
	    			if(c[1] && c[1]!== 'demo'){
	    				drata.apiClient.getWidget(c[1]).then(function(response){
    						drata.pubsub.publish('widgetedit', {
					            widgetModel: response
					        });
	    				});
	    			}
	    		break;
	    		case displayModes.managewidgets.hash:
	    			mode = displayModes.managewidgets;
	    		break;
	    		case displayModes.create.hash:
	    			mode = displayModes.create;
	    		break;
	    		default:
	    			if(currentDashboardId){
	    				mode = displayModes.dashboardview;
	    			}
	    			else{
	    				mode = displayModes.defaultview;
	    			}
	    	}
	    	return mode;
		});
		
		self.isDashboardView = ko.computed(function(){
			return self.displayMode() === displayModes.dashboardview;
		});

		self.isWidgetEditorView = ko.computed(function(){
			return self.displayMode() === displayModes.editwidget;
		});

		self.isDashboardCreatorView = ko.computed(function(){
			return self.displayMode() === displayModes.create;
		});

		self.isDashboardManagerView = ko.computed(function(){
			return self.displayMode() === displayModes.manage;
		});
		self.isWidgetManagerView = ko.computed(function(){
			return self.displayMode() === displayModes.managewidgets;
		});

		self.isDefaultView = ko.computed(function(){
			return self.displayMode() === displayModes.defaultview;
		});

		var a = [];
		self.isDashboardView.subscribe(function(newValue){
	    	if(a.length < 3) a.push(newValue);
	    	if(a.length == 3) a.shift();
	    	if(!a[0] && a[1] && resized){
	    		resizeWidgets();
	    		resized = false;
	    	}
	    });

	    self.isWidgetNavVisible = ko.computed(function(){
	    	return  self.isDashboardView() && !self.currentDashboard().dashboardNotFound();
	    });

	    self.handleCloseView = function(){
	    	if(self.isWidgetEditorView()){
	    		drata.dashboard.widgetEditor.widgetCancel();
	    	}else{
	    		location.hash = '#';
	    	}
	    };
		currentView(location.hash);

		window.onhashchange = function(){
    		currentView(location.hash);
    	}

    	function resizeWidgets(){
    		_t && clearTimeout(_t);
        	_t = setTimeout(drata.pubsub.publish('resizewidgets'), 200);
        	resized = true;
    	}

        drata.utils.windowResize(function(){
        	resizeWidgets();
        	if(self.isDashboardView()) resized = false;
        });
	};

	var DashboardManager = function(){
		var self = this;
	    self.dashboards = ko.observableArray();
	    self.chosenTags = ko.observableArray();

	    self.closeDashboardManager = function(){
	        $('#dashboardManager').removeClass('showme');
	    };

	    self.filteredDashboards = ko.computed(function(){
	        var chosenTags = self.chosenTags();
	        var tags = [];
	        var includeUntagged = chosenTags.indexOf('untagged') > -1;
	        if(chosenTags.length === 0) return self.dashboards();
	        return self.dashboards().filter(function(d){
	            tags = d.tagList.tagList().map(function(i){return i.tagName});
	            return (tags.length === 0 && includeUntagged) || _.intersection(tags, chosenTags).length > 0;
	        });
	    }).extend({ rateLimit: 500 });

	    self.deleteDashboard = function(dashboardItem){
	        if(confirm("Deleting Dashboard will delete all the widgets and tags associated. Do you wish to Continue?")){
	            drata.apiClient.deleteDashboard(dashboardItem._id).then(function(resp){
	                self.dashboards.remove(dashboardItem);
	            });
	        }
	    };

	    var populateDashboards = function(ds){
	    	self.dashboards([]);
            self.dashboards(ko.utils.arrayMap(
                ds,
                function(model) {
                    return new DashboardItem(model);
                }
            ));
	    };

	    populateDashboards(drata.models.dashboardList());

	    drata.models.dashboardList.subscribe(populateDashboards);

	    var selectAll = false;
	    self.toggleAllTags = function(){
	        selectAll = !selectAll;
	        if(!selectAll){
	            self.chosenTags([]);  
	        }
	        else{
	            self.chosenTags(drata.models.tagNameList());   
	        }
	        return true;
	    };
	};

	var propertyManager = function() {
		var self = this;
	    var properties = ko.observableArray();
	    self.allProperties = ko.computed(function(){
	        return properties().map(function(p){
	        	return p.name;
	        })
	    });
	    self.dateProperties = ko.computed(function(){
	        return properties().filter(function(p){
	            return p.type === 'date'
	        }).map(function(p){
	        	return p.name;
	        })
	    });
	    self.nonDateProperties = ko.computed(function(){
	        return properties().filter(function(p){
	            return p.type !== 'date'
	        }).map(function(p){
	        	return p.name;
	        })
	    });
	    self.numericProperties = ko.computed(function(){
	        return properties().filter(function(p){
	            return p.type === 'numeric'
	        }).map(function(p){
	        	return p.name;
	        })
	    });
	    self.setPropertyTypes = function(propertyTypes){
	        var propList = [];
	        for(var prop in propertyTypes){
	            if(propertyTypes.hasOwnProperty(prop)){
	                propList.push({name: prop, type: propertyTypes[prop]});
	            }
	        }
	        properties(propList);
	    };
	    self.getPropertyType = function(propertyName){
	    	var temp = properties().filter(function(p){
	    		return p.name === propertyName;
	    	});
	    	if(temp.length > 0){
	    		return temp[0].type;
	    	}
	    	return undefined;
	    };
	    self.setPropertyType = function(name, type){
	    	var p = self.getPropertyType(name);
	    	if(p && p !== type){
	    		properties(properties().map(function(x){
	    			if(x.name === name) x.type = type;
	    			return x;
	    		}))
	    	}
	    };
	    self.resetProperties = function(){
	    	properties([]);
	    }
	    //return self;
	};

	var WidgetManager = function(model, options){
	    this.widgetList = ko.observableArray();
	    this.bindWidgets = function(model) {
	        drata.apiClient.getWidgets(model).then(function(response){
	            this.widgetList(ko.utils.arrayMap(
	                response,
	                function(widgetModel) {
	                    return new WidgetItem(widgetModel, {chooseWidgets: true}); 
	                }
	            ));
	        }.bind(this));
	    };
	    
	    this.chosenChartTypes = ko.observableArray();
	    
	    this.chosenWidgets = ko.observableArray();

	    this.addWidgets= function() {
	        var chosenWidgets = this.chosenWidgets();
	        _.each(chosenWidgets, function(w){
	            console.log('cloning widget');
	            var model = w.getModel();
	            drata.pubsub.publish('widgetcreate', model);
	            //drata.cPanel.currentDashboard().addWidget(model);
	        }, this);
	        this.chosenWidgets([]);
	        location.hash='';
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

	var DashboardItem = function(model, options){
	    options = options || {};
	    model = model || {};
	    this._id = model._id;
	    this.name = ko.observable(model.name);
	    this.dateCreated = drata.utils.formatDate(new Date(model.dateCreated));
	    this.dateUpdated = drata.utils.formatDate(new Date(model.dateUpdated));
	    this.url = '/dashboard/' + model._id;
	    this.widgetList = ko.observableArray();
	    this.tagList = new TagList({dashboardId: model._id, name: this.name});
	    
	    this.bindWidgets = function(){
	    	var defer = $.Deferred();
	    	if(widgetsBound) {
	    		defer.resolve(this.widgetList());
	    	}
	    	else{
	    		drata.apiClient.getWidgetsOfDashboard(model._id).then(function(response){
		            this.widgetList(ko.utils.arrayMap(
		                response,
		                function(widgetModel) {
		                    return new WidgetItem(widgetModel); 
		                }
		            ));
		            widgetsBound = true;
		            defer.resolve(this.widgetList());
		        }.bind(this));	
	    	}
	    	return defer.promise();
	    };

	    this.toggleExtendedDetails = ko.observable(false);
	    var widgetsBound;
	    this.viewDetails = function(item, event){
	        if(event.target.href) return true;
	        this.toggleExtendedDetails(!this.toggleExtendedDetails());
	    };
	    
	    this.name.subscribe(function(newValue){
	        model.name = newValue;
	        drata.apiClient.upsertDashboard(model);
	    });
	    
	    this.cloneDashboard = function(){
	    	this.bindWidgets().then(function(widgetList){
	    		drata.pubsub.publish('onDashboardClone', {
	        		tagList: this.tagList.tagList(),
	        		widgetList: widgetList,
	        		name: this.name()
	        	});
	    	}.bind(this));
    	}.bind(this);

	    options.bindWidgets && this.bindWidgets();
	    this.toggleExtendedDetails.subscribe(function(ted){
	    	if(ted && !widgetsBound) this.bindWidgets();
	    }, this);
	};

	var TagList = function(options){
		var self = this;
		self.newTag = ko.observable();
	    self.addingTag = ko.observable(false);
	    
	    self.addTag = function(){
	        var newTagModel = {
	            tagName: self.newTag(), 
	            dashboardId: options.dashboardId
	        };
	        drata.apiClient.addTag(newTagModel).done(function(resp){
            	newTagModel.dashboardName = options.name();
            	drata.models.tagList.push(newTagModel);	
	        })
	        .always(function(){
	        	self.newTag(undefined);
	            self.addingTag(false);
	        });
	    };

		self.tagList = ko.computed(function(){
	    	return drata.models.tagList().filter(function(t){
	    		return t.dashboardId === options.dashboardId && t.tagName !== '__';
	    	});
	    });

	    self.toggleTagInput = function(x){
	        self.addingTag(x);
	    };

	    self.availableTags = ko.computed(function(){
	    	var existingTags = self.tagList().map(function(t){
	        	return t.tagName;
	        });
	        return _.difference(drata.models.tagNameList(),existingTags);
	    });

	    var removeTagFromList = function(tag){
	    	var tag = drata.models.tagList().filter(function(t){
            	return t.tagName === tag.tagName && t.dashboardId === tag.dashboardId;
            });
            if(tag.length !== 0){
            	drata.models.tagList.remove(tag[0]);
            }
	    };

	    self.removeTag = function(tag){
	    	if(!tag._id){
	    		removeTagFromList(tag);
	    		return;
	    	}
	    	drata.apiClient.removeTag(tag._id).then(removeTagFromList.bind(self, tag));
	    };
	};

	var NewDashboardTagList = function(){
		var self = this;
		self.newTag = ko.observable();
	    self.addingTag = ko.observable(false);
	    self.tagList = ko.observableArray();

		self.addTag = function(){
        	self.tagList.push({
        		tagName: self.newTag()
        	});
            self.newTag(undefined);
            self.addingTag(false);
	    };
		
	    self.toggleTagInput = function(x){
	        self.addingTag(x);
	    };

	    self.availableTags = ko.computed(function(){
	    	var existingTags = self.tagList().map(function(t){
	        	return t.tagName;
	        });
	        return _.difference(drata.models.tagNameList(),existingTags);
	    });
	    
	    self.removeTag = function(tag){
	    	self.tagList.remove(tag);
	    };
	    
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
	    //this.manageUrl = '#editwidget/'+ model._id || '';
	    this.selectionsExpression = drata.utils.selectionsExpression(model.segmentModel.selection, true);
	    this.conditionsExpression = drata.utils.conditionsExpression(model.segmentModel.group) || 'none';
	    this.dataFilterExpression = drata.utils.getDataFilterExpression(model.segmentModel.dataFilter);
	    
	    this.manageWidget = function(){
	    	if(model.isDemo) {
	    		location.hash = '#editwidget/demo';
                drata.pubsub.publish('widgetedit', {
                    widgetModel: model
                });
            }else{
            	location.hash = '#editwidget/'+ this._id;
            }
	    };
	    this.getModel = function(){
	        return model;
	    }
	};

	var DashboardCreator = function(){
		var self = this;
		self.name = ko.observable();
		self.tags = new NewDashboardTagList();
		self.widgetList = ko.observableArray();
		self.chosenWidgets = ko.observableArray();
		self.selectAll = ko.observable();

		this.upsertDashboard = function(){
	        var dashboardModel = {
	            name: this.name(),
	            theme: 'default'
	        };

	        drata.apiClient.upsertDashboard(dashboardModel).then(function(response){
	            var _id = response._id;
	            var tagList = self.tags.tagList(), chosenWidgets = self.chosenWidgets();
	            
	            function redirect()  {
	            	window.location.href = '/dashboard/'+ _id;
	            }
	            if(!tagList.length && !chosenWidgets.length){
	             	redirect();   
	            }
	            else{
	                var prs = [];

	                tagList.forEach(function(t) {
	                    t.dashboardId = _id;
	                    delete t.dateCreated;
	                    prs.push(drata.apiClient.addTag(t));
	                });
	                
	                chosenWidgets.forEach(function(w) {
	                    var widgetModel = w.getModel();
	                    widgetModel.dashboardId = _id;
	                    delete widgetModel.dateCreated;
	                    delete widgetModel.dateUpdated;
	                    delete widgetModel._id;
	                    prs.push(drata.apiClient.addWidget(widgetModel));
	                });

	                $.when.apply($, prs).then(redirect);
	            }
	            
	        }.bind(this));
	    };

	    drata.pubsub.subscribe('onDashboardClone', function(eventName, params){
	    	self.name(params.name);
	    	self.widgetList(params.widgetList || []);
	    	self.tags.tagList(params.tagList.map(function(t){
	    		return {
	    			tagName : t.tagName
	    		}
	    	}));
	    	self.selectAll(true);
	    	location.hash = 'create';
	    });

	    self.selectAll.subscribe(function(newValue){
	    	if(newValue){
	    		self.chosenWidgets(self.widgetList());
	    	}
	    	else{
	    		self.chosenWidgets([]);
	    	}
	    });
	};

	var TopBar = function(){
	    var self = this;
	    
	    self.manageDashboards = function(){
	        location.hash = 'manage';
	    };
	    
	    self.taggedList = ko.observableArray();
	    self.untaggedList = ko.observableArray();
	    
	    drata.models.tagList.subscribe(function(t){
	        var tgList = _.groupBy(t, function(item){
	            return item.tagName;
	        });
	        self.untaggedList([]);
	        self.taggedList([]);
	        for(var i in tgList){
	            if(tgList.hasOwnProperty(i)){
	                var a = tgList[i];
	                if(i === '__'){
	                    self.untaggedList(a);
	                }else{
	                    self.taggedList.push({tagName: i, dashboards: a});    
	                }
	            }
	        }
	    });

	    self.currentDashboardName = ko.observable('Dashboards');
	};

	root.drata.ns('dashboard').extend({
        controlPanel : ControlPanel,
        propertyManager: new propertyManager()
    });

	root.drata.ns('nsx').extend({
		dashboardSyncService: new DashboardSyncService()
    });

    root.drata.ns('models').extend({
        tagList : tagList,
        dashboardList: dashboardList,
        tagNameList: tagNameList
    });

    root.drata.ns('globalsettings').extend({
    	enableToolTips : ko.observable()
    });

})(this, ko);
