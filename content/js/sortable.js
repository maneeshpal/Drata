$(function() {
    $('.js-sortable').sortable({
        // containment: '#sortable',
        cursor: 'move',
        handle: '.handle',
        forcePlaceholderSize: true,
        stop: function(event, ui){
        	console.log(ui);
        	console.log('index : ' + $(ui.item).data('ind'));
        }
    });
});