$(function() {
    $('.js-sortable').sortable({
        // containment: '#sortable',
        cursor: 'move',
        handle:'.handle',
        forcePlaceholderSize: true
    });
});