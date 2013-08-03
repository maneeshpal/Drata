;(function(root, $){

var model = {
	name:'maneesh',
	widgets:[{
		name:'widget 1'
	},{
        name:'widget 2'
    },{
        name:'widget 2'
    },{
        name:'widget 2'
    }]
}
var Dashboard = function(){
	var self = this;
	self.name = model.name;
	var index= 1;
	self.widgets = ko.observableArray();
	self.processWidgets = function(){
		
	};
	self.widgets(ko.utils.arrayMap(
        model.widgets,
        function(widget) {
          return new atombomb.web.Widget(widget, index++);
        }
	));
	setTimeout(function(){
		$.each(self.widgets(), function(k, widget) {
        	widget.loadWidget();
    	});
	},1000);
};
var Widget = function(model, index){
	var self= this;
	self.name = model.name;
	self.index = index;
	self.data= [];
    var today = new Date();
    for(var i =0;i<2;i++){
        var plotvalues = [];
       
        for(var j=0;j<100;j++){
            var newToday = new Date(today.setHours(j));
            plotvalues.push({
                x:newToday.getTime(),
                y: Math.floor(Math.random()*10)                
            });
        }
        self.data.push({
            plot: plotvalues,
            class:'line'
        });
    }
	self.loadWidget = function(){
		self.graph = new atombomb.d3.LineGraph( 'widget'+ self.index, null, self.data);
	}
}
root.atombomb.namespace('web').extend({
    Widget: Widget
});
root.atombomb.namespace('web').extend({
    Dashboard: Dashboard
});
})(this, jQuery);