
(function(root, ko){
	
	var tagList = ko.observableArray(), _tagList = [], dashboardList = ko.observableArray();
	

	drata.apiClient.getAllDashboards(function(response){
        len = response.result.length;
        dashboardList(response.result);
        _.each(response.result, function(dash){
            drata.apiClient.getAllTagsOfDashboard(dash._id, function(tagResponse){
                len--;
                if(tagResponse.result.length === 0){
                    _tagList.push({
                        tagName: '__',
                        dashboardName: dash.name,
                        dashboardId: dash._id
                    });
                }
                else{
                    _.each(tagResponse.result, function(tag){
                        tag.dashboardName = dash.name;
                        _tagList.push(tag);
                    });
                }
                
                if(len === 0){
                    tagList(_tagList);
                }
            })
        })
    });

	var tagNameList = ko.computed(function(){
		return _.uniq(tagList().map(function(t){
    		return t.tagName;
    	})).filter(function(t){
			return t !== '__';
    	});
	});

	var viewManager = function(){
		// var _c = ko.observable();

		// var currentView = ko.computed({
		// 	read: function(){
		// 		return _c();
		// 	},
		// 	write: function(newValue){
		// 		_c(newValue.replace('#', ''));
		// 	}
		// });

		// var self = this, _t, resized = false;
		// self.dashboardNotFound = ko.observable();
		
		
		// self.isDashboardManagerView = ko.computed(function(){
	 //    	return currentView() === hashes.manage || (!self.currentDashboardId && currentView() === '');
	 //    });

	 //    self.isWidgetEditorView = ko.computed(function(){
	 //    	return currentView() === hashes.editwidget;
	 //    });

	 //    self.isWidgetManagerView = ko.computed(function(){
	 //    	return currentView() === hashes.manageWidgets;
	 //    });
		
		// self.isDashboardCreatorView = ko.computed(function(){
	 //    	return currentView() === hashes.create;
	 //    });



	    // var a = [];
	    // self.isDashboardView = ko.computed(function(){
	    // 	var temp = !self.isDashboardManagerView()
	    // 		&& !self.isWidgetEditorView()
	    // 		&& !self.isWidgetManagerView()
	    // 		&& !self.isDashboardCreatorView();
	    // 	return temp;
	    // });
	    
	    // self.isDashboardView.subscribe(function(newValue){
	    // 	if(a.length < 3) a.push(newValue);
	    // 	if(a.length == 3) a.shift();
	    // 	if(!a[0] && a[1] && resized){
	    // 		resizeWidgets();
	    // 		resized = false;
	    // 	}
	    // });

	    // self.isWidgetNavVisible = ko.computed(function(){
	    // 	return !self.dashboardNotFound() && self.isDashboardView();
	    // });

		
	 //    if(!self.currentDashboardId && location.hash === ''){
	 //    	location.hash = 'manage';
		// }

		// currentView(location.hash);

		// window.onhashchange = function(){
  //   		currentView(location.hash);
  //   	}

    	// var resizeWidgets  = function(){
    	// 	_t && clearTimeout(_t);
     //    	_t = setTimeout(drata.pubsub.publish('resizewidgets'), 200);
     //    	resized = true;
    	// }

     //    drata.utils.windowResize(function(){
     //    	resizeWidgets();
     //    	if(self.isDashboardView()) resized = false;
     //    });

    	//return self;
	}

	var DashboardSyncService = function(){
		var self = this;
		function getWidgetFromDashboard(widgetId, dashboardId){
			var currentDashboard = drata.cPanel.currentDashboard();
		    if(!currentDashboard || (dashboardId && currentDashboard.getId() !== dashboardId)){
            	return;
        	}
        	var widget = currentDashboard.widgets().filter(function(w){
        		return w.getId() === widgetId;
        	});

        	return widget.length > 0 ? widget[0] : undefined;
		}

		self.listenSocket = function(){
			var socket = io.connect();
			socket.on('widgetupdated', function (data) {
	            var widget = getWidgetFromDashboard(data.widgetId, data.dashboardId);
	            if(widget){
	            	drata.nsx.notifier.notifyWidgetUpdated({
	            		name:response.result.name,
	            		onConfirm : function(){
	            			drata.apiClient.getWidget(data.widgetId, function(response){
			            		if(!response.success) return;
		            			widget.loadWidget(response.result);
			            	});
	            		}
	            	});
	            }
	        });

	        socket.on('widgetcreated', function (data) {
	            var currentDashboard = drata.cPanel.currentDashboard();
	            if(currentDashboard.getId() === data.dashboardId){
	            	drata.nsx.notifier.notifyWidgetAdded({
	            		onConfirm : function(){
	            			drata.apiClient.getWidget(data.widgetId, function(response){
			            		if(!response.success) return;
		            			currentDashboard.addWidget(response.result);
			            	});
	            		}
	            	});
	            }
	        });
	        socket.on('widgetremoved', function (data) {
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
	        drata.apiClient.updateWidget(widgetModel, function(response){
            	var widget = getWidgetFromDashboard(widgetModel._id, widgetModel.dashboardId);
            	widget && widget.loadWidget(widgetModel);
            	drata.nsx.notifier.addNotification({
        			message: 'widget: ' + widget.name()  + ' updated successfully',
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
			drata.apiClient.upsertWidget(widgetModel, function(response){
                if(!response.success){
                	return;
            	}
            	widgetModel = response.result;
	            console.log('widget created in db');
	            currentDashboard.addWidget(widgetModel);
	        });
		});

		//return self;
	};
	
	var ControlPanel = function(){
		var self = this, _t, resized = false;
		self.currentDashboard = ko.observable();
		self.topBar = new TopBar();
		self.dashboardManager = new DashboardManager();
		self.widgetEditor = new WidgetEditor();
		self.widgetManager = new WidgetManager();
		self.dashboardCreator = new DashboardCreator();

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
			var d = new Dashboard(currentDashboardId);
			self.currentDashboard(d);
		}
		self.displayMode = ko.computed(function(){
			var c = currentView();
	    	var mode;
	    	switch(c){
	    		case displayModes.manage.hash:
	    			mode = displayModes.manage;
	    		break;
	    		case displayModes.editwidget.hash:
	    			mode = displayModes.editwidget;
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

	    // self.currentViewTemplate = ko.computed(function(){
	    // 	var mode = self.displayMode();
	    // 	var template;
	    // 	switch(mode){
	    // 		case displayModes.manage:
	    // 			template = {
	    // 				name: 'dashboardmanager-template',
	    // 				data: self.dashboardManager
	    // 			};
	    // 		break;
	    // 		case displayModes.editwidget:
	    // 			template = {
	    // 				name: 'widgeteditor-template',
	    // 				data: self.widgetEditor
	    // 			};
	    // 		break;
	    // 		case displayModes.managewidgets:
	    // 			template = {
	    // 				name: 'widgetmanager-template',
	    // 				data: self.widgetManager
	    // 			};
	    // 		break;
	    // 		case displayModes.create:
	    // 			template = {
	    // 				name: 'dashboard-create-template',
	    // 				data: self.dashboardCreator
	    // 			};
	    // 		break;
	    // 		case displayModes.dashboardview:
	    			
    	// 			template = {
    	// 				name: 'dashboard-template',
    	// 				data: self.currentDashboard
    	// 			}
	    // 		break;
	    // 		case displayModes.defaultview:
	    // 			template = {
	    // 				name: 'dashboard-create-manage-template',
	    // 				data: {
	    // 					create: self.dashboardCreator,
	    // 					manage: self.dashboardManager
	    // 				}
	    // 			}	
	    // 		break;
	    // 	}
	    // 	return template;
	    // });
		
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
	    		self.widgetEditor.widgetCancel();
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
	            tags = d.tagList().map(function(i){return i.tagName});
	            return (tags.length === 0 && includeUntagged) || _.intersection(tags, chosenTags).length > 0;
	        });
	    }).extend({ rateLimit: 500 });

	    self.deleteDashboard = function(dashboardItem){
	        if(confirm("Deleting Dashboard will delete all the widgets and tags associated. Do you wish to Continue?")){
	            drata.apiClient.deleteDashboard(dashboardItem._id,function(resp){
	                self.dashboards.remove(dashboardItem);
	            });

	            drata.apiClient.deleteAllTagsDashboard(dashboardItem._id,function(resp){
	                console.log('tags deleted');
	            });

	            drata.apiClient.deleteAllWidgetsDashboard(dashboardItem._id,function(resp){
	                console.log('widgets deleted');
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

	var WidgetEditor = function(){
	    var self = this;
	    self.widgetName = ko.observable();
	    self.addUpdateBtnText = ko.observable('Save');
	    self.processSegment = true;
	    self.dataKeys = ko.observableArray();
	    
	    self.selectedDataKey = ko.observable();
	    self.dataSource = ko.observable();
	    self.dataSourceNames = ko.observableArray();
	    self.databaseNames = ko.observableArray();
	    self.database = ko.observable();
	    self.parseError = ko.observable();
	    //self.propertyTypes = ko.observable();
	    self.previewWidget = ko.observable();

	    var cloneModel = {};
	    
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
	            drata.apiClient.getDatabaseNames(newValue, function(resp){
	                self.databaseNames(resp.result);
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
	            drata.apiClient.getDataKeys({dataSource: self.dataSource(),database: newValue}, function(resp){
	                self.dataKeys(resp.result);
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
	            drata.apiClient.getUniqueProperties({dataSource: self.dataSource(), database: self.database(), collectionName: newValue}, function(response){
	                drata.dashboard.propertyManager.setPropertyTypes(response.result);
	                self.segment.initialize(cloneModel.segmentModel);
	            });
	        }
	    });

	    drata.apiClient.getDataSourceNames(function(resp){
	        self.dataSourceNames(resp.result);
	    });

	    self.segment = new Segmentor();
	    self.notifyWidget = function () {
	        cloneModel.segmentModel = self.segment.getModel();
	        
	        if(!cloneModel.segmentModel)
	            return;
	        cloneModel.dataSource = self.dataSource();
	        cloneModel.database = self.database();
	        cloneModel.selectedDataKey  = self.selectedDataKey();
	        cloneModel.sizex = cloneModel.sizex || 4;
	        cloneModel.sizey = cloneModel.sizey || 2;
	        
	        var previewW = self.previewWidget();
	        if(previewW){
	            var x = previewW.getModel();
	            if(x.contentModel){
	                cloneModel.contentModel = x.contentModel;
	            }
	            previewW.clearTimeouts();
	        }
	        var isNew = !cloneModel._id;
	        if(isNew){
	        	drata.pubsub.publish('widgetcreate', cloneModel);
	        }
	        else{
	        	drata.pubsub.publish('widgetupdate', cloneModel);	
	        }
	        cloneModel = {};
	        self.onWidgetUpdate = undefined;
	        self.onWidgetCancel = undefined;
	        self.addUpdateBtnText('Save');
	        self.dataSource(undefined);
	        self.previewWidget(undefined);
	        location.hash = '';
	    };

	    self.attach = function (event,options) {
	        cloneModel = drata.utils.clone(options.widgetModel);
	        self.dataSource(cloneModel.dataSource);
	        
	        self.addUpdateBtnText('Update Widget');
	        self.previewWidget(new Widget(cloneModel, 100, true));
	    };

	    self.widgetCancel = function() {
	        self.parseError(undefined);
	        self.onWidgetUpdate = undefined;
	        self.onWidgetCancel = undefined;
	        self.addUpdateBtnText('Add Widget');

	        self.dataSource(undefined);
	        location.hash = '';
	        var w = self.previewWidget();
	        if(w) w.clearTimeouts();
	        self.previewWidget(undefined);
	        cloneModel = {};
	    };

	    self.preview = function(){
	        var model = self.segment.getModel();
	        if(!model) return;
	        self.previewWidget(new Widget({
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

	    this.addWidgets= function(){
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
	    
	    this.bindWidgets = function(callback){
	    	if(widgetsBound) {
	    		callback && callback.call(this, this.widgetList());
	    		return;
	    	}
	        drata.apiClient.getWidgetsOfDashboard(model._id, function(response){
	            this.widgetList(ko.utils.arrayMap(
	                response.result,
	                function(widgetModel) {
	                    return new WidgetItem(widgetModel); 
	                }
	            ));
	            widgetsBound = true;
	            callback && callback.call(this, this.widgetList());
	        }.bind(this));
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
	    	this.bindWidgets(function(widgetList){
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
		this.newTag = ko.observable();
	    this.addingTag = ko.observable(false);
	    this.addTag = function(){
	        var newTagModel = {
	            tagName: this.newTag(), 
	            dashboardId: options.dashboardId
	        };
	        drata.apiClient.addTag(newTagModel, function(resp){
	            if(resp.success){
	            	newTagModel.dashboardName = options.name();
	            	drata.models.tagList.push(newTagModel);	
	            }
	            this.newTag(undefined);
	            this.addingTag(false);
	        }.bind(this));
	    }.bind(this);

		this.tagList = ko.computed(function(){
	    	return drata.models.tagList().filter(function(t){
	    		return t.dashboardId === options.dashboardId && t.tagName !== '__';
	    	}, this);
	    }, this);

	    this.toggleTagInput = function(x){
	        this.addingTag(x);
	    };

	    this.availableTags = ko.computed(function(){
	    	var existingTags = this.tagList().map(function(t){
	        	return t.tagName;
	        });
	        return _.difference(drata.models.tagNameList(),existingTags);
	    }, this);

	    var removeTagFromList = function(tag){
	    	var tag = drata.models.tagList().filter(function(t){
            	return t.tagName === tag.tagName && t.dashboardId === tag.dashboardId;
            });
            if(tag.length !== 0){
            	drata.models.tagList.remove(tag[0]);
            }
	    };

	    this.removeTag = function(tag){
	    	if(!tag._id){
	    		removeTagFromList(tag);
	    		return;
	    	}
	    	drata.apiClient.removeTag(tag._id, removeTagFromList.bind(this, tag));
	    }.bind(this);
	    
	};

	var NewDashboardTagList = function(){
		this.newTag = ko.observable();
	    this.addingTag = ko.observable(false);
	    this.tagList = ko.observableArray();

		this.addTag = function(){
        	this.tagList.push({
        		tagName: this.newTag()
        	});
            this.newTag(undefined);
            this.addingTag(false);
	    }.bind(this);

		
	    this.toggleTagInput = function(x){
	        this.addingTag(x);
	    };

	    this.availableTags = ko.computed(function(){
	    	var existingTags = this.tagList().map(function(t){
	        	return t.tagName;
	        });
	        return _.difference(drata.models.tagNameList(),existingTags);
	    }, this);

	    
	    this.removeTag = function(tag){
	    	this.tagList.remove(tag);
	    }.bind(this);
	    
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

	var DashboardCreator = function(){
		var self = this;
		self.name = ko.observable();
		self.tags = new NewDashboardTagList();
		self.widgetList = ko.observableArray();
		self.chosenWidgets = ko.observableArray();
		self.selectAll = ko.observable();

		this.upsertDashboard = function(){
	        var dashboardModel = {
	            name: this.name()
	        };

	        drata.apiClient.upsertDashboard(dashboardModel, function(response){
	            var _id = response.result._id;
	            var tagList = self.tags.tagList(), chosenWidgets = self.chosenWidgets();
	            var i = 0, c = tagList.length + chosenWidgets.length;
	            if(c === 0){
	                window.location.href = '/dashboard/'+ _id;
	            }
	            else{
	                var respCounter = function(){
	                    i++;
	                    if(i === c) window.location.href = '/dashboard/'+ _id;
	                }.bind(this);

	                _.each(tagList, function(t){
	                    t.dashboardId = _id;
	                    delete t.dateCreated;
	                    drata.apiClient.addTag(t, respCounter);
	                });
	                
	                _.each(chosenWidgets, function(w){
	                    var widgetModel = w.getModel();
	                    widgetModel.dashboardId = _id;
	                    delete widgetModel.dateCreated;
	                    delete widgetModel.dateUpdated;
	                    delete widgetModel._id;
	                    drata.apiClient.upsertWidget(widgetModel, respCounter);
	                });
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
	    // self.addWidget = function(){
	    //     location.hash = 'editwidget';
	    // };
	    self.manageDashboards = function(){
	        //drata.cPanel.dashboardManager.populateDashboards();
	        //$('#dashboardManager').toggleClass('showme');
	        location.hash = 'manage';
	    };
	    // self.manageWidgets = function(){
	    //     drata.cPanel.widgetManager.bindWidgets();
	    //     location.hash = 'managewidgets';
	    //     //$('#widgetManager').toggleClass('showme');
	    // };

	    self.taggedList = ko.observableArray();
	    self.untaggedList = ko.observableArray();
	    
	    drata.models.tagList.subscribe(function(t){
	        var tgList = _.groupBy(t, function(item){
	            return item.tagName;
	        });
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
	}

	root.drata.ns('dashboard').extend({
        controlPanel : ControlPanel,
        propertyManager: new propertyManager()
    });

	root.drata.ns('nsx').extend({
		views: new viewManager(),
		dashboardSyncService: new DashboardSyncService()
    });

    root.drata.ns('models').extend({
        tagList : tagList,
        dashboardList: dashboardList,
        tagNameList: tagNameList
    });

})(this, ko);
