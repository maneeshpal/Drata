;(function(root, $){

var model = {
	name:'maneesh',
	widgets:[{
		name:'widget 1'
	}]
}
var Dashboard = function(){
	var self = this;
	self.name = model.name;
	self.index= 1;
	self.widgets = ko.observableArray();

	self.widgets(ko.utils.arrayMap(
        model.widgets,
        function(widget) {
          return new atombomb.web.Widget(widget, self.index++);
        }
	));
	self.loadWidget = function(elem,widget){
        widget && widget.loadWidget();
    };
    self.addWidget = function(){
        var widget = new atombomb.web.Widget({
            name:'widget 1'
        }, self.index++);
        self.widgets.push(widget);
    };
};
var Widget = function(model, index){
	var self= this;
	self.name = model.name;
	self.index = index;
    self.data= [];
    //var date1 = new Date();
    for(var i =0;i<3;i++){
        var plotvalues = [];
        var today = new Date();
        for(var j=0;j<10;j++){
            plotvalues.push({
                x: today.setHours(today.getHours()+1),
                y: Math.random()*100             
            });
        }
        self.data.push({
            values:plotvalues,
            name:'line'+i
        });
    };
    self.bb = 0;
    self.updateGraph = function(){
        for(var i =0;i<self.data.length;i++){
            self.data[i].values.shift();
            var today = self.data[i].values[self.data[i].values.length-1].x;
            //for(var j=0;j<2;j++){
                self.data[i].values.push({
                    x:today.setHours(today.getHours()+1),
                    y: Math.random()*100           
                });
            //}
        }
        //console.log(self.data);
        self.bb++;
        if(self.bb==4){
            clearTimeout(self._t);
        }
        self.graph.data = self.data;
        self.graph.draw();
    };
	self.loadWidget = function(){
        
        self.graph = new atombomb.d3.LineGraph( 'widget'+ self.index, null, self.data);
        //var date2 = new Date();
       // console.log(Math.abs(date2-date1)/1000);

       //self._t = setInterval(self.updateGraph.bind(self), 1000);
	}
}
root.atombomb.namespace('web').extend({
    Widget: Widget
});
root.atombomb.namespace('web').extend({
    Dashboard: Dashboard
});
})(this, jQuery);