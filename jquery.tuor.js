(function($, doc, win) {
    var $doc = $(doc),
        $win = $(win),

        /**
         * Strategy for iterate the steps of a given Tour.
         */
        sequencer = function () {
	    var index = -1,
		seq = null;
	    
	    return {
		init: function (sequence) {
		    seq = sequence;
		    index = 0;
		},
		next: function() {
		    index = (index + 1) % seq.length;
		}, 
		back: function() {
		    index -= 1;
                    if(index < 0) index = seq.length -1;
		},
		go: function (step) {
		    index = step;
		},
		get: function () {
		    return seq[index];
		}
	    }
	}(),

        /**
         * Abstraction of the visible area of the Page.
         */
        viewport = function ($win) {
            return {
                // scroll the window
                move : function (to) {
                    $win.scrollTop(to);
                },
                // gets the scroll position given the elements that's need to be visible.
                visible : function ($el, $tooltip) {
                    var view_top, 
                        view_bottom,
                        el_top,
                        el_bottom,
                        tooltip_top,
                        tooltip_bottom,
                        visible_top,
                        visible_bottom;

                    view_top = $win.scrollTop();
                    view_bottom = $win.scrollTop() + $win.height();
                    
                    // position relative to the document
                    el_top = $el[0];
                    el_bottom = el_top + $el[2];

                    // position relative to the document
                    tooltip_top =  parseFloat($tooltip[0], 10);
                    tooltip_bottom = tooltip_top + parseFloat($tooltip[2], 10);

                    visible_top = Math.min(el_top, tooltip_top); // the min top value between element.top and tooltip.top 
                    visible_bottom = Math.max(el_bottom, tooltip_bottom); // the max value between (element.top + element.height) and (tooltip.top + tooltip.height)

                    return ((visible_top < view_top || visible_top > view_bottom) || (visible_bottom < view_top || visible_bottom > view_bottom)) ? visible_top : null;
                },
                // makes the given tooltip always visible
                makeVisible : function (tooltip) {
                    var ref = tooltip.getRefCorners(),
                        tip = tooltip.getTooltipCorners(),
                        scrollTop = 0;

                    scrollTop = this.visible(ref, tip);

                    if(scrollTop !== null)
                        this.move(scrollTop);
                }
            };
        } ($win),

        /**
         * Abstract the overlay layer.
         */
        overlay = function () {
            var overlay = null;

            if (overlay === null) {
                overlay = $('<div>').addClass('overlay').hide();


                $(doc).ready(function() {
                    $('body').prepend(overlay);
                });
            }

            return {
                show : function () {
                    overlay.show();
                },
                hide : function () {
                    overlay.hide();
                }
            };
        }(),

        /**
         * Tooltip abstraction.
         */
        tooltip = function () {
            var position = {
                    // return [el.top, el.left, el.height, el.width];
                    corners : function (el) {
                        return [
                            el.offset().top, 
                            el.offset().left, 
                            el.outerHeight(true), 
                            el.outerWidth(true)
                        ];
                    },
                    /**
                        TL  top left
                        TR  top right
                        BL  bottom left
                        BR  bottom right
                        LT  left top
                        LB  left bottom
                        RT  right top
                        RB  right bottom
                        T   top
                        R   right
                        B   bottom
                        L   left
                    */ 
                    calculate : function (el, place, tooltip) {
                        var c = this.corners(el), 
                            t = this.corners(tooltip);

		        switch(place) {
			    case 'TL' : return { 'left' : c[1] + 'px', 'top' : c[0] + c[2] + 'px' };
			    case 'TR' : return { 'left' : c[1] + c[3] - t[3] + 'px', 'top' : c[0] + c[2] + 'px' };
			    case 'BL' : return { 'left'	: c[1] + 'px', 'top' : c[0] - t[2] + 'px' };
			    case 'BR' : return { 'left' : c[1] + c[3] - t[3] + 'px', 'top' : c[0] - t[2] + 'px' };
			    
                            case 'LT' : return { 'left' : c[1] + c[3] + 'px', 'top' : c[0] + 'px' };
			    case 'LB' : return { 'left'	: c[1] + c[3] + 'px', 'top' : c[0] + c[2] - t[2] + 'px' };
			    case 'RT' : return { 'left' : c[1] - t[3] + 'px', 'top' : c[0] + 'px' };
			    case 'RB' : return { 'left' : c[1] - t[3] + 'px', 'top' : c[0] + c[2] - t[2] + 'px' };
			    
                            case 'T'  : return { 'left'	: c[1] + c[3]/2 - t[3]/2 + 'px', 'top' : c[0] + c[2] + 'px' };
			    case 'R'  : return { 'left'	: c[1] - t[3] + 'px', 'top' : c[0] + c[2]/2 - t[2]/2 + 'px' };
			    case 'B'  : return { 'left' : c[1] + c[3]/2 - t[3]/2 + 'px', 'top' : c[0] - t[2] + 'px' };
			    case 'L'  : return { 'left' : c[1] + c[3]  + 'px', 'top' : c[0] + c[2]/2 - t[2]/2 + 'px' };
        
                            default: throw { message: 'unsupported place argument' };
		        }
                    }
                };

            return function (el) {
                return {
                    getRefCorners : function () {
                        return position.corners(el.el);
                    },
                    getTooltipCorners : function () {
                        var prop = position.calculate(el.el, el.place, el.tooltip),
                            corn = position.corners(el.tooltip);

                        corn[0] = prop.top;
                        corn[1] = prop.left;
                
                        return corn;
                    },
                    show : function() {
                        var prop = position.calculate(el.el, el.place, el.tooltip);
                        
                        el.tooltip.find('span.arrow').addClass('arrow_' + el.place);
                        el.tooltip.addClass('tooltip').css(prop).addClass('visible');
                       
                        return this;
                    },
                    hide : function() {
                        el.tooltip.removeClass('visible');
                        return this;
                    },
                    toogle : function () {
                        return el.tooltip.hasClass('visible') ? this.hide() : this.show();
                    }
                };
            };
        }(),

        /**
         * Tour API.
         */
        tuor = {
            init : function (steps) {
                sequencer.init(steps);
            },
            start: function () { 
                var tt = tooltip(sequencer.get());

                overlay.show();
                
                viewport.makeVisible( tt );

                tt.show();
                
                $('body').live('keyup', function(ev) {
                    switch (ev.which) {
                        case 27: // esc key
                            tuor.stop();
                            break;
                        case 37: // left arrow
                            tuor.prev();
                            break;
                        case 39: // right arrow
                            tuor.next();
                            break;
                    }
                });
            },
            next : function () {
                var active = tooltip(sequencer.get()); // get active element
 
                active.toogle(); // hide active
                sequencer.next(); // next 
                
                active = tooltip(sequencer.get()); // get active element
                viewport.makeVisible( active ); // move the viewport if neccesary
                active.toogle(); // show element
            },
            prev : function () {
                var active = tooltip(sequencer.get()); // get active element
 
                active.toogle(); // hide active
                sequencer.back(); // back
                
                active = tooltip(sequencer.get()); // get active element
                viewport.makeVisible( active ); // move the viewport if neccesary
                active.toogle(); // show element
            },
            stop : function () {

                // unbind the events!!

                tooltip(sequencer.get()).hide();

                overlay.hide();
            }
        },

        /**
         * Plugin default settings.
         */
        settings = {
	    autoplay: true, // starts automatically
	    overlay: true, // create an overlay over the page ?
	    steps: [] // sequence of tooltips which compose the web tour
        },

        autoplayId = null;

    /**
     *
     */
    $.tuor = function(options) {
	$.extend(settings, options);

	tuor.init(options.steps);

        tuor.start();
    };

})(jQuery, document, window);

/*
	// autoplay by default for testing purpose
        autoplayId = setInterval(function() {
            var active = null;
           
            // sequence active element
            active = sequencer.get();
            
            // hide the active tooltip
            tooltip(active).toogle();

            // move back or fordward in the sequence
            sequencer.next();
            // sequencer.back();
            
            // get the active element after move the sequence
            active = sequencer.get();
            
            // show the new active
            tooltip(active).toogle();
        }, 3000);


Tour = function () {
    return {
        init: function () {
            // build html elements
            // 

                        $('body').live('keyup', function(ev) {
                            switch (ev.which) {
                                case 27: // esc key
                                    alert('fire close event');
                                    break;
                                case 37: // left arrow
                                    alert('fire prev event');
                                    break;
                                case 39: // right arrow
                                    alert('fire next event');
                                    break;
                            }
                        });


        }

        start : function (steps = [], autoplay = true) {
            
        },
        stop : function () {
            
        }
    };
};

                        $('body').live('keyup', function(ev) {
                            switch (ev.which) {
                                case 27: // esc key
                                    alert('fire close event');
                                    break;
                                case 37: // left arrow
                                    alert('fire prev event');
                                    break;
                                case 39: // right arrow
                                    alert('fire next event');
                                    break;
                            }
                        });


*/
